/**
 * SDK Telemetry Client
 *
 * Handles transformation of WorkflowRunResult to telemetry format
 * and manages the telemetry worker lifecycle.
 *
 * @packageDocumentation
 */
import { TelemetryRun } from '@relayplane/telemetry';
import type { WorkflowRunResult } from '@relayplane/engine';
/**
 * SDK's WorkflowResult format (from v3-types).
 * Used for MCP workflows and other SDK-native execution paths.
 */
export interface SDKWorkflowResult {
    success: boolean;
    steps: Record<string, any>;
    finalOutput?: any;
    error?: {
        message: string;
        stepName?: string;
        cause?: any;
    };
    metadata: {
        workflowName: string;
        startTime: Date;
        endTime: Date;
        duration: number;
    };
}
/**
 * Telemetry configuration for the SDK.
 */
export interface TelemetryConfig {
    /**
     * Whether telemetry is enabled.
     */
    enabled: boolean;
    /**
     * Telemetry API endpoint.
     */
    apiEndpoint: string;
    /**
     * API key for authentication.
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
 * SDK Telemetry Client
 *
 * Transforms workflow execution results to telemetry format and
 * uploads them to the RelayPlane Cloud API.
 *
 * @example
 * ```typescript
 * const client = new SDKTelemetryClient({
 *   enabled: true,
 *   apiEndpoint: 'https://api.relayplane.com/v1/telemetry/logs',
 *   apiKey: 'rp_...'
 * });
 *
 * await client.recordRun(workflowResult);
 * await client.shutdown();
 * ```
 */
export declare class SDKTelemetryClient {
    private worker?;
    constructor(config: TelemetryConfig);
    /**
     * Transforms a StepExecutionLog to TelemetryStepLog format.
     *
     * @param step - Step execution log from the engine
     * @returns Telemetry step log
     */
    private transformStep;
    /**
     * Extracts error type from a workflow run result.
     * Uses the error from the first failed step.
     *
     * @param result - Workflow run result
     * @returns Error type or undefined
     */
    private extractErrorType;
    /**
     * Extracts error message from a workflow run result.
     * Uses the error from the first failed step.
     *
     * @param result - Workflow run result
     * @returns Error message or undefined
     */
    private extractErrorMessage;
    /**
     * Transforms a WorkflowRunResult to TelemetryRun format.
     *
     * @param result - Workflow execution result from the engine
     * @returns Telemetry run log
     */
    transformResult(result: WorkflowRunResult): TelemetryRun;
    /**
     * Records a workflow run for telemetry upload.
     * Enqueues the run in the background worker.
     *
     * @param result - Workflow execution result from the engine
     */
    recordRun(result: WorkflowRunResult): Promise<void>;
    /**
     * Records a workflow run from SDK's WorkflowResult format.
     * Used for MCP workflows and other SDK-native execution paths.
     *
     * @param result - SDK WorkflowResult from v3-builder
     */
    recordSDKRun(result: SDKWorkflowResult): Promise<void>;
    /**
     * Shuts down the telemetry client.
     * Stops the background worker and performs a final flush.
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=client.d.ts.map