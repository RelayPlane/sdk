/**
 * SDK Telemetry Client
 *
 * Handles transformation of WorkflowRunResult to telemetry format
 * and manages the telemetry worker lifecycle.
 *
 * @packageDocumentation
 */
import { TelemetryWorker } from '@relayplane/telemetry';
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
    worker;
    constructor(config) {
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
    transformStep(step) {
        return {
            stepName: step.stepName,
            status: step.success ? 'success' : 'failed',
            startedAt: step.startedAt,
            completedAt: step.finishedAt,
            output: step.output,
            errorType: step.error?.type,
            errorMessage: step.error?.message,
            tokenUsage: step.tokensIn !== undefined && step.tokensOut !== undefined
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
    extractErrorType(result) {
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
    extractErrorMessage(result) {
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
    transformResult(result) {
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
     * @param result - Workflow execution result
     */
    async recordRun(result) {
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
        }
        catch (error) {
            // Never crash workflows due to telemetry errors
            console.error('[Telemetry] Failed to record run:', error);
        }
    }
    /**
     * Shuts down the telemetry client.
     * Stops the background worker and performs a final flush.
     */
    async shutdown() {
        if (this.worker) {
            this.worker.stop();
        }
    }
}
//# sourceMappingURL=client.js.map