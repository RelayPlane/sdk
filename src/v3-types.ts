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

  /** Step type: 'ai' for AI model steps, 'mcp' for MCP tool steps */
  type: 'ai' | 'mcp';

  /** Model in "provider:model-id" format (for AI steps) */
  model?: string;

  /** MCP tool in "server:tool" format (for MCP steps) */
  mcpTool?: string;

  /** MCP parameters (for MCP steps) */
  mcpParams?: Record<string, any>;

  /** Step configuration */
  config?: StepConfig;

  /** Dependencies (step names this step depends on) */
  dependsOn: string[];

  /**
   * Fallback models to try if the primary model fails.
   * Each model gets its own retry attempts before moving to the next.
   * Format: "provider:model-id"
   */
  fallbackModels?: string[];
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
  signal?: any; // AbortSignal

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
    /** Human-readable error message */
    message: string;
    /** Error type (e.g., 'TimeoutError', 'ProviderError', 'ValidationError') */
    type?: string;
    /** Name of the step that failed */
    stepName?: string;
    /** Additional error details from the provider */
    details?: any;
    /** Original cause of the error (deprecated, use details) */
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

// ============================================================================
// Phantom Type Builder Chain
// ============================================================================

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
   * @returns StepWith builder to configure model or MCP tool
   *
   * @example
   * ```typescript
   * workflow.step("extract", {
   *   schema: InvoiceSchema,
   *   systemPrompt: "Extract invoice data"
   * })
   * ```
   */
  step<Name extends string, Config extends StepConfig = Record<string, never>>(
    name: Name,
    config?: Config
  ): StepWith<Name, Config, Steps>;
}

/**
 * Step builder after .step() - awaiting .with() to specify model or .mcp() to specify MCP tool.
 *
 * @template Name - Step name
 * @template Config - Step configuration
 * @template PrevSteps - Previously defined steps
 */
export interface StepWith<Name extends string, Config extends StepConfig, PrevSteps extends StepDefinition[]> {
  /**
   * Specifies the AI model to use for this step.
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
  with<Model extends string>(
    model: Model
  ): StepWithModel<Name, Config, Model, PrevSteps>;

  /**
   * Specifies the MCP tool to use for this step.
   *
   * @param tool - MCP tool in "server:tool" format
   * @returns StepMCP builder to configure parameters
   *
   * @example
   * ```typescript
   * .mcp("crm:search")
   * .mcp("github:create-issue")
   * ```
   */
  mcp<Tool extends string>(
    tool: Tool
  ): StepMCP<Name, Config, Tool, PrevSteps>;
}

/**
 * Step builder after .with() - can add dependencies, fallbacks, continue building, or run.
 *
 * @template Name - Step name
 * @template Config - Step configuration
 * @template Model - Model identifier
 * @template PrevSteps - Previously defined steps
 */
export interface StepWithModel<
  Name extends string,
  Config extends StepConfig,
  Model extends string,
  PrevSteps extends StepDefinition[]
> extends StepComplete<AppendStep<PrevSteps, { name: Name; type: 'ai'; model: Model; config: Config; dependsOn: [] }>> {
  /**
   * Sets the prompt for this step.
   * This is a convenience method that sets the systemPrompt in config.
   *
   * @param promptText - The prompt text (can include template variables like {{input.name}})
   * @returns StepComplete builder with this step added
   *
   * @example
   * ```typescript
   * .step("classify")
   * .with("openai:gpt-4o")
   * .prompt(`Classify this support ticket by urgency:
   *
   * Ticket: {{input.ticket}}
   *
   * Return: high, medium, or low`)
   * ```
   */
  prompt(promptText: string): StepComplete<AppendStep<PrevSteps, { name: Name; type: 'ai'; model: Model; config: Config & { systemPrompt: string }; dependsOn: [] }>>;

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
  depends<Deps extends PrevSteps[number]['name']>(
    ...deps: Deps[]
  ): StepComplete<AppendStep<PrevSteps, { name: Name; type: 'ai'; model: Model; config: Config; dependsOn: Deps[] }>>;

  /**
   * Adds a fallback model to try if the primary model fails.
   * Fallbacks are tried in order after the primary model exhausts its retries.
   * Can be chained to add multiple fallbacks.
   *
   * @param model - Fallback model in "provider:model-id" format
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .with("openai:gpt-4o")
   * .fallback("anthropic:claude-sonnet-4-20250514")
   * .fallback("openai:gpt-4o-mini")
   * ```
   */
  fallback<FallbackModel extends string>(model: FallbackModel): StepWithModel<Name, Config, Model, PrevSteps>;
}

/**
 * Step builder after .mcp() - awaiting .params() to specify MCP parameters.
 *
 * @template Name - Step name
 * @template Config - Step configuration
 * @template Tool - MCP tool identifier
 * @template PrevSteps - Previously defined steps
 */
export interface StepMCP<Name extends string, Config extends StepConfig, Tool extends string, PrevSteps extends StepDefinition[]> {
  /**
   * Specifies the parameters for the MCP tool.
   * Parameters can include template variables like {{stepName.output}}.
   *
   * @param params - MCP tool parameters
   * @returns StepMCPWithParams builder to add dependencies or run
   *
   * @example
   * ```typescript
   * .params({ name: '{{steps.extract.vendor}}' })
   * .params({ repo: 'owner/repo', title: 'Bug found', body: '{{input.description}}' })
   * ```
   */
  params(
    params: Record<string, any>
  ): StepMCPWithParams<Name, Config, Tool, PrevSteps>;
}

/**
 * Step builder after .params() - can add dependencies, continue building, or run.
 *
 * @template Name - Step name
 * @template Config - Step configuration
 * @template Tool - MCP tool identifier
 * @template PrevSteps - Previously defined steps
 */
export interface StepMCPWithParams<
  Name extends string,
  Config extends StepConfig,
  Tool extends string,
  PrevSteps extends StepDefinition[]
> extends StepComplete<AppendStep<PrevSteps, { name: Name; type: 'mcp'; mcpTool: Tool; config: Config; dependsOn: [] }>> {
  /**
   * Declares dependencies for this MCP step.
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
  depends<Deps extends PrevSteps[number]['name']>(
    ...deps: Deps[]
  ): StepComplete<AppendStep<PrevSteps, { name: Name; type: 'mcp'; mcpTool: Tool; config: Config; dependsOn: Deps[] }>>;
}

/**
 * Step builder after .depends() or when step is complete.
 * Can add more steps or run the workflow.
 *
 * @template NewSteps - Updated step list including the new step
 */
export interface StepComplete<NewSteps extends StepDefinition[]> extends WorkflowBuilder<NewSteps> {
  /**
   * Sets the prompt for the most recent step.
   * This is a convenience method that sets the systemPrompt in config.
   * Can be called after .with() or .depends().
   *
   * @param promptText - The prompt text (can include template variables like {{input.name}})
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .step("classify")
   * .with("openai:gpt-4o")
   * .depends("extract")
   * .prompt(`Classify based on: {{extract.output}}`)
   * ```
   */
  prompt(promptText: string): StepComplete<NewSteps>;

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
  webhook(endpoint: string, options?: { method?: 'POST' | 'PUT'; headers?: Record<string, string> }): StepComplete<NewSteps>;

  /**
   * Configures a schedule for this workflow (cloud-only feature).
   *
   * @param cronExpression - Cron expression for schedule
   * @param options - Schedule configuration
   * @returns This builder for chaining
   */
  schedule(cronExpression: string, options?: { timezone?: string }): StepComplete<NewSteps>;
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
 * MCP server configuration.
 */
export interface MCPServerConfig {
  /** Server URL (for remote MCP servers) */
  url?: string;

  /** Credentials for the MCP server */
  credentials?: Record<string, string>;

  /** Whether this server is enabled */
  enabled?: boolean;
}

/**
 * Policy definition for standardized AI execution patterns.
 * Policies encapsulate model selection, fallback behavior, and cost controls.
 */
export interface Policy {
  /** Unique identifier for this policy */
  id: string;

  /** Human-readable name for the policy */
  name?: string;

  /** Description of what this policy is for */
  description?: string;

  /** Primary model to use (format: provider:model) */
  model: string;

  /** Fallback models if primary fails (in order of preference) */
  fallback?: string[];

  /** System prompt to use with this policy */
  systemPrompt?: string;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Temperature for generation (0-2) */
  temperature?: number;

  /** Cost controls for this policy */
  costCaps?: {
    /** Maximum cost per execution in USD */
    maxCostPerExecution?: number;
    /** Maximum total tokens per execution */
    maxTokensPerExecution?: number;
    /** Maximum retries before giving up */
    maxRetries?: number;
  };

  /** Retry configuration */
  retry?: {
    /** Maximum number of retry attempts */
    maxAttempts?: number;
    /** Initial delay in milliseconds */
    delayMs?: number;
    /** Backoff multiplier for exponential backoff */
    backoffMultiplier?: number;
  };

  /** Optional metadata for tracking and analytics */
  metadata?: Record<string, unknown>;
}

/**
 * Input for policy execution.
 */
export interface PolicyExecuteInput {
  /** The prompt to execute */
  prompt: string;

  /** Optional variables to interpolate into the prompt */
  variables?: Record<string, unknown>;

  /** Optional schema for structured output (Zod schema) */
  schema?: unknown;

  /** Override system prompt for this execution */
  systemPrompt?: string;
}

/**
 * Result of policy execution.
 */
export interface PolicyExecuteResult {
  /** Whether execution succeeded */
  success: boolean;

  /** The output from the model */
  output?: unknown;

  /** Error message if failed */
  error?: string;

  /** Which model was actually used (may differ from primary if fallback triggered) */
  model: string;

  /** Whether a fallback was used */
  usedFallback: boolean;

  /** The policy ID that was executed */
  policyId: string;

  /** Execution metadata */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };

  /** Duration in milliseconds */
  durationMs: number;

  /** Run ID for tracing */
  runId: string;
}

/**
 * Global configuration for the RelayPlane SDK.
 */
export interface GlobalConfig {
  /** Provider configurations (API keys, base URLs) */
  providers?: Record<string, ProviderConfig>;

  /** Policy definitions for standardized execution patterns */
  policies?: Record<string, Policy>;

  /** MCP server configurations */
  mcp?: {
    servers: Record<string, MCPServerConfig>;
  };

  /** Default telemetry configuration */
  telemetry?: {
    enabled: boolean;
    apiEndpoint?: string;
    apiKey?: string;
    flushInterval?: number;
    maxRetries?: number;
  };

  /** Cloud connection configuration */
  cloud?: {
    enabled: boolean;
    teamId?: string;
    accessToken?: string;
    apiEndpoint?: string;
  };
}
