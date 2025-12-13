/**
 * SDK Adapter Executor
 *
 * Bridges the SDK to the engine's adapter interface.
 * Routes step executions to the appropriate provider adapter.
 *
 * @packageDocumentation
 */
import type { AdapterExecutor } from '@relayplane/engine';
import type { AdapterRegistry } from '@relayplane/adapters';
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
export declare class SDKAdapterExecutor {
    /**
     * Adapter registry for provider lookup.
     */
    private registry;
    /**
     * API keys for each provider.
     */
    private apiKeys;
    /**
     * Creates a new SDKAdapterExecutor.
     *
     * @param registry - Adapter registry
     * @param apiKeys - Provider API keys
     */
    constructor(registry: AdapterRegistry, apiKeys: Record<string, string>);
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
    createExecutor(): AdapterExecutor;
    /**
     * Executes a step using the appropriate provider adapter.
     *
     * @param args - Step execution arguments
     * @returns Adapter execution result
     *
     * @private
     */
    private execute;
    /**
     * Normalizes errors from adapters into standard format.
     *
     * @param error - Error from adapter or unexpected error
     * @returns Normalized error object
     * @private
     */
    private normalizeError;
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
export declare function createAdapterExecutor(registry: AdapterRegistry, apiKeys: Record<string, string>): AdapterExecutor;
//# sourceMappingURL=executor.d.ts.map