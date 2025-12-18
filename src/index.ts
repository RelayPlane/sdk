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
 *   .with('openai:gpt-4.1')
 *   .step('summarize')
 *   .with('anthropic:claude-sonnet-4-5-20250929')
 *   .depends('extract')
 *   .run({ fileUrl: 'https://example.com/invoice.pdf' });
 * ```
 */

// ============================================================================
// V3 API (Primary)
// ============================================================================

import { createWorkflow } from './v3-builder';
import { configure, getConfig, resetConfig } from './v3-config';
import { useRemote, saveRemote, deleteRemote } from './v3-remote';
import { kv } from './v3-kv';
import { backup } from './v3-backup';

// Re-export v3 types
export type {
  StepConfig,
  StepDefinition,
  WorkflowBuilder as WorkflowBuilderV3Type,
  StepWith,
  StepWithModel,
  StepMCP,
  StepMCPWithParams,
  StepComplete,
  RunOptions,
  WorkflowResult,
  ProviderConfig,
  MCPServerConfig,
  GlobalConfig,
  CloudFeatures,
} from './v3-types';

// Re-export config functions
export { configure, getConfig, resetConfig };

// Re-export KV store
export { kv } from './v3-kv';
export type { KVOptions, KVEntry, KVBatchEntry, KVListResult } from './v3-kv';

// Re-export backup & restore
export { backup } from './v3-backup';
export type { BackupOptions, RestoreOptions, ListBackupsOptions, Backup } from './v3-backup';

// Re-export version check
export { checkForUpdates, resetVersionCheck } from './version-check';
export type { VersionCheckResult } from './version-check';

// Re-export adapter registry for advanced users
export { AdapterRegistry, defaultAdapterRegistry } from '@relayplane/adapters';
export type { ProviderType } from '@relayplane/adapters';

// Re-export engine types for compatibility
export type { WorkflowRunResult } from '@relayplane/engine';

// ============================================================================
// Main SDK Export (V3)
// ============================================================================

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
 *   .with('openai:gpt-4.1')
 *   .step('summarize')
 *   .with('anthropic:claude-sonnet-4-5-20250929')
 *   .depends('extract')
 *   .run({ fileUrl: 'https://example.com/invoice.pdf' });
 * ```
 */
export const relay = {
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
  workflow: createWorkflow,

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
  useRemote,

  /**
   * Saves a workflow configuration to cloud.
   *
   * @param name - Workflow name
   * @param config - Workflow configuration
   * @returns Promise resolving to saved config metadata
   */
  saveRemote,

  /**
   * Deletes a remote workflow configuration.
   *
   * @param name - Workflow name
   * @returns Promise resolving when deleted
   */
  deleteRemote,

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
  configure,

  /**
   * Gets current global configuration.
   *
   * @returns Current config (read-only)
   */
  getConfig,

  /**
   * Resets global configuration (mainly for testing).
   */
  resetConfig,

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
  kv,

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
  backup,
};

/**
 * Default export for convenience.
 */
export default relay;
