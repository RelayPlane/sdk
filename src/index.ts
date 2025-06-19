/**
 * RelayPlane SDK - Main Entry Point
 * 
 * This is the main entry point for the @relayplane/sdk package.
 * It exports all public APIs and provides a convenient namespace.
 */

// Core functions
export { relay, configure } from './core/relay';
export { optimize, canOptimize, getOptimizeCapabilities, clearOptimizeCache, getOptimizeMetrics } from './core/optimize';

// Types and interfaces
export type {
  ModelProvider,
  SupportedModel,
  RelayRequest,
  RelayResponse,
  RelayConfig,
  OptimizeConfig,
  ChatMessage,
  OpenAIPayload,
  ClaudePayload,
  GooglePayload
} from './types';

// Error classes
export {
  RelayError,
  RelayTimeoutError,
  RelayAuthError,
  RelayRateLimitError
} from './types';

// Default export with namespace object
import { relay, configure } from './core/relay';
import { optimize, canOptimize, getOptimizeCapabilities, clearOptimizeCache, getOptimizeMetrics } from './core/optimize';

/**
 * Main RelayPlane SDK namespace
 * 
 * Usage:
 * ```typescript
 * import RelayPlane from '@relayplane/sdk';
 * 
 * // Configure globally
 * RelayPlane.configure({ apiKey: 'your-key', debug: true });
 * 
 * // Make a relay call
 * const response = await RelayPlane.relay({
 *   to: 'claude-3-sonnet',
 *   payload: { messages: [{ role: 'user', content: 'Hello!' }] }
 * });
 * 
 * // Use optimization (requires API key)
 * const optimized = await RelayPlane.optimize({
 *   to: 'gpt-4',
 *   payload: { messages: [{ role: 'user', content: 'Complex task' }] }
 * }, { strategy: 'fallback' });
 * ```
 */
const RelayPlane = {
  relay,
  optimize,
  configure,
  canOptimize,
  getOptimizeCapabilities,
  clearOptimizeCache,
  getOptimizeMetrics
};

export default RelayPlane;

// Version information
export const VERSION = '0.1.0'; 