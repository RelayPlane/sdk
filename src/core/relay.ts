/**
 * Core relay function for RelayPlane SDK
 * 
 * This module implements the main relay() function that routes AI model calls
 * either locally or through the hosted RelayPlane service.
 */

import axios, { AxiosResponse } from 'axios';
import { 
  RelayRequest, 
  RelayResponse, 
  RelayConfig, 
  RelayError, 
  RelayTimeoutError, 
  RelayAuthError, 
  RelayRateLimitError 
} from '../types';

// Default configuration
const DEFAULT_CONFIG: Required<RelayConfig> = {
  apiKey: '',
  baseUrl: 'https://api.relayplane.com',
  timeout: 30000,
  debug: false
};

// Global configuration (can be overridden per call)
let globalConfig: RelayConfig = {};

/**
 * Configure the RelayPlane SDK globally
 * 
 * @param config Configuration options
 */
export function configure(config: RelayConfig): void {
  globalConfig = { ...globalConfig, ...config };
  
  if (config.debug) {
    console.log('[RelayPlane] SDK configured:', {
      hasApiKey: !!config.apiKey,
      baseUrl: config.baseUrl,
      timeout: config.timeout
    });
  }
}

/**
 * Get the current effective configuration
 */
function getEffectiveConfig(overrides: Partial<RelayConfig> = {}): Required<RelayConfig> {
  return {
    ...DEFAULT_CONFIG,
    ...globalConfig,
    ...overrides
  };
}

/**
 * Determine if we should use hosted mode
 */
function shouldUseHostedMode(config: Required<RelayConfig>): boolean {
  return !!config.apiKey && config.apiKey.length > 0;
}

/**
 * Make a relay call in local mode (direct to provider)
 */
async function relayLocal<T>(request: RelayRequest, config: Required<RelayConfig>): Promise<RelayResponse<T>> {
  const startTime = Date.now();
  
  if (config.debug) {
    console.log('[RelayPlane] Local relay to:', request.to);
  }

  try {
    // In local mode, we need to route directly to the appropriate provider
    const targetUrl = getProviderUrl(request.to);
    const headers = getProviderHeaders(request.to, request.payload);
    
    const response: AxiosResponse<T> = await axios({
      method: 'POST',
      url: targetUrl,
      headers,
      data: request.payload,
      timeout: config.timeout
    });

    const latency = Date.now() - startTime;
    
    return {
      relay_id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status_code: response.status,
      latency_ms: latency,
      body: response.data,
      fallback_used: false
    };
    
  } catch (error: any) {
    const latency = Date.now() - startTime;
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new RelayTimeoutError('Request timed out in local mode');
      }
      
      const status = error.response?.status || 500;
      const message = error.response?.data?.error?.message || error.message;
      
      if (status === 401 || status === 403) {
        throw new RelayAuthError(`Authentication failed: ${message}`);
      }
      
      if (status === 429) {
        const retryAfter = error.response?.headers['retry-after'];
        throw new RelayRateLimitError(
          `Rate limit exceeded: ${message}`, 
          retryAfter ? parseInt(retryAfter) : undefined
        );
      }
      
      throw new RelayError(`Provider error: ${message}`, status);
    }
    
    throw new RelayError(`Local relay failed: ${error.message}`, 500, undefined, error);
  }
}

/**
 * Make a relay call in hosted mode (through RelayPlane API)
 */
async function relayHosted<T>(request: RelayRequest, config: Required<RelayConfig>): Promise<RelayResponse<T>> {
  const startTime = Date.now();
  
  if (config.debug) {
    console.log('[RelayPlane] Hosted relay to:', request.to);
  }

  try {
    const response: AxiosResponse<RelayResponse<T>> = await axios({
      method: 'POST',
      url: `${config.baseUrl}/api/relay`,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey
      },
      data: request,
      timeout: config.timeout
    });

    if (config.debug) {
      console.log('[RelayPlane] Hosted response:', {
        relayId: response.data.relay_id,
        statusCode: response.data.status_code,
        latency: response.data.latency_ms,
        fallbackUsed: response.data.fallback_used
      });
    }

    return response.data;
    
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new RelayTimeoutError('Request timed out to RelayPlane API');
      }
      
      const status = error.response?.status || 500;
      const message = error.response?.data?.error || error.message;
      
      if (status === 401 || status === 403) {
        throw new RelayAuthError(`RelayPlane API authentication failed: ${message}`);
      }
      
      if (status === 429) {
        const retryAfter = error.response?.headers['retry-after'];
        throw new RelayRateLimitError(
          `RelayPlane API rate limit exceeded: ${message}`, 
          retryAfter ? parseInt(retryAfter) : undefined
        );
      }
      
      throw new RelayError(`RelayPlane API error: ${message}`, status);
    }
    
    throw new RelayError(`Hosted relay failed: ${error.message}`, 500, undefined, error);
  }
}

/**
 * Main relay function - routes AI model calls with automatic mode detection
 * 
 * @param request The relay request containing target model and payload
 * @param config Optional configuration overrides
 * @returns Promise resolving to the relay response
 */
export async function relay<T = any>(
  request: RelayRequest, 
  config: Partial<RelayConfig> = {}
): Promise<RelayResponse<T>> {
  const effectiveConfig = getEffectiveConfig(config);
  
  if (effectiveConfig.debug) {
    console.log('[RelayPlane] Starting relay request:', {
      to: request.to,
      mode: shouldUseHostedMode(effectiveConfig) ? 'hosted' : 'local',
      hasMetadata: !!request.metadata
    });
  }

  // Validate request
  if (!request.to) {
    throw new RelayError('Missing required field: to');
  }
  
  if (!request.payload) {
    throw new RelayError('Missing required field: payload');
  }

  // Route to appropriate implementation
  if (shouldUseHostedMode(effectiveConfig)) {
    return relayHosted<T>(request, effectiveConfig);
  } else {
    return relayLocal<T>(request, effectiveConfig);
  }
}

/**
 * Helper function to get provider URL for local mode
 */
function getProviderUrl(model: string): string {
  if (model.startsWith('claude-')) {
    return 'https://api.anthropic.com/v1/messages';
  } else if (model.startsWith('gpt-')) {
    return 'https://api.openai.com/v1/chat/completions';
  } else if (model.startsWith('gemini-')) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  } else {
    throw new RelayError(`Unsupported model in local mode: ${model}`);
  }
}

/**
 * Helper function to get provider headers for local mode
 */
function getProviderHeaders(model: string, payload: any): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (model.startsWith('claude-')) {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      throw new RelayError('ANTHROPIC_API_KEY environment variable required for Claude models in local mode');
    }
    headers['x-api-key'] = anthropicKey;
    headers['anthropic-version'] = '2023-06-01';
  } else if (model.startsWith('gpt-')) {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new RelayError('OPENAI_API_KEY environment variable required for GPT models in local mode');
    }
    headers['Authorization'] = `Bearer ${openaiKey}`;
  } else if (model.startsWith('gemini-')) {
    const googleKey = process.env.GOOGLE_API_KEY;
    if (!googleKey) {
      throw new RelayError('GOOGLE_API_KEY environment variable required for Gemini models in local mode');
    }
    headers['Authorization'] = `Bearer ${googleKey}`;
  }

  return headers;
} 