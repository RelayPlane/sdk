/**
 * RelayPlane SDK v3 - Fluent Builder Implementation
 *
 * Implements the type-safe fluent builder API for workflow construction.
 * Uses phantom types to provide compile-time guarantees for workflow correctness.
 *
 * @packageDocumentation
 */
import { runWorkflow } from '@relayplane/engine';
import { defaultAdapterRegistry } from '@relayplane/adapters';
import { createAdapterExecutor } from './adapters/executor';
import { resolveProviderConfig, validateProvidersConfigured, isCloudEnabled, } from './v3-config';
import { detectCloudIntent, printUpgradeHint, shouldShowPostRunHint, shouldShowDebuggingHint, } from './v3-upgrade-hints';
/**
 * Internal workflow builder implementation.
 * Manages workflow state and provides the fluent API.
 */
class WorkflowBuilderImpl {
    workflowName;
    steps;
    cloudFeatures;
    constructor(workflowName, steps = [], cloudFeatures = {}) {
        this.workflowName = workflowName;
        this.steps = steps;
        this.cloudFeatures = cloudFeatures;
    }
    /**
     * Adds a new step to the workflow.
     */
    step(name, config) {
        return new StepWithImpl(this.workflowName, this.steps, this.cloudFeatures, name, config);
    }
    /**
     * Configures a webhook for this workflow (cloud-only).
     */
    webhook(endpoint, options) {
        this.cloudFeatures.webhook = {
            endpoint,
            method: options?.method || 'POST',
            headers: options?.headers,
        };
        return this;
    }
    /**
     * Configures a schedule for this workflow (cloud-only).
     */
    schedule(cronExpression, options) {
        this.cloudFeatures.schedule = {
            cron: cronExpression,
            timezone: options?.timezone,
        };
        return this;
    }
    /**
     * Executes the workflow.
     */
    async run(input, options) {
        const startTime = new Date();
        try {
            // Check for cloud feature usage
            const needsCloud = detectCloudIntent(this.cloudFeatures);
            if (needsCloud && !isCloudEnabled()) {
                // Show upgrade hint but don't block execution
                printUpgradeHint('cloud-feature-needed', {
                    feature: this.getCloudFeatureNames(),
                });
                // Note: We don't throw an error here - workflow can still run locally
                // Cloud features just won't be active
            }
            // Extract providers from steps
            const providers = this.extractProviders();
            // Validate that all providers are configured
            validateProvidersConfigured(providers, options);
            // Convert SDK steps to engine steps
            const workflowSteps = this.steps.map((step) => {
                const [provider, model] = this.parseModel(step.model);
                return {
                    stepName: step.name,
                    model: model,
                    prompt: this.buildPrompt(step.config),
                    schema: step.config?.schema,
                    dependsOn: step.dependsOn,
                    retry: step.config?.retry,
                    metadata: {
                        ...step.config?.metadata,
                        provider,
                    },
                };
            });
            // Build workflow definition
            const workflowDef = {
                workflowName: this.workflowName,
                steps: workflowSteps,
            };
            // Create adapter executor
            const adapterExecutor = createAdapterExecutor(defaultAdapterRegistry, this.buildApiKeys(options));
            // Execute workflow
            const engineResult = await runWorkflow(workflowDef, input || {}, adapterExecutor, {
                telemetry: false, // TODO: Implement cloud telemetry
                timeout: options?.timeout,
                metadata: options?.metadata,
            });
            // Convert engine result to SDK result
            const result = this.convertResult(engineResult, startTime);
            // Show post-run hint if appropriate
            if (shouldShowPostRunHint(result, this.steps.length)) {
                printUpgradeHint('post-run-hint', {
                    stepCount: this.steps.length,
                });
            }
            return result;
        }
        catch (error) {
            const endTime = new Date();
            const result = {
                success: false,
                steps: {},
                error: {
                    message: error instanceof Error ? error.message : String(error),
                    cause: error,
                },
                metadata: {
                    workflowName: this.workflowName,
                    startTime,
                    endTime,
                    duration: endTime.getTime() - startTime.getTime(),
                },
            };
            // Show debugging hint if appropriate
            if (shouldShowDebuggingHint(result)) {
                printUpgradeHint('debugging-hint', {
                    stepName: result.error?.stepName || 'unknown',
                });
            }
            return result;
        }
    }
    /**
     * Builds API keys object for adapter executor.
     * Resolves keys from three-tier resolution strategy.
     */
    buildApiKeys(options) {
        const providers = this.extractProviders();
        const apiKeys = {};
        for (const provider of providers) {
            const config = resolveProviderConfig(provider, options);
            if (config) {
                apiKeys[provider] = config.apiKey;
            }
        }
        return apiKeys;
    }
    /**
     * Extracts unique provider names from all steps.
     */
    extractProviders() {
        const providers = new Set();
        for (const step of this.steps) {
            const [provider] = this.parseModel(step.model);
            providers.add(provider);
        }
        return Array.from(providers);
    }
    /**
     * Parses "provider:model-id" format into [provider, model].
     */
    parseModel(model) {
        const parts = model.split(':');
        if (parts.length !== 2) {
            throw new Error(`Invalid model format: "${model}". Expected "provider:model-id" (e.g., "openai:gpt-4o")`);
        }
        return [parts[0], parts[1]];
    }
    /**
     * Builds prompt from step config.
     * Combines systemPrompt and userPrompt if both are provided.
     */
    buildPrompt(config) {
        if (!config) {
            return undefined;
        }
        if (config.systemPrompt && config.userPrompt) {
            return `${config.systemPrompt}\n\n${config.userPrompt}`;
        }
        return config.systemPrompt || config.userPrompt;
    }
    /**
     * Converts engine result to SDK result format.
     */
    convertResult(engineResult, startTime) {
        const endTime = new Date();
        const stepOutputs = {};
        // Extract step outputs
        for (const stepLog of engineResult.steps) {
            if (stepLog.output) {
                stepOutputs[stepLog.stepName] = stepLog.output;
            }
        }
        // Get final output (last step's output)
        const finalOutput = engineResult.finalOutput;
        return {
            success: engineResult.success,
            steps: stepOutputs,
            finalOutput,
            error: engineResult.success
                ? undefined
                : {
                    message: 'Workflow execution failed',
                    stepName: engineResult.steps.find((log) => !log.success)?.stepName,
                },
            metadata: {
                workflowName: this.workflowName,
                startTime,
                endTime,
                duration: endTime.getTime() - startTime.getTime(),
            },
        };
    }
    /**
     * Gets comma-separated list of cloud feature names for hints.
     */
    getCloudFeatureNames() {
        const features = [];
        if (this.cloudFeatures.webhook)
            features.push('webhooks');
        if (this.cloudFeatures.schedule)
            features.push('schedules');
        if (this.cloudFeatures.telemetry)
            features.push('telemetry');
        return features.join(', ') || 'cloud features';
    }
}
/**
 * Step builder after .step() - awaiting .with().
 */
class StepWithImpl {
    workflowName;
    steps;
    cloudFeatures;
    stepName;
    stepConfig;
    constructor(workflowName, steps, cloudFeatures, stepName, stepConfig) {
        this.workflowName = workflowName;
        this.steps = steps;
        this.cloudFeatures = cloudFeatures;
        this.stepName = stepName;
        this.stepConfig = stepConfig;
    }
    with(model) {
        return new StepWithModelImpl(this.workflowName, this.steps, this.cloudFeatures, this.stepName, this.stepConfig, model);
    }
}
/**
 * Step builder after .with() - can add dependencies, continue building, or run.
 */
class StepWithModelImpl extends WorkflowBuilderImpl {
    constructor(workflowName, steps, cloudFeatures, stepName, stepConfig, model) {
        // Add the step immediately when .with() is called
        const newStep = {
            name: stepName,
            model: model,
            config: stepConfig,
            dependsOn: [],
        };
        super(workflowName, [...steps, newStep], cloudFeatures);
    }
    depends(...deps) {
        // Update the last step (this step) to include dependencies
        const allSteps = [...this.steps];
        const lastStep = allSteps[allSteps.length - 1];
        if (lastStep) {
            lastStep.dependsOn = deps;
        }
        return new WorkflowBuilderImpl(this.workflowName, allSteps, this.cloudFeatures);
    }
}
/**
 * Creates a new workflow builder.
 *
 * @param name - Workflow name
 * @returns Workflow builder
 *
 * @example
 * ```typescript
 * const workflow = createWorkflow('invoice-processor');
 * ```
 */
export function createWorkflow(name) {
    return new WorkflowBuilderImpl(name, [], {});
}
//# sourceMappingURL=v3-builder.js.map