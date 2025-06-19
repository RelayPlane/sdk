/**
 * RelayPlane SDK Type Definitions
 * 
 * This file defines all the TypeScript interfaces and types used by the RelayPlane SDK.
 * Based on the PRD v2 API specification.
 */

// Supported AI model providers
export type ModelProvider = 'claude' | 'openai' | 'google' | 'custom';

// Specific model identifiers
export type SupportedModel = 
  | 'claude-3-sonnet'
  | 'claude-3-opus'
  | 'claude-3-haiku'
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  | 'gemini-pro'
  | 'gemini-pro-vision'
  | string; // Allow custom model names

// Relay request structure as defined in PRD
export interface RelayRequest {
  /** Target model or endpoint to relay to */
  to: SupportedModel;
  /** The actual payload to send to the model */
  payload: Record<string, any>;
  /** Optional metadata for tracking and debugging */
  metadata?: Record<string, any>;
}

// Relay response structure as defined in PRD
export interface RelayResponse<T = any> {
  /** Unique identifier for this relay request */
  relay_id: string;
  /** HTTP status code from the downstream service */
  status_code: number;
  /** Total latency in milliseconds for the request */
  latency_ms: number;
  /** The actual response body from the downstream service */
  body: T;
  /** Whether a fallback model was used */
  fallback_used: boolean;
}

// Configuration for the SDK
export interface RelayConfig {
  /** API key for hosted mode (optional for local mode) */
  apiKey?: string;
  /** Base URL for the RelayPlane API */
  baseUrl?: string;
  /** Timeout for requests in milliseconds */
  timeout?: number;
  /** Whether to enable debug logging */
  debug?: boolean;
}

// Optimize strategies for relay.optimize()
export interface OptimizeConfig {
  /** Strategy for model selection */
  strategy?: 'fallback' | 'latency' | 'cost' | 'balanced';
  /** Maximum cost ceiling in dollars */
  maxCost?: number;
  /** Fallback chain in order of preference */
  fallbackChain?: SupportedModel[];
  /** Whether to enable caching */
  enableCache?: boolean;
  /** Cache TTL in seconds */
  cacheTtl?: number;
  /** Maximum number of retries */
  maxRetries?: number;
}

// Error types
export class RelayError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public relayId?: string,
    public cause?: any
  ) {
    super(message);
    this.name = 'RelayError';
  }
}

export class RelayTimeoutError extends RelayError {
  constructor(message: string, relayId?: string) {
    super(message, 408, relayId);
    this.name = 'RelayTimeoutError';
  }
}

export class RelayAuthError extends RelayError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'RelayAuthError';
  }
}

export class RelayRateLimitError extends RelayError {
  constructor(message: string, retryAfter?: number) {
    super(message, 429);
    this.name = 'RelayRateLimitError';
    this.retryAfter = retryAfter;
  }
  
  public retryAfter?: number;
}

// Common message formats for different providers
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenAIPayload {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ClaudePayload {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  system?: string;
}

export interface GooglePayload {
  model: string;
  contents: Array<{
    role: string;
    parts: Array<{ text: string }>;
  }>;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
}

// Re-export all types
export * from './index'; 