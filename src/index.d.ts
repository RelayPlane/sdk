/**
 * RelayPlane SDK v3
 *
 * Developer-facing API for building and running local-first AI workflows.
 * Provides a type-safe fluent builder interface with phantom types.
 *
 * @packageDocumentation
 * @example
 * ```typescript
 * import { relay } from '@relayplane/sdk';
 *
 * const result = await relay
 *   .workflow('invoice-processor')
 *   .step('extract', {
 *     schema: InvoiceSchema,
 *     systemPrompt: 'Extract invoice data'
 *   })
 *   .with('openai:gpt-4o-vision')
 *   .step('summarize')
 *   .with('anthropic:claude-3.5-sonnet')
 *   .depends('extract')
 *   .run({ fileUrl: 'https://example.com/invoice.pdf' });
 * ```
 */
import { createWorkflow } from './v3-builder';
import { configure, getConfig, resetConfig } from './v3-config';
export type { StepConfig, StepDefinition, WorkflowBuilder as WorkflowBuilderV3Type, StepWith, StepWithModel, StepComplete, RunOptions, WorkflowResult, ProviderConfig, GlobalConfig, CloudFeatures, } from './v3-types';
export { configure, getConfig, resetConfig };
export { checkForUpdates, resetVersionCheck } from './version-check';
export type { VersionCheckResult } from './version-check';
export { AdapterRegistry, defaultAdapterRegistry } from '@relayplane/adapters';
export type { ProviderType } from '@relayplane/adapters';
export type { WorkflowRunResult } from '@relayplane/engine';
/**
 * Main RelayPlane SDK entry point.
 *
 * Provides the fluent builder API for creating type-safe workflows.
 * Uses v3 API by default with phantom types for compile-time guarantees.
 *
 * @example
 * ```typescript
 * import { relay } from '@relayplane/sdk';
 *
 * const result = await relay
 *   .workflow('invoice-processor')
 *   .step('extract', {
 *     schema: InvoiceSchema,
 *     systemPrompt: 'Extract invoice data'
 *   })
 *   .with('openai:gpt-4o-vision')
 *   .step('summarize')
 *   .with('anthropic:claude-3.5-sonnet')
 *   .depends('extract')
 *   .run({ fileUrl: 'https://example.com/invoice.pdf' });
 * ```
 */
export declare const relay: {
    /**
     * Creates a new workflow builder using v3 API.
     *
     * @param name - Unique workflow name
     * @returns Type-safe workflow builder
     *
     * @example
     * ```typescript
     * const workflow = relay.workflow('invoice-processor');
     * ```
     */
    workflow: typeof createWorkflow;
    /**
     * Configures global SDK settings.
     *
     * @param config - Global configuration
     *
     * @example
     * ```typescript
     * relay.configure({
     *   providers: {
     *     openai: { apiKey: process.env.OPENAI_API_KEY! }
     *   }
     * });
     * ```
     */
    configure: typeof configure;
    /**
     * Gets current global configuration.
     *
     * @returns Current config (read-only)
     */
    getConfig: typeof getConfig;
    /**
     * Resets global configuration (mainly for testing).
     */
    resetConfig: typeof resetConfig;
};
/**
 * Default export for convenience.
 */
export default relay;
//# sourceMappingURL=index.d.ts.map