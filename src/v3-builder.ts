/**
 * RelayPlane SDK v3 - Fluent Builder Implementation
 *
 * Implements the type-safe fluent builder API for workflow construction.
 * Uses phantom types to provide compile-time guarantees for workflow correctness.
 *
 * @packageDocumentation
 */

import type {
  WorkflowBuilder,
  StepWith,
  StepWithModel,
  StepMCP,
  StepMCPWithParams,
  StepComplete,
  StepConfig,
  StepDefinition,
  CloudFeatures,
  RunOptions,
  WorkflowResult,
} from './v3-types';
import type { WorkflowDefinition, WorkflowStep, WorkflowRunResult } from '@relayplane/engine';
import { runWorkflow } from '@relayplane/engine';
import { defaultAdapterRegistry } from '@relayplane/adapters';
import { createAdapterExecutor } from './adapters/executor';
import {
  resolveProviderConfig,
  validateProvidersConfigured,
  isCloudEnabled,
  getConfig,
  getTelemetryClient,
} from './v3-config';
import {
  detectCloudIntent,
  printUpgradeHint,
  shouldShowPostRunHint,
  shouldShowDebuggingHint,
} from './v3-upgrade-hints';
import { MCPLoader, MCPExecutor } from '@relayplane/mcp';
import type { MCPExecutionContext } from '@relayplane/mcp';

/**
 * Internal workflow builder implementation.
 * Manages workflow state and provides the fluent API.
 */
class WorkflowBuilderImpl<Steps extends StepDefinition[] = []>
  implements WorkflowBuilder<Steps>, StepComplete<Steps>
{
  constructor(
    private workflowName: string,
    private steps: StepDefinition[] = [],
    private cloudFeatures: CloudFeatures = {}
  ) {}

  /**
   * Adds a new step to the workflow.
   */
  step<Name extends string, Config extends StepConfig = {}>(
    name: Name,
    config?: Config
  ): StepWith<Name, Config, Steps> {
    return new StepWithImpl<Name, Config, Steps>(this.workflowName, this.steps, this.cloudFeatures, name, config);
  }

  /**
   * Sets the prompt for the most recent step.
   * This is a convenience method that sets the systemPrompt in config.
   */
  prompt(promptText: string): StepComplete<Steps> {
    // Update the last step to include the prompt
    if (this.steps.length > 0) {
      const lastStep = this.steps[this.steps.length - 1];
      lastStep.config = {
        ...lastStep.config,
        systemPrompt: promptText,
      };
    }

    return this;
  }

  /**
   * Configures a webhook for this workflow (cloud-only).
   */
  webhook(
    endpoint: string,
    options?: { method?: 'POST' | 'PUT'; headers?: Record<string, string> }
  ): StepComplete<Steps> {
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
  schedule(cronExpression: string, options?: { timezone?: string }): StepComplete<Steps> {
    this.cloudFeatures.schedule = {
      cron: cronExpression,
      timezone: options?.timezone,
    };
    return this;
  }

  /**
   * Executes the workflow.
   */
  async run(input?: any, options?: RunOptions): Promise<WorkflowResult> {
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

      // Check if workflow contains MCP steps
      const hasMCPSteps = this.steps.some(step => step.type === 'mcp');

      if (hasMCPSteps) {
        // Execute workflow with MCP support
        return await this.runWithMCP(input, options, startTime);
      }

      // Extract providers from AI steps only
      const providers = this.extractProviders();

      // Validate that all providers are configured
      validateProvidersConfigured(providers, options);

      // Convert SDK steps to engine steps (AI only)
      const workflowSteps: WorkflowStep[] = this.steps
        .filter(step => step.type === 'ai')
        .map((step) => {
          const [provider, model] = this.parseModel(step.model!);

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
      const workflowDef: WorkflowDefinition = {
        workflowName: this.workflowName,
        steps: workflowSteps,
      };

      // Create adapter executor
      const adapterExecutor = createAdapterExecutor(defaultAdapterRegistry, this.buildApiKeys(options));

      // Execute workflow
      const engineResult: WorkflowRunResult = await runWorkflow(workflowDef, input || {}, adapterExecutor, {
        telemetry: false,
        timeout: options?.timeout,
        metadata: options?.metadata,
      });

      // Record telemetry if enabled (async, non-blocking)
      const telemetryClient = getTelemetryClient();
      if (telemetryClient) {
        telemetryClient.recordRun(engineResult).catch((err) => {
          console.error('[Telemetry] Failed to record run:', err);
        });
      }

      // Convert engine result to SDK result
      const result = this.convertResult(engineResult, startTime);

      // Show post-run hint if appropriate
      if (shouldShowPostRunHint(result, this.steps.length)) {
        printUpgradeHint('post-run-hint', {
          stepCount: this.steps.length,
        });
      }

      return result;
    } catch (error) {
      const endTime = new Date();
      const result: WorkflowResult = {
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
   * Executes workflow with MCP support.
   * Handles mixed workflows with both AI and MCP steps.
   */
  private async runWithMCP(input: any, options: RunOptions | undefined, startTime: Date): Promise<WorkflowResult> {
    // Initialize MCP loader and executor
    const mcpLoader = new MCPLoader();
    const mcpExecutor = new MCPExecutor();

    // Load MCP servers from global config
    const globalConfig = getConfig();
    if (globalConfig.mcp?.servers) {
      await mcpLoader.loadFromConfig({
        servers: globalConfig.mcp.servers
      });
    }

    // Build execution graph
    const executedSteps = new Map<string, any>();
    const stepOutputs: Record<string, any> = {};

    // Topologically sort steps based on dependencies
    const sortedSteps = this.topologicalSort();

    // Execute steps in order
    for (const step of sortedSteps) {
      try {
        if (step.type === 'ai') {
          // Execute AI step
          const output = await this.executeAIStep(step, input, stepOutputs, options);
          stepOutputs[step.name] = output;
          executedSteps.set(step.name, { success: true, output });
        } else if (step.type === 'mcp') {
          // Execute MCP step
          const output = await this.executeMCPStep(
            step,
            input,
            stepOutputs,
            mcpLoader,
            mcpExecutor
          );
          stepOutputs[step.name] = output;
          executedSteps.set(step.name, { success: true, output });
        }
      } catch (error) {
        const endTime = new Date();
        const errorResult = {
          success: false,
          steps: stepOutputs,
          error: {
            message: error instanceof Error ? error.message : String(error),
            stepName: step.name,
            cause: error,
          },
          metadata: {
            workflowName: this.workflowName,
            startTime,
            endTime,
            duration: endTime.getTime() - startTime.getTime(),
          },
        };

        // Record failed run telemetry (async, non-blocking)
        const telemetryClient = getTelemetryClient();
        if (telemetryClient) {
          telemetryClient.recordSDKRun(errorResult).catch((err) => {
            console.error('[Telemetry] Failed to record MCP error run:', err);
          });
        }

        return errorResult;
      }
    }

    // Build final result
    const endTime = new Date();
    const finalOutput = sortedSteps.length > 0 ? stepOutputs[sortedSteps[sortedSteps.length - 1].name] : undefined;

    const result = {
      success: true,
      steps: stepOutputs,
      finalOutput,
      metadata: {
        workflowName: this.workflowName,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
      },
    };

    // Record telemetry for MCP workflow (async, non-blocking)
    const telemetryClient = getTelemetryClient();
    if (telemetryClient) {
      telemetryClient.recordSDKRun(result).catch((err) => {
        console.error('[Telemetry] Failed to record MCP run:', err);
      });
    }

    return result;
  }

  /**
   * Executes a single AI step.
   */
  private async executeAIStep(
    step: StepDefinition,
    workflowInput: any,
    stepOutputs: Record<string, any>,
    options: RunOptions | undefined
  ): Promise<any> {
    const [provider, model] = this.parseModel(step.model!);

    // Build workflow with just this step
    const workflowStep: WorkflowStep = {
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

    const workflowDef: WorkflowDefinition = {
      workflowName: `${this.workflowName}_${step.name}`,
      steps: [workflowStep],
    };

    const adapterExecutor = createAdapterExecutor(defaultAdapterRegistry, this.buildApiKeys(options));

    // Execute with context including previous step outputs
    const context = {
      input: workflowInput,
      steps: stepOutputs,
      previousSteps: stepOutputs, // For compatibility
    };

    const result = await runWorkflow(workflowDef, context, adapterExecutor, {
      telemetry: false,
      timeout: options?.timeout,
      metadata: options?.metadata,
    });

    if (!result.success) {
      throw new Error(`Step ${step.name} failed`);
    }

    return result.finalOutput;
  }

  /**
   * Executes a single MCP step.
   */
  private async executeMCPStep(
    step: StepDefinition,
    workflowInput: any,
    stepOutputs: Record<string, any>,
    mcpLoader: MCPLoader,
    mcpExecutor: MCPExecutor
  ): Promise<any> {
    // Parse MCP tool format "server:tool"
    const [serverName, toolName] = this.parseMCPTool(step.mcpTool!);

    // Get server
    const servers = mcpLoader.getAllServers();
    const server = servers.find((s: any) => s.name === serverName);

    if (!server) {
      throw new Error(`MCP server "${serverName}" not found. Did you configure it in relay.configure()?`);
    }

    // Build execution context
    const context: MCPExecutionContext = {
      workflowName: this.workflowName,
      stepName: step.name,
      runId: `run_${Date.now()}`,
      input: workflowInput,
      previousSteps: stepOutputs,
    };

    // Execute MCP tool
    const result = await mcpExecutor.execute(
      server,
      toolName,
      step.mcpParams || {},
      context
    );

    if (!result.success) {
      throw new Error(`MCP step ${step.name} failed: ${result.error}`);
    }

    return result.output;
  }

  /**
   * Topologically sorts steps based on dependencies.
   */
  private topologicalSort(): StepDefinition[] {
    const sorted: StepDefinition[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (stepName: string) => {
      if (visited.has(stepName)) return;
      if (visiting.has(stepName)) {
        throw new Error(`Circular dependency detected involving step: ${stepName}`);
      }

      visiting.add(stepName);

      const step = this.steps.find(s => s.name === stepName);
      if (!step) {
        throw new Error(`Step ${stepName} not found`);
      }

      // Visit dependencies first
      for (const dep of step.dependsOn) {
        visit(dep);
      }

      visiting.delete(stepName);
      visited.add(stepName);
      sorted.push(step);
    };

    // Visit all steps
    for (const step of this.steps) {
      visit(step.name);
    }

    return sorted;
  }

  /**
   * Parses "server:tool" format into [server, tool].
   */
  private parseMCPTool(tool: string): [string, string] {
    const parts = tool.split(':');
    if (parts.length !== 2) {
      throw new Error(
        `Invalid MCP tool format: "${tool}". Expected "server:tool" (e.g., "crm:search")`
      );
    }
    return [parts[0], parts[1]];
  }

  /**
   * Builds API keys object for adapter executor.
   * Resolves keys from three-tier resolution strategy.
   */
  private buildApiKeys(options?: RunOptions): Record<string, string> {
    const providers = this.extractProviders();
    const apiKeys: Record<string, string> = {};

    for (const provider of providers) {
      const config = resolveProviderConfig(provider, options);
      if (config) {
        apiKeys[provider] = config.apiKey;
      }
    }

    return apiKeys;
  }

  /**
   * Extracts unique provider names from AI steps only.
   */
  private extractProviders(): string[] {
    const providers = new Set<string>();
    for (const step of this.steps) {
      if (step.type === 'ai' && step.model) {
        const [provider] = this.parseModel(step.model);
        providers.add(provider);
      }
    }
    return Array.from(providers);
  }

  /**
   * Parses "provider:model-id" format into [provider, model].
   */
  private parseModel(model: string): [string, string] {
    const parts = model.split(':');
    if (parts.length !== 2) {
      throw new Error(
        `Invalid model format: "${model}". Expected "provider:model-id" (e.g., "openai:gpt-4o")`
      );
    }
    return [parts[0], parts[1]];
  }

  /**
   * Builds prompt from step config.
   * Combines systemPrompt and userPrompt if both are provided.
   */
  private buildPrompt(config?: StepConfig): string | undefined {
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
  private convertResult(engineResult: WorkflowRunResult, startTime: Date): WorkflowResult {
    const endTime = new Date();
    const stepOutputs: Record<string, any> = {};

    // Extract step outputs
    for (const stepLog of engineResult.steps) {
      if ((stepLog as any).output) {
        stepOutputs[(stepLog as any).stepName] = (stepLog as any).output;
      }
    }

    // Get final output (last step's output)
    const finalOutput = engineResult.finalOutput;

    // Find the failed step for error details
    const failedStep = engineResult.steps.find((log: any) => !log.success);

    return {
      success: engineResult.success,
      steps: stepOutputs,
      finalOutput,
      error: engineResult.success
        ? undefined
        : {
            message: failedStep?.error?.message || 'Workflow execution failed',
            type: failedStep?.error?.type,
            stepName: failedStep?.stepName,
            details: failedStep?.error?.raw,
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
  private getCloudFeatureNames(): string {
    const features: string[] = [];
    if (this.cloudFeatures.webhook) features.push('webhooks');
    if (this.cloudFeatures.schedule) features.push('schedules');
    if (this.cloudFeatures.telemetry) features.push('telemetry');
    return features.join(', ') || 'cloud features';
  }
}

/**
 * Step builder after .step() - awaiting .with() or .mcp().
 */
class StepWithImpl<Name extends string, Config extends StepConfig, PrevSteps extends StepDefinition[]>
  implements StepWith<Name, Config, PrevSteps>
{
  constructor(
    private workflowName: string,
    private steps: StepDefinition[],
    private cloudFeatures: CloudFeatures,
    private stepName: Name,
    private stepConfig?: Config
  ) {}

  with<Model extends string>(model: Model): StepWithModel<Name, Config, Model, PrevSteps> {
    return new StepWithModelImpl<Name, Config, Model, PrevSteps>(
      this.workflowName,
      this.steps,
      this.cloudFeatures,
      this.stepName,
      this.stepConfig,
      model
    );
  }

  mcp<Tool extends string>(tool: Tool): StepMCP<Name, Config, Tool, PrevSteps> {
    return new StepMCPImpl<Name, Config, Tool, PrevSteps>(
      this.workflowName,
      this.steps,
      this.cloudFeatures,
      this.stepName,
      this.stepConfig,
      tool
    );
  }
}

/**
 * Step builder after .with() - can add dependencies, continue building, or run.
 */
class StepWithModelImpl<
  Name extends string,
  Config extends StepConfig,
  Model extends string,
  PrevSteps extends StepDefinition[]
> extends WorkflowBuilderImpl<any> implements StepWithModel<Name, Config, Model, PrevSteps>
{
  constructor(
    workflowName: string,
    steps: StepDefinition[],
    cloudFeatures: CloudFeatures,
    stepName: Name,
    stepConfig: Config | undefined,
    model: Model
  ) {
    // Add the step immediately when .with() is called
    const newStep: StepDefinition = {
      name: stepName,
      type: 'ai',
      model: model,
      config: stepConfig,
      dependsOn: [],
    };

    super(workflowName, [...steps, newStep], cloudFeatures);
  }

  /**
   * Sets the prompt for this step.
   * This is a convenience method that sets the systemPrompt in config.
   */
  prompt(promptText: string): StepComplete<any> {
    // Update the last step (this step) to include the prompt
    const allSteps = [...(this as any).steps];
    const lastStep = allSteps[allSteps.length - 1];

    if (lastStep) {
      lastStep.config = {
        ...lastStep.config,
        systemPrompt: promptText,
      };
    }

    return new WorkflowBuilderImpl((this as any).workflowName, allSteps, (this as any).cloudFeatures);
  }

  depends<Deps extends PrevSteps[number]['name']>(...deps: Deps[]): StepComplete<any> {
    // Update the last step (this step) to include dependencies
    const allSteps = [...(this as any).steps];
    const lastStep = allSteps[allSteps.length - 1];

    if (lastStep) {
      lastStep.dependsOn = deps as string[];
    }

    return new WorkflowBuilderImpl((this as any).workflowName, allSteps, (this as any).cloudFeatures);
  }
}

/**
 * Step builder after .mcp() - awaiting .params().
 */
class StepMCPImpl<
  Name extends string,
  Config extends StepConfig,
  Tool extends string,
  PrevSteps extends StepDefinition[]
> implements StepMCP<Name, Config, Tool, PrevSteps>
{
  constructor(
    private workflowName: string,
    private steps: StepDefinition[],
    private cloudFeatures: CloudFeatures,
    private stepName: Name,
    private stepConfig: Config | undefined,
    private tool: Tool
  ) {}

  params(params: Record<string, any>): StepMCPWithParams<Name, Config, Tool, PrevSteps> {
    return new StepMCPWithParamsImpl<Name, Config, Tool, PrevSteps>(
      this.workflowName,
      this.steps,
      this.cloudFeatures,
      this.stepName,
      this.stepConfig,
      this.tool,
      params
    );
  }
}

/**
 * Step builder after .params() - can add dependencies, continue building, or run.
 */
class StepMCPWithParamsImpl<
  Name extends string,
  Config extends StepConfig,
  Tool extends string,
  PrevSteps extends StepDefinition[]
> extends WorkflowBuilderImpl<any> implements StepMCPWithParams<Name, Config, Tool, PrevSteps>
{
  constructor(
    workflowName: string,
    steps: StepDefinition[],
    cloudFeatures: CloudFeatures,
    stepName: Name,
    stepConfig: Config | undefined,
    tool: Tool,
    params: Record<string, any>
  ) {
    // Add the MCP step immediately when .params() is called
    const newStep: StepDefinition = {
      name: stepName,
      type: 'mcp',
      mcpTool: tool,
      mcpParams: params,
      config: stepConfig,
      dependsOn: [],
    };

    super(workflowName, [...steps, newStep], cloudFeatures);
  }

  depends<Deps extends PrevSteps[number]['name']>(...deps: Deps[]): StepComplete<any> {
    // Update the last step (this step) to include dependencies
    const allSteps = [...(this as any).steps];
    const lastStep = allSteps[allSteps.length - 1];

    if (lastStep) {
      lastStep.dependsOn = deps as string[];
    }

    return new WorkflowBuilderImpl((this as any).workflowName, allSteps, (this as any).cloudFeatures);
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
export function createWorkflow(name: string): WorkflowBuilder<[]> {
  return new WorkflowBuilderImpl(name, [], {});
}
