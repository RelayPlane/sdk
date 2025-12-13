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
import { useRemote, saveRemote, deleteRemote } from './v3-remote';
export type { StepConfig, StepDefinition, WorkflowBuilder as WorkflowBuilderV3Type, StepWith, StepWithModel, StepMCP, StepMCPWithParams, StepComplete, RunOptions, WorkflowResult, ProviderConfig, MCPServerConfig, GlobalConfig, CloudFeatures, } from './v3-types';
export { configure, getConfig, resetConfig };
export { kv } from './v3-kv';
export type { KVOptions, KVEntry, KVBatchEntry, KVListResult } from './v3-kv';
export { backup } from './v3-backup';
export type { BackupOptions, RestoreOptions, ListBackupsOptions, Backup } from './v3-backup';
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
     * Uses a remote workflow configuration from cloud.
     *
     * @param name - Remote workflow name
     * @param options - Optional version and cache settings
     * @returns Promise resolving to workflow builder
     *
     * @example
     * ```typescript
     * const result = await relay
     *   .useRemote('invoice-processor')
     *   .run({ input: 'data' });
     * ```
     */
    useRemote: typeof useRemote;
    /**
     * Saves a workflow configuration to cloud.
     *
     * @param name - Workflow name
     * @param config - Workflow configuration
     * @returns Promise resolving to saved config metadata
     */
    saveRemote: typeof saveRemote;
    /**
     * Deletes a remote workflow configuration.
     *
     * @param name - Workflow name
     * @returns Promise resolving when deleted
     */
    deleteRemote: typeof deleteRemote;
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
    /**
     * Key-value store for sharing data across workflow runs.
     *
     * @example
     * ```typescript
     * // Store data
     * await relay.kv.set('user:settings', { theme: 'dark' });
     *
     * // Retrieve data
     * const settings = await relay.kv.get('user:settings');
     *
     * // With TTL
     * await relay.kv.set('cache:data', data, { ttl: 3600 });
     *
     * // Team-scoped
     * await relay.kv.set('config', value, { teamId: 'team-123' });
     * ```
     */
    kv: {
        get: typeof import("./v3-kv").get;
        getWithMetadata: typeof import("./v3-kv").getWithMetadata;
        set: typeof import("./v3-kv").set;
        delete: typeof import("./v3-kv").del;
        list: typeof import("./v3-kv").list;
        batchSet: typeof import("./v3-kv").batchSet;
        batchGet: typeof import("./v3-kv").batchGet;
    };
    /**
     * Cloud backup and restore for workflows and data.
     *
     * @example
     * ```typescript
     * // Create backup
     * const backupId = await relay.backup.create({
     *   name: 'daily-backup',
     *   includes: { workflows: true, agents: true, configs: true }
     * });
     *
     * // List backups
     * const { backups } = await relay.backup.list({ limit: 10 });
     *
     * // Restore backup
     * await relay.backup.restore({
     *   backupId,
     *   mode: 'merge',
     *   conflictResolution: 'skip'
     * });
     * ```
     */
    backup: {
        create: typeof import("./v3-backup").create;
        restore: typeof import("./v3-backup").restore;
        list: typeof import("./v3-backup").list;
        delete: typeof import("./v3-backup").deleteBackup;
    };
};
/**
 * Default export for convenience.
 */
export default relay;
//# sourceMappingURL=index.d.ts.map