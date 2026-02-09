/**
 * RelayPlane SDK v3 - Policy Execution
 *
 * Provides policy-based execution with fallback and cost controls.
 * Policies encapsulate model selection, retry behavior, and cost limits
 * for standardized AI execution patterns.
 *
 * @packageDocumentation
 */

import type { Policy, PolicyExecuteInput, PolicyExecuteResult, StepConfig } from './v3-types';
import { getPolicy, isProviderConfigured } from './v3-config';
import { createWorkflow } from './v3-builder';

/**
 * Generates a unique run ID for tracking.
 */
function generateRunId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `run_${timestamp}_${random}`;
}

/**
 * Parses a model string into provider and model name.
 *
 * @param modelString - Model string in format "provider:model"
 * @returns Tuple of [provider, model]
 */
function parseModelString(modelString: string): [string, string] {
  const [provider, ...modelParts] = modelString.split(':');
  return [provider, modelParts.join(':')];
}

/**
 * Executes a prompt using a policy configuration.
 *
 * Policies provide standardized execution patterns with:
 * - Primary model selection
 * - Automatic fallback on failure
 * - Cost controls and limits
 * - Retry configuration
 *
 * @param policyId - ID of the policy to use (must be configured via relay.configure())
 * @param input - Execution input (prompt, variables, schema)
 * @returns Execution result with output, usage, and metadata
 *
 * @throws Error if policy is not found
 * @throws Error if required provider is not configured
 *
 * @example
 * ```typescript
 * import { relay } from '@relayplane/sdk';
 *
 * // Configure policies
 * relay.configure({
 *   providers: {
 *     openai: { apiKey: process.env.OPENAI_API_KEY! },
 *     anthropic: { apiKey: process.env.ANTHROPIC_API_KEY! }
 *   },
 *   policies: {
 *     'fast-analysis': {
 *       id: 'fast-analysis',
 *       model: 'openai:gpt-4o',
 *       fallback: ['anthropic:claude-sonnet-4-20250514'],
 *       costCaps: { maxCostPerExecution: 0.10 }
 *     }
 *   }
 * });
 *
 * // Execute using policy
 * const result = await relay.execute('fast-analysis', {
 *   prompt: 'Analyze this document and extract key points',
 *   variables: { document: docText }
 * });
 *
 * if (result.success) {
 *   console.log(result.output);
 *   console.log(`Cost: $${result.usage.estimatedCostUsd}`);
 * }
 * ```
 */
export async function execute(
  policyId: string,
  input: PolicyExecuteInput
): Promise<PolicyExecuteResult> {
  const startTime = Date.now();
  const runId = generateRunId();

  // Get policy configuration
  const policy = getPolicy(policyId);
  if (!policy) {
    const availablePolicies = await listAvailablePolicies();
    throw new Error(
      `Policy "${policyId}" not found. ` +
        `Available policies: ${availablePolicies.join(', ') || '(none)'}. ` +
        `Configure policies via relay.configure({ policies: {...} })`
    );
  }

  // Parse primary model
  const [primaryProvider] = parseModelString(policy.model);

  // Validate provider is configured
  if (!isProviderConfigured(primaryProvider)) {
    throw new Error(
      `Provider "${primaryProvider}" is not configured for policy "${policyId}". ` +
        `Configure via relay.configure({ providers: { ${primaryProvider}: { apiKey: '...' } } })`
    );
  }

  // Build the prompt with variable interpolation
  let finalPrompt = input.prompt;
  if (input.variables) {
    for (const [key, value] of Object.entries(input.variables)) {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      finalPrompt = finalPrompt.replace(placeholder, String(value));
    }
  }

  // Determine system prompt
  const systemPrompt = input.systemPrompt || policy.systemPrompt;

  // Build step config
  const stepConfig: StepConfig = {};
  if (input.schema) {
    stepConfig.schema = input.schema as StepConfig['schema'];
  }
  if (policy.maxTokens) {
    stepConfig.maxTokens = policy.maxTokens;
  }
  if (policy.temperature !== undefined) {
    stepConfig.temperature = policy.temperature;
  }
  if (policy.retry) {
    // Map Policy retry config to StepConfig retry format
    stepConfig.retry = {
      maxRetries: policy.retry.maxAttempts || 3,
      backoffMs: policy.retry.delayMs,
    };
  }

  // Build workflow for execution
  // Note: fallback must be added BEFORE prompt in the fluent API chain
  let stepBuilder = createWorkflow(`policy-${policyId}-${runId}`)
    .step('execute', stepConfig)
    .with(policy.model as `${string}:${string}`);

  // Add fallbacks if configured (must be before .prompt())
  if (policy.fallback && policy.fallback.length > 0) {
    for (const fallbackModel of policy.fallback) {
      stepBuilder = stepBuilder.fallback(fallbackModel as `${string}:${string}`);
    }
  }

  // Complete the step with prompt (includes system prompt via the prompt text)
  const fullPrompt = systemPrompt
    ? `System: ${systemPrompt}\n\nUser: ${finalPrompt}`
    : finalPrompt;

  const workflow = stepBuilder.prompt(fullPrompt);

  try {
    // Execute the workflow
    const result = await workflow.run({});

    const durationMs = Date.now() - startTime;
    const step = result.steps?.execute;

    if (result.success && step) {
      // Check cost caps if configured
      if (policy.costCaps?.maxCostPerExecution !== undefined) {
        const cost = step.usage?.estimatedProviderCostUsd || 0;
        if (cost > policy.costCaps.maxCostPerExecution) {
          return {
            success: false,
            error: `Cost cap exceeded: $${cost.toFixed(4)} > $${policy.costCaps.maxCostPerExecution.toFixed(4)}`,
            model: step.model || policy.model,
            usedFallback: step.model !== policy.model,
            policyId,
            usage: {
              promptTokens: step.usage?.promptTokens || 0,
              completionTokens: step.usage?.completionTokens || 0,
              totalTokens: step.usage?.totalTokens || 0,
              estimatedCostUsd: cost,
            },
            durationMs,
            runId,
          };
        }
      }

      // Check token cap if configured
      if (policy.costCaps?.maxTokensPerExecution !== undefined) {
        const tokens = step.usage?.totalTokens || 0;
        if (tokens > policy.costCaps.maxTokensPerExecution) {
          return {
            success: false,
            error: `Token cap exceeded: ${tokens} > ${policy.costCaps.maxTokensPerExecution}`,
            model: step.model || policy.model,
            usedFallback: step.model !== policy.model,
            policyId,
            usage: {
              promptTokens: step.usage?.promptTokens || 0,
              completionTokens: step.usage?.completionTokens || 0,
              totalTokens: tokens,
              estimatedCostUsd: step.usage?.estimatedProviderCostUsd || 0,
            },
            durationMs,
            runId,
          };
        }
      }

      return {
        success: true,
        output: step.output,
        model: step.model || policy.model,
        usedFallback: step.model !== policy.model,
        policyId,
        usage: {
          promptTokens: step.usage?.promptTokens || 0,
          completionTokens: step.usage?.completionTokens || 0,
          totalTokens: step.usage?.totalTokens || 0,
          estimatedCostUsd: step.usage?.estimatedProviderCostUsd || 0,
        },
        durationMs,
        runId,
      };
    } else {
      // Execution failed
      return {
        success: false,
        error: result.error || step?.error || 'Unknown execution error',
        model: step?.model || policy.model,
        usedFallback: step?.model !== policy.model,
        policyId,
        usage: {
          promptTokens: step?.usage?.promptTokens || 0,
          completionTokens: step?.usage?.completionTokens || 0,
          totalTokens: step?.usage?.totalTokens || 0,
          estimatedCostUsd: step?.usage?.estimatedProviderCostUsd || 0,
        },
        durationMs,
        runId,
      };
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      model: policy.model,
      usedFallback: false,
      policyId,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
      },
      durationMs,
      runId,
    };
  }
}

/**
 * Lists available policy IDs.
 * Helper function for error messages.
 */
async function listAvailablePolicies(): Promise<string[]> {
  // Import dynamically to avoid circular dependency
  const { listPolicies } = await import('./v3-config');
  return listPolicies();
}

/**
 * Gets details about a policy.
 * Useful for introspection and debugging.
 *
 * @param policyId - ID of the policy
 * @returns Policy configuration or undefined if not found
 */
export function getPolicyDetails(policyId: string): Policy | undefined {
  return getPolicy(policyId);
}
