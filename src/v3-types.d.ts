/**
 * RelayPlane SDK v3 - Type Definitions
 *
 * Phantom type-based fluent builder API for type-safe workflow construction.
 * This module provides compile-time guarantees for workflow correctness.
 *
 * @packageDocumentation
 */
import type { JSONSchema } from '@relayplane/engine';
/**
 * Configuration for a workflow step.
 * Includes prompt templates, schema validation, and metadata.
 */
export interface StepConfig {
    /**
     * JSON Schema for structured output validation.
     * When provided, the model will return data matching this schema.
     */
    schema?: JSONSchema;
    /**
     * System prompt for the step.
     * Sets the behavior and context for the AI model.
     */
    systemPrompt?: string;
    /**
     * User prompt template for the step.
     * Supports template interpolation like {{stepName.output}}.
     */
    userPrompt?: string;
    /**
     * Additional metadata for this step.
     * Can store arbitrary data for debugging or telemetry.
     */
    metadata?: Record<string, unknown>;
    /**
     * Retry configuration for this step.
     */
    retry?: {
        maxRetries: number;
        backoffMs?: number;
    };
    /**
     * Tool definitions for function calling (future feature).
     */
    tools?: any;
    /**
     * Extensibility: allow additional properties.
     */
    [key: string]: any;
}
/**
 * Internal step definition used during workflow construction.
 * Tracks the complete configuration of a step including its model and dependencies.
 */
export interface StepDefinition {
    /** Unique step name */
    name: string;
    /** Model in "provider:model-id" format */
    model: string;
    /** Step configuration */
    config?: StepConfig;
    /** Dependencies (step names this step depends on) */
    dependsOn: string[];
}
/**
 * Cloud-only features that can be configured on a workflow.
 */
export interface CloudFeatures {
    /** Webhook configuration */
    webhook?: {
        endpoint: string;
        method?: 'POST' | 'PUT';
        headers?: Record<string, string>;
    };
    /** Schedule configuration (cron expression) */
    schedule?: {
        cron: string;
        timezone?: string;
    };
    /** Cloud telemetry configuration */
    telemetry?: {
        enabled: boolean;
    };
}
/**
 * Provider configuration for API keys and base URLs.
 */
export interface ProviderConfig {
    /** API key for this provider */
    apiKey: string;
    /** Optional custom base URL */
    baseUrl?: string;
    /** Optional organization ID (for providers that support it) */
    organization?: string;
}
/**
 * Run options for workflow execution.
 */
export interface RunOptions {
    /** Execution mode: local (default) or cloud */
    mode?: 'local' | 'cloud';
    /** Per-run provider overrides */
    providers?: Record<string, ProviderConfig>;
    /** Abort signal for cancellation */
    signal?: any;
    /** Additional metadata for this run */
    metadata?: Record<string, unknown>;
    /** Timeout in milliseconds */
    timeout?: number;
}
/**
 * Workflow execution result.
 * Contains outputs from all steps and execution metadata.
 */
export interface WorkflowResult {
    /** Whether the workflow completed successfully */
    success: boolean;
    /** Step outputs indexed by step name */
    steps: Record<string, any>;
    /** Final output from the last step */
    finalOutput?: any;
    /** Error information if workflow failed */
    error?: {
        message: string;
        stepName?: string;
        cause?: any;
    };
    /** Execution metadata */
    metadata: {
        workflowName: string;
        startTime: Date;
        endTime: Date;
        duration: number;
    };
}
/**
 * Workflow builder - starting point of the fluent API.
 * Tracks accumulated steps using phantom type parameter.
 *
 * @template Steps - Accumulated step definitions (phantom type)
 */
export interface WorkflowBuilder<Steps extends StepDefinition[] = []> {
    /**
     * Adds a new step to the workflow.
     *
     * @param name - Unique step name
     * @param config - Optional step configuration
     * @returns StepWith builder to configure model
     *
     * @example
     * ```typescript
     * workflow.step("extract", {
     *   schema: InvoiceSchema,
     *   systemPrompt: "Extract invoice data"
     * })
     * ```
     */
    step<Name extends string, Config extends StepConfig = {}>(name: Name, config?: Config): StepWith<Name, Config, Steps>;
}
/**
 * Step builder after .step() - awaiting .with() to specify model.
 *
 * @template Name - Step name
 * @template Config - Step configuration
 * @template PrevSteps - Previously defined steps
 */
export interface StepWith<Name extends string, Config extends StepConfig, PrevSteps extends StepDefinition[]> {
    /**
     * Specifies the model to use for this step.
     *
     * @param model - Model in "provider:model-id" format
     * @returns StepWithModel builder to add dependencies or run
     *
     * @example
     * ```typescript
     * .with("openai:gpt-4o")
     * .with("anthropic:claude-3.5-sonnet")
     * .with("xai:grok-beta")
     * ```
     */
    with<Model extends string>(model: Model): StepWithModel<Name, Config, Model, PrevSteps>;
}
/**
 * Step builder after .with() - can add dependencies, continue building, or run.
 *
 * @template Name - Step name
 * @template Config - Step configuration
 * @template Model - Model identifier
 * @template PrevSteps - Previously defined steps
 */
export interface StepWithModel<Name extends string, Config extends StepConfig, Model extends string, PrevSteps extends StepDefinition[]> extends StepComplete<AppendStep<PrevSteps, {
    name: Name;
    model: Model;
    config: Config;
    dependsOn: [];
}>> {
    /**
     * Declares dependencies for this step.
     * Only allows step names from previous steps (compile-time checked).
     *
     * @param deps - Step names to depend on
     * @returns StepComplete builder with this step added
     *
     * @example
     * ```typescript
     * .depends("extract")
     * .depends("extract", "validate")
     * ```
     */
    depends<Deps extends PrevSteps[number]['name']>(...deps: Deps[]): StepComplete<AppendStep<PrevSteps, {
        name: Name;
        model: Model;
        config: Config;
        dependsOn: Deps[];
    }>>;
}
/**
 * Step builder after .depends() or when step is complete.
 * Can add more steps or run the workflow.
 *
 * @template NewSteps - Updated step list including the new step
 */
export interface StepComplete<NewSteps extends StepDefinition[]> extends WorkflowBuilder<NewSteps> {
    /**
     * Executes the workflow with the provided input.
     *
     * @param input - Input data for the workflow
     * @param options - Execution options
     * @returns Workflow execution result
     *
     * @example
     * ```typescript
     * const result = await workflow.run({
     *   fileUrl: "https://example.com/invoice.pdf"
     * });
     * ```
     */
    run(input?: any, options?: RunOptions): Promise<WorkflowResult>;
    /**
     * Configures a webhook for this workflow (cloud-only feature).
     *
     * @param endpoint - Webhook URL
     * @param options - Webhook configuration
     * @returns This builder for chaining
     */
    webhook(endpoint: string, options?: {
        method?: 'POST' | 'PUT';
        headers?: Record<string, string>;
    }): StepComplete<NewSteps>;
    /**
     * Configures a schedule for this workflow (cloud-only feature).
     *
     * @param cronExpression - Cron expression for schedule
     * @param options - Schedule configuration
     * @returns This builder for chaining
     */
    schedule(cronExpression: string, options?: {
        timezone?: string;
    }): StepComplete<NewSteps>;
}
/**
 * Type-level utility to append a step to the step list.
 * Used to build up the phantom type parameter.
 *
 * @template Steps - Current step list
 * @template NewStep - Step to append
 */
export type AppendStep<Steps extends StepDefinition[], NewStep extends StepDefinition> = [...Steps, NewStep];
/**
 * Extract step names from a step definition array.
 * Used for dependency type checking.
 *
 * @template Steps - Step definitions
 */
export type StepNames<Steps extends StepDefinition[]> = Steps[number]['name'];
/**
 * Global configuration for the RelayPlane SDK.
 */
export interface GlobalConfig {
    /** Provider configurations (API keys, base URLs) */
    providers?: Record<string, ProviderConfig>;
    /** Default telemetry configuration */
    telemetry?: {
        enabled: boolean;
        apiEndpoint?: string;
        apiKey?: string;
    };
    /** Cloud connection configuration */
    cloud?: {
        enabled: boolean;
        teamId?: string;
        accessToken?: string;
    };
}
//# sourceMappingURL=v3-types.d.ts.map