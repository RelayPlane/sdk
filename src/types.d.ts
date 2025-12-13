/**
 * SDK Type Definitions
 *
 * Public-facing types for the RelayPlane SDK.
 * These types provide a developer-friendly interface over the engine's internal types.
 *
 * @packageDocumentation
 */
import type { JSONSchema } from '@relayplane/engine';
/**
 * Configuration for a single workflow step.
 * Defines the step's name, model, input, and dependencies.
 *
 * @example
 * ```typescript
 * const stepConfig: StepConfig = {
 *   name: 'extract',
 *   model: 'gpt-4o',
 *   provider: 'openai',
 *   prompt: 'Extract invoice data',
 *   schema: InvoiceSchema
 * };
 * ```
 */
export interface StepConfig {
    /**
     * Unique name for this step within the workflow.
     */
    name: string;
    /**
     * Model to use for this step.
     * Examples: 'gpt-4o', 'claude-3-5-sonnet-20241022', 'gemini-1.5-pro'
     */
    model: string;
    /**
     * Provider for this model.
     * Examples: 'openai', 'anthropic', 'google', 'xai'
     */
    provider: string;
    /**
     * Prompt template for this step.
     * Supports template variables like {{stepName.output}}.
     */
    prompt?: string;
    /**
     * Explicit input for this step.
     * If provided, overrides prompt and initialInput.
     */
    input?: any;
    /**
     * JSON Schema for structured output.
     * If provided, the model will return data matching this schema.
     */
    schema?: JSONSchema;
    /**
     * List of step names this step depends on.
     * This step will only execute after all dependencies complete.
     */
    dependsOn?: string[];
    /**
     * Retry configuration for this step.
     */
    retry?: {
        /**
         * Maximum number of retry attempts.
         */
        maxRetries: number;
        /**
         * Base delay between retries in milliseconds.
         */
        backoffMs: number;
    };
    /**
     * Additional metadata for this step.
     */
    metadata?: Record<string, any>;
}
/**
 * Telemetry configuration for workflow runs.
 */
export interface TelemetryOptions {
    /**
     * Whether telemetry is enabled.
     */
    enabled: boolean;
    /**
     * RelayPlane API endpoint for telemetry.
     */
    apiEndpoint: string;
    /**
     * API key for authentication with RelayPlane Cloud.
     */
    apiKey: string;
    /**
     * Flush interval in milliseconds.
     * Default: 5000 (5 seconds)
     */
    flushInterval?: number;
    /**
     * Maximum number of retry attempts.
     * Default: 3
     */
    maxRetries?: number;
}
/**
 * Runtime options for workflow execution.
 * Controls execution behavior and provides API keys.
 *
 * @example
 * ```typescript
 * // Simple boolean telemetry (disabled)
 * const options1: SDKRunOptions = {
 *   apiKeys: {
 *     openai: process.env.OPENAI_API_KEY
 *   },
 *   input: { invoiceUrl: 'https://...' },
 *   telemetry: false
 * };
 *
 * // Full telemetry configuration
 * const options2: SDKRunOptions = {
 *   apiKeys: {
 *     openai: process.env.OPENAI_API_KEY
 *   },
 *   input: { invoiceUrl: 'https://...' },
 *   telemetry: {
 *     enabled: true,
 *     apiEndpoint: 'https://api.relayplane.com/v1/telemetry/logs',
 *     apiKey: 'rp_...'
 *   }
 * };
 * ```
 */
export interface SDKRunOptions {
    /**
     * API keys for each provider.
     * Keys are provider names (e.g., 'openai', 'anthropic').
     */
    apiKeys: Record<string, string>;
    /**
     * Initial input to provide to the workflow.
     * Available to all steps that don't have explicit input.
     */
    input?: any;
    /**
     * Telemetry configuration for this run.
     * Can be a boolean (simple enable/disable) or full configuration object.
     * Default: false
     */
    telemetry?: boolean | TelemetryOptions;
    /**
     * Global timeout for the entire workflow in milliseconds.
     */
    timeout?: number;
    /**
     * Additional metadata to attach to this run.
     */
    metadata?: Record<string, any>;
}
//# sourceMappingURL=types.d.ts.map