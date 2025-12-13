/**
 * SDK Adapter Executor
 *
 * Bridges the SDK to the engine's adapter interface.
 * Routes step executions to the appropriate provider adapter.
 *
 * @packageDocumentation
 */

import type { AdapterExecutor, AdapterExecuteArgs, AdapterResult } from '@relayplane/engine';
import type { IAdapterRegistry } from '@relayplane/adapters';

/**
 * SDK Adapter Executor
 *
 * Implements the engine's AdapterExecutor interface and routes
 * step executions to registered provider adapters.
 *
 * @example
 * ```typescript
 * const registry = new AdapterRegistry();
 * registry.register('openai', new OpenAIAdapter());
 *
 * const executor = new SDKAdapterExecutor(registry, {
 *   openai: process.env.OPENAI_API_KEY
 * });
 *
 * const result = await executor({
 *   model: 'gpt-4o',
 *   input: 'Hello',
 *   stepName: 'greet',
 *   stepMetadata: { provider: 'openai' }
 * });
 * ```
 */
export class SDKAdapterExecutor {
  /**
   * Adapter registry for provider lookup.
   */
  private registry: IAdapterRegistry;

  /**
   * API keys for each provider.
   */
  private apiKeys: Record<string, string>;

  /**
   * Creates a new SDKAdapterExecutor.
   *
   * @param registry - Adapter registry
   * @param apiKeys - Provider API keys
   */
  constructor(registry: IAdapterRegistry, apiKeys: Record<string, string>) {
    this.registry = registry;
    this.apiKeys = apiKeys;
  }

  /**
   * Creates an AdapterExecutor function bound to this instance.
   * This is what gets passed to the engine's runWorkflow function.
   *
   * @returns AdapterExecutor function
   *
   * @example
   * ```typescript
   * const adapterExecutor = executor.createExecutor();
   * const result = await runWorkflow(workflow, input, adapterExecutor);
   * ```
   */
  createExecutor(): AdapterExecutor {
    return async (args: AdapterExecuteArgs): Promise<AdapterResult> => {
      return this.execute(args);
    };
  }

  /**
   * Executes a step using the appropriate provider adapter.
   *
   * @param args - Step execution arguments
   * @returns Adapter execution result
   *
   * @private
   */
  private async execute(args: AdapterExecuteArgs): Promise<AdapterResult> {
    const startTime = Date.now();

    // Extract provider from step metadata
    const provider = args.stepMetadata?.provider as string | undefined;

    if (!provider) {
      return {
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Step metadata must include "provider" field',
        },
        durationMs: Date.now() - startTime,
      };
    }

    // Check if adapter is registered
    const adapter = this.registry.get(provider);
    if (!adapter) {
      return {
        success: false,
        error: {
          type: 'ValidationError',
          message: `No adapter registered for provider: ${provider}`,
        },
        durationMs: Date.now() - startTime,
      };
    }

    // Check if API key is provided
    const apiKey = this.apiKeys[provider];
    if (!apiKey) {
      return {
        success: false,
        error: {
          type: 'ValidationError',
          message: `No API key provided for provider: ${provider}`,
        },
        durationMs: Date.now() - startTime,
      };
    }

    // Execute via adapter
    try {
      const result = await adapter.execute({
        model: args.model,
        input: args.input,
        schema: args.schema,
        apiKey,
      });

      // Adapters should never throw, but wrap just in case
      return result;
    } catch (error) {
      // Normalize unexpected errors
      return {
        success: false,
        error: this.normalizeError(error),
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Normalizes errors from adapters into standard format.
   *
   * @param error - Error from adapter or unexpected error
   * @returns Normalized error object
   * @private
   */
  private normalizeError(error: unknown): {
    type: string;
    message: string;
    recoverable?: boolean;
  } {
    // If it's already a structured error, pass through
    if (
      error &&
      typeof error === 'object' &&
      'type' in error &&
      'message' in error
    ) {
      return error as { type: string; message: string; recoverable?: boolean };
    }

    // If it's an Error instance
    if (error instanceof Error) {
      // Determine error type from message or name
      const message = error.message;
      let type = 'ProviderError';
      let recoverable = false;

      // Check for common error patterns
      if (
        message.includes('rate limit') ||
        message.includes('429') ||
        message.includes('too many requests')
      ) {
        type = 'RateLimitError';
        recoverable = true;
      } else if (
        message.includes('timeout') ||
        message.includes('ETIMEDOUT') ||
        message.includes('ECONNREFUSED')
      ) {
        type = 'TimeoutError';
        recoverable = true;
      } else if (
        message.includes('unauthorized') ||
        message.includes('401') ||
        message.includes('403') ||
        message.includes('invalid api key')
      ) {
        type = 'AuthenticationError';
        recoverable = false;
      } else if (message.includes('500') || message.includes('502') || message.includes('503')) {
        type = 'ProviderError';
        recoverable = true;
      }

      return {
        type,
        message,
        recoverable,
      };
    }

    // Fallback for unknown errors
    return {
      type: 'UnknownError',
      message: String(error),
      recoverable: false,
    };
  }
}

/**
 * Creates an adapter executor from a registry and API keys.
 * Convenience function for common use case.
 *
 * @param registry - Adapter registry
 * @param apiKeys - Provider API keys
 * @returns AdapterExecutor function
 *
 * @example
 * ```typescript
 * const executor = createAdapterExecutor(registry, {
 *   openai: process.env.OPENAI_API_KEY
 * });
 * ```
 */
export function createAdapterExecutor(
  registry: IAdapterRegistry,
  apiKeys: Record<string, string>
): AdapterExecutor {
  const sdkExecutor = new SDKAdapterExecutor(registry, apiKeys);
  return sdkExecutor.createExecutor();
}
