/**
 * SDK Telemetry Client
 *
 * Handles transformation of WorkflowRunResult to telemetry format
 * and manages the telemetry worker lifecycle.
 *
 * @packageDocumentation
 */

// TelemetryWorker is a runtime class - tsup bundles it from @relayplane/telemetry
import { TelemetryWorker } from '@relayplane/telemetry';
// TelemetryRun and TelemetryStepLog are types - use local definitions to avoid
// external references in .d.ts files (users don't have @relayplane/telemetry)
import type { TelemetryRun, TelemetryStepLog } from './types';
import type { WorkflowRunResult, StepExecutionLog } from '@relayplane/engine';
import { randomUUID } from 'crypto';

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
export class SDKTelemetryClient {
  private worker?: TelemetryWorker;

  constructor(config: TelemetryConfig) {
    if (config.enabled && config.apiEndpoint && config.apiKey) {
      this.worker = new TelemetryWorker({
        apiKey: config.apiKey,
        endpoint: config.apiEndpoint,
        flushInterval: config.flushInterval,
        maxRetries: config.maxRetries,
        enabled: true,
      });

      // Start the background worker
      this.worker.start();
    }
  }

  /**
   * Transforms a StepExecutionLog to TelemetryStepLog format.
   *
   * @param step - Step execution log from the engine
   * @returns Telemetry step log
   */
  private transformStep(step: StepExecutionLog): TelemetryStepLog {
    return {
      stepName: step.stepName,
      status: step.success ? 'success' : 'failed',
      startedAt: step.startedAt,
      completedAt: step.finishedAt,
      output: step.output,
      errorType: step.error?.type,
      errorMessage: step.error?.message,
      model: step.model,
      tokenUsage:
        step.tokensIn !== undefined && step.tokensOut !== undefined
          ? {
              prompt: step.tokensIn,
              completion: step.tokensOut,
              total: step.tokensIn + step.tokensOut,
            }
          : undefined,
    };
  }

  /**
   * Extracts error type from a workflow run result.
   * Uses the error from the first failed step.
   *
   * @param result - Workflow run result
   * @returns Error type or undefined
   */
  private extractErrorType(result: WorkflowRunResult): string | undefined {
    if (result.success) {
      return undefined;
    }

    const failedStep = result.steps.find((step) => !step.success);
    return failedStep?.error?.type;
  }

  /**
   * Extracts error message from a workflow run result.
   * Uses the error from the first failed step.
   *
   * @param result - Workflow run result
   * @returns Error message or undefined
   */
  private extractErrorMessage(result: WorkflowRunResult): string | undefined {
    if (result.success) {
      return undefined;
    }

    const failedStep = result.steps.find((step) => !step.success);
    return failedStep?.error?.message;
  }

  /**
   * Transforms a WorkflowRunResult to TelemetryRun format.
   *
   * @param result - Workflow execution result from the engine
   * @returns Telemetry run log
   */
  transformResult(result: WorkflowRunResult): TelemetryRun {
    return {
      runId: result.runId,
      workflowName: result.workflowName,
      status: result.success ? 'success' : 'failed',
      startedAt: result.startedAt,
      completedAt: result.finishedAt,
      errorType: this.extractErrorType(result),
      errorMessage: this.extractErrorMessage(result),
      steps: result.steps.map((step) => this.transformStep(step)),
    };
  }

  /**
   * Records a workflow run for telemetry upload.
   * Enqueues the run in the background worker.
   *
   * @param result - Workflow execution result from the engine
   */
  async recordRun(result: WorkflowRunResult): Promise<void> {
    if (!this.worker) {
      return;
    }

    try {
      const telemetryRun = this.transformResult(result);

      // Enqueue as a batch with a single run
      this.worker.enqueue({
        schemaVersion: '1.0',
        logs: [telemetryRun],
      });
    } catch (error) {
      // Never crash workflows due to telemetry errors
      console.error('[Telemetry] Failed to record run:', error);
    }
  }

  /**
   * Records a workflow run from SDK's WorkflowResult format.
   * Used for MCP workflows and other SDK-native execution paths.
   *
   * @param result - SDK WorkflowResult from v3-builder
   */
  async recordSDKRun(result: SDKWorkflowResult): Promise<void> {
    if (!this.worker) {
      return;
    }

    try {
      // Convert SDK result to telemetry format
      const telemetryRun: TelemetryRun = {
        runId: randomUUID(),
        workflowName: result.metadata.workflowName,
        status: result.success ? 'success' : 'failed',
        startedAt: result.metadata.startTime.toISOString(),
        completedAt: result.metadata.endTime.toISOString(),
        errorType: result.error ? 'ExecutionError' : undefined,
        errorMessage: result.error?.message,
        steps: Object.entries(result.steps).map(([stepName, output]) => ({
          stepName,
          status: result.error?.stepName === stepName ? 'failed' : 'success',
          startedAt: result.metadata.startTime.toISOString(),
          completedAt: result.metadata.endTime.toISOString(),
          output,
        })),
      };

      // Enqueue as a batch with a single run
      this.worker.enqueue({
        schemaVersion: '1.0',
        logs: [telemetryRun],
      });
    } catch (error) {
      // Never crash workflows due to telemetry errors
      console.error('[Telemetry] Failed to record SDK run:', error);
    }
  }

  /**
   * Shuts down the telemetry client.
   * Stops the background worker and performs a final flush.
   */
  async shutdown(): Promise<void> {
    if (this.worker) {
      this.worker.stop();
    }
  }
}
