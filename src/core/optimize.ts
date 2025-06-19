/**
 * Relay Optimize™ - Advanced routing with fallback, caching, and cost optimization
 * 
 * This module implements the relay.optimize() function for paid tier users.
 * Provides intelligent model routing, automatic fallback, cost optimization, and caching.
 */

import { RelayRequest, RelayResponse, RelayConfig, OptimizeConfig, RelayError, RelayTimeoutError } from '../types';
import { relay } from './relay';

// Internal types for optimization logic
interface ModelMetrics {
  averageLatency: number;
  successRate: number;
  lastUpdated: number;
  requestCount: number;
  failureCount: number;
  costPerToken: number;
}

interface CacheEntry<T = any> {
  response: RelayResponse<T>;
  timestamp: number;
  ttl: number;
  requestHash: string;
}

interface OptimizationTrace {
  strategy: string;
  modelAttempts: Array<{
    model: string;
    reason: string;
    latency?: number;
    success: boolean;
    error?: string;
    cost?: number;
  }>;
  cacheHit: boolean;
  totalLatency: number;
  totalCost: number;
  fallbackUsed: boolean;
}

/**
 * Model metrics storage (in production, this would be a persistent store)
 */
class ModelMetricsStore {
  private metrics: Map<string, ModelMetrics> = new Map();
  private readonly DEFAULT_METRICS: ModelMetrics = {
    averageLatency: 2000, // 2 seconds default
    successRate: 0.95,
    lastUpdated: Date.now(),
    requestCount: 0,
    failureCount: 0,
    costPerToken: 0.001 // Default cost estimation
  };

  getMetrics(model: string): ModelMetrics {
    return this.metrics.get(model) || { ...this.DEFAULT_METRICS };
  }

  updateMetrics(model: string, latency: number, success: boolean, cost: number = 0): void {
    const current = this.getMetrics(model);
    const newRequestCount = current.requestCount + 1;
    
    // Exponential moving average for latency
    const alpha = 0.1; // Smoothing factor
    const newLatency = current.averageLatency * (1 - alpha) + latency * alpha;
    
    // Update success rate
    const totalSuccesses = current.successRate * current.requestCount + (success ? 1 : 0);
    const newSuccessRate = totalSuccesses / newRequestCount;
    
    this.metrics.set(model, {
      averageLatency: newLatency,
      successRate: newSuccessRate,
      lastUpdated: Date.now(),
      requestCount: newRequestCount,
      failureCount: current.failureCount + (success ? 0 : 1),
      costPerToken: cost > 0 ? cost : current.costPerToken
    });
  }

  getFastestModel(models: string[]): string {
    return models.reduce((fastest, current) => {
      const fastestMetrics = this.getMetrics(fastest);
      const currentMetrics = this.getMetrics(current);
      
      // Factor in both latency and success rate
      const fastestScore = fastestMetrics.averageLatency / fastestMetrics.successRate;
      const currentScore = currentMetrics.averageLatency / currentMetrics.successRate;
      
      return currentScore < fastestScore ? current : fastest;
    });
  }

  getMostReliableModel(models: string[]): string {
    return models.reduce((reliable, current) => {
      const reliableMetrics = this.getMetrics(reliable);
      const currentMetrics = this.getMetrics(current);
      return currentMetrics.successRate > reliableMetrics.successRate ? current : reliable;
    });
  }
}

/**
 * Response cache implementation
 */
class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly MAX_CACHE_SIZE = 1000;

  private generateCacheKey(request: RelayRequest): string {
    // Create a deterministic hash of the request
    const hashInput = JSON.stringify({
      to: request.to,
      payload: request.payload,
      // Exclude metadata from cache key to allow for different tracking
    });
    
    // Simple hash function (in production, use crypto.createHash)
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  get<T>(request: RelayRequest): CacheEntry<T> | null {
    const key = this.generateCacheKey(request);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }
    
    return entry as CacheEntry<T>;
  }

  set<T>(request: RelayRequest, response: RelayResponse<T>, ttl: number): void {
    const key = this.generateCacheKey(request);
    
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      ttl,
      requestHash: key
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global instances (in production, these would be properly injected)
const metricsStore = new ModelMetricsStore();
const responseCache = new ResponseCache();

/**
 * Cost estimation utility
 */
function estimateTokenCount(content: any): number {
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  // Rough estimation: 4 characters per token (GPT standard)
  return Math.ceil(text.length / 4);
}

function estimateRequestCost(request: RelayRequest, model: string): number {
  const metrics = metricsStore.getMetrics(model);
  const tokenCount = estimateTokenCount(request.payload);
  return tokenCount * metrics.costPerToken;
}

/**
 * Model fallback chain generator
 */
function generateFallbackChain(primaryModel: string, customChain?: string[]): string[] {
  if (customChain && customChain.length > 0) {
    return customChain;
  }

  // Default intelligent fallback chains based on model type
  const fallbackChains: Record<string, string[]> = {
    // Claude models fallback to GPT then Gemini
    'claude-3-opus': ['claude-3-opus', 'gpt-4', 'claude-3-sonnet', 'gpt-3.5-turbo'],
    'claude-3-sonnet': ['claude-3-sonnet', 'gpt-4', 'claude-3-haiku', 'gpt-3.5-turbo'],
    'claude-3-haiku': ['claude-3-haiku', 'claude-3-sonnet', 'gpt-3.5-turbo'],
    
    // GPT models fallback to Claude then Gemini
    'gpt-4': ['gpt-4', 'claude-3-sonnet', 'gpt-4-turbo', 'claude-3-haiku'],
    'gpt-4-turbo': ['gpt-4-turbo', 'gpt-4', 'claude-3-sonnet', 'claude-3-haiku'],
    'gpt-3.5-turbo': ['gpt-3.5-turbo', 'claude-3-haiku', 'claude-3-sonnet'],
    
    // Gemini models fallback to GPT then Claude
    'gemini-pro': ['gemini-pro', 'gpt-4', 'claude-3-sonnet', 'gpt-3.5-turbo'],
    'gemini-pro-vision': ['gemini-pro-vision', 'gpt-4', 'claude-3-sonnet']
  };

  return fallbackChains[primaryModel] || [primaryModel, 'gpt-3.5-turbo', 'claude-3-haiku'];
}

/**
 * Enhanced relay function with optimization strategies
 */
export async function optimize<T = any>(
  request: RelayRequest,
  optimizeConfig: OptimizeConfig = {},
  relayConfig: Partial<RelayConfig> = {}
): Promise<RelayResponse<T>> {
  
  const startTime = performance.now();
  
  // Check if we have an API key (optimize requires hosted mode)
  const hasApiKey = relayConfig.apiKey || process.env.RELAY_API_KEY;
  
  if (!hasApiKey) {
    throw new RelayError(
      'relay.optimize() requires a RelayPlane API key. Get yours at https://relayplane.com\n' +
      'Set RELAY_API_KEY environment variable or pass apiKey in config.\n' +
      'For local development, use relay() instead.'
    );
  }

  // Default optimization configuration
  const config: Required<OptimizeConfig> = {
    strategy: 'balanced',
    maxCost: 1.0, // $1 default ceiling
    fallbackChain: generateFallbackChain(request.to, optimizeConfig.fallbackChain),
    enableCache: true,
    cacheTtl: 300, // 5 minutes
    maxRetries: 2,
    ...optimizeConfig
  };

  // Initialize optimization trace
  const trace: OptimizationTrace = {
    strategy: config.strategy,
    modelAttempts: [],
    cacheHit: false,
    totalLatency: 0,
    totalCost: 0,
    fallbackUsed: false
  };

  if (relayConfig.debug) {
    console.log('[RelayPlane] Optimize request:', {
      strategy: config.strategy,
      maxCost: config.maxCost,
      fallbackChain: config.fallbackChain,
      enableCache: config.enableCache,
      to: request.to
    });
  }

  try {
    // Step 1: Check cache if enabled
    if (config.enableCache) {
      const cachedResponse = responseCache.get<T>(request);
      if (cachedResponse) {
        trace.cacheHit = true;
        trace.totalLatency = performance.now() - startTime;
        
        if (relayConfig.debug) {
          console.log('[RelayPlane] Cache hit:', { 
            cacheKey: cachedResponse.requestHash,
            age: Date.now() - cachedResponse.timestamp
          });
        }
        
        // Return cached response with updated metadata
        return {
          ...cachedResponse.response,
          relay_id: `${cachedResponse.response.relay_id}-cached`,
          latency_ms: trace.totalLatency
        };
      }
    }

    // Step 2: Determine optimal model based on strategy
    let modelsToTry: string[];
    
    switch (config.strategy) {
      case 'latency':
        modelsToTry = [metricsStore.getFastestModel(config.fallbackChain), ...config.fallbackChain];
        break;
      case 'cost':
        // Sort by cost (lowest first)
        modelsToTry = [...config.fallbackChain].sort((a, b) => {
          return metricsStore.getMetrics(a).costPerToken - metricsStore.getMetrics(b).costPerToken;
        });
        break;
      case 'fallback':
        modelsToTry = [...config.fallbackChain];
        break;
      case 'balanced':
      default:
        // Balance latency, cost, and reliability
        const primary = metricsStore.getMostReliableModel(config.fallbackChain);
        modelsToTry = [primary, ...config.fallbackChain.filter(m => m !== primary)];
        break;
    }

    // Remove duplicates while preserving order
    modelsToTry = [...new Set(modelsToTry)];
    
    if (relayConfig.debug) {
      console.log('[RelayPlane] Model selection order:', modelsToTry);
    }

    // Step 3: Try models in order with cost ceiling check
    let lastError: Error | null = null;
    
    for (let i = 0; i < modelsToTry.length && i <= config.maxRetries; i++) {
      const model = modelsToTry[i];
      const attemptStartTime = performance.now();
      
      // Check cost ceiling before attempting request
      const estimatedCost = estimateRequestCost(request, model);
      if (trace.totalCost + estimatedCost > config.maxCost) {
        trace.modelAttempts.push({
          model,
          reason: 'cost_ceiling_exceeded',
          success: false,
          error: `Estimated cost $${(trace.totalCost + estimatedCost).toFixed(4)} exceeds limit $${config.maxCost}`
        });
        continue;
      }

      try {
        // Create modified request for this model
        const modelRequest: RelayRequest = {
          ...request,
          to: model,
          metadata: {
            ...request.metadata,
            optimizeTrace: trace,
            fallbackUsed: i > 0
          }
        };

        // Attempt the relay call
        const response = await relay<T>(modelRequest, {
          ...relayConfig,
          apiKey: hasApiKey as string
        });

        // Record successful attempt
        const attemptLatency = performance.now() - attemptStartTime;
        metricsStore.updateMetrics(model, attemptLatency, true, estimatedCost);
        
        trace.modelAttempts.push({
          model,
          reason: i === 0 ? 'primary_choice' : 'fallback',
          latency: attemptLatency,
          success: true,
          cost: estimatedCost
        });
        
        trace.totalLatency = performance.now() - startTime;
        trace.totalCost += estimatedCost;
        trace.fallbackUsed = i > 0;

        // Cache the response if enabled
        if (config.enableCache) {
          responseCache.set(request, response, config.cacheTtl);
        }

        if (relayConfig.debug) {
          console.log('[RelayPlane] Optimization successful:', {
            model,
            fallbackUsed: trace.fallbackUsed,
            totalLatency: trace.totalLatency,
            totalCost: trace.totalCost,
            attempts: trace.modelAttempts.length
          });
        }

        // Return successful response with optimization metadata
        return {
          ...response,
          fallback_used: trace.fallbackUsed
        };

      } catch (error) {
        const attemptLatency = performance.now() - attemptStartTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Record failed attempt
        metricsStore.updateMetrics(model, attemptLatency, false, 0);
        
        trace.modelAttempts.push({
          model,
          reason: i === 0 ? 'primary_choice' : 'fallback',
          latency: attemptLatency,
          success: false,
          error: errorMessage
        });

        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (relayConfig.debug) {
          console.log(`[RelayPlane] Model ${model} failed:`, errorMessage);
        }

        // Continue to next model in fallback chain
        continue;
      }
    }

    // If we get here, all models failed
    trace.totalLatency = performance.now() - startTime;
    
    throw new RelayError(
      `All models in fallback chain failed after ${trace.modelAttempts.length} attempts. ` +
      `Last error: ${lastError?.message || 'Unknown error'}`,
      500,
      undefined,
      { trace, lastError }
    );

  } catch (error) {
    // Log the optimization failure
    if (relayConfig.debug) {
      console.error('[RelayPlane] Optimization failed:', {
        error: error instanceof Error ? error.message : error,
        trace
      });
    }
    
    throw error;
  }
}

/**
 * Check if optimize features are available for the current configuration
 */
export function canOptimize(config: Partial<RelayConfig> = {}): boolean {
  const hasApiKey = config.apiKey || process.env.RELAY_API_KEY;
  return !!hasApiKey;
}

/**
 * Get optimization capabilities for the current API key
 */
export async function getOptimizeCapabilities(config: Partial<RelayConfig> = {}): Promise<{
  tier: 'free' | 'maker' | 'pro';
  features: {
    fallback: boolean;
    latencyRouting: boolean;
    costOptimization: boolean;
    caching: boolean;
    analytics: boolean;
  };
  limits: {
    maxCallsPerMonth: number;
    maxRetries: number;
    cacheTtlMax: number;
  };
}> {
  // TODO: Implement API call to check capabilities based on API key
  // For now, return capabilities based on having an API key
  const hasApiKey = config.apiKey || process.env.RELAY_API_KEY;
  
  if (!hasApiKey) {
    return {
      tier: 'free',
      features: {
        fallback: false,
        latencyRouting: false,
        costOptimization: false,
        caching: false,
        analytics: false
      },
      limits: {
        maxCallsPerMonth: 100000,
        maxRetries: 0,
        cacheTtlMax: 0
      }
    };
  }

  // Default to Maker tier for API key holders
  return {
    tier: 'maker',
    features: {
      fallback: true,
      latencyRouting: true,
      costOptimization: true,
      caching: true,
      analytics: true
    },
    limits: {
      maxCallsPerMonth: 500000,
      maxRetries: 3,
      cacheTtlMax: 3600
    }
  };
}

/**
 * Clear optimization cache (useful for testing)
 */
export function clearOptimizeCache(): void {
  responseCache.clear();
}

/**
 * Get current optimization metrics (useful for monitoring)
 */
export function getOptimizeMetrics(): {
  cacheSize: number;
  modelMetrics: Record<string, ModelMetrics>;
} {
  const modelMetrics: Record<string, ModelMetrics> = {};
  
  // Get metrics for common models
  const commonModels = [
    'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku',
    'gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo',
    'gemini-pro', 'gemini-pro-vision'
  ];
  
  commonModels.forEach(model => {
    modelMetrics[model] = metricsStore.getMetrics(model);
  });

  return {
    cacheSize: responseCache['cache'].size,
    modelMetrics
  };
} 