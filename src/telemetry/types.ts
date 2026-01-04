/**
 * Telemetry Type Definitions (Local to SDK)
 *
 * These types are defined locally in the SDK to avoid external references
 * in the generated .d.ts files. The runtime TelemetryWorker is bundled
 * by tsup, but these type definitions need to be resolvable by TypeScript
 * users who install the SDK from npm.
 *
 * @packageDocumentation
 */

/**
 * Step log entry in a telemetry batch.
 * Matches the API telemetry endpoint format.
 */
export interface TelemetryStepLog {
  /**
   * Name of the step.
   */
  stepName: string;

  /**
   * Status of the step execution.
   */
  status: 'success' | 'failed';

  /**
   * ISO 8601 timestamp when step started.
   */
  startedAt: string;

  /**
   * ISO 8601 timestamp when step completed.
   */
  completedAt: string;

  /**
   * Step output (if successful).
   */
  output?: any;

  /**
   * Error type (if failed).
   */
  errorType?: string;

  /**
   * Error message (if failed).
   */
  errorMessage?: string;

  /**
   * Model ID used for this step.
   * Examples: 'claude-sonnet-4-5', 'gpt-4.1'
   */
  model?: string;

  /**
   * Token usage for this step.
   */
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

/**
 * Single workflow run in a telemetry batch.
 * Represents a complete workflow execution with all step logs.
 */
export interface TelemetryRun {
  /**
   * Unique identifier for this run.
   */
  runId: string;

  /**
   * Name of the workflow.
   */
  workflowName: string;

  /**
   * Status of the workflow execution.
   */
  status: 'success' | 'failed';

  /**
   * ISO 8601 timestamp when run started.
   */
  startedAt: string;

  /**
   * ISO 8601 timestamp when run completed.
   */
  completedAt: string;

  /**
   * Error type (if failed).
   */
  errorType?: string;

  /**
   * Error message (if failed).
   */
  errorMessage?: string;

  /**
   * All step execution logs.
   */
  steps: TelemetryStepLog[];
}
