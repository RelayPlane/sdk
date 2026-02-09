/**
 * RelayPlane SDK Error System
 *
 * Provides structured, agent-friendly errors with actionable information.
 * All errors include:
 * - code: Machine-readable error code
 * - message: Human-readable summary
 * - why: Explanation of what went wrong
 * - fix: Exact code snippet to fix it
 * - repro_cmd: Command to reproduce/verify fix
 * - trace_id: Unique ID for debugging
 *
 * @packageDocumentation
 */

/**
 * Error codes for RelayPlane SDK.
 * Standardized codes for machine-readable error handling.
 */
export enum RelayPlaneErrorCode {
  // Configuration errors (1xx)
  PROVIDER_NOT_CONFIGURED = 'PROVIDER_NOT_CONFIGURED',
  INVALID_API_KEY = 'INVALID_API_KEY',
  MISSING_CONFIG = 'MISSING_CONFIG',
  INVALID_CONFIG = 'INVALID_CONFIG',

  // Policy errors (2xx)
  POLICY_NOT_FOUND = 'POLICY_NOT_FOUND',
  POLICY_INVALID = 'POLICY_INVALID',
  COST_CAP_EXCEEDED = 'COST_CAP_EXCEEDED',
  TOKEN_CAP_EXCEEDED = 'TOKEN_CAP_EXCEEDED',

  // Workflow errors (3xx)
  WORKFLOW_INVALID = 'WORKFLOW_INVALID',
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  MISSING_DEPENDENCY = 'MISSING_DEPENDENCY',
  DUPLICATE_STEP = 'DUPLICATE_STEP',

  // Execution errors (4xx)
  STEP_FAILED = 'STEP_FAILED',
  TIMEOUT = 'TIMEOUT',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  FALLBACK_EXHAUSTED = 'FALLBACK_EXHAUSTED',

  // Template errors (5xx)
  TEMPLATE_ERROR = 'TEMPLATE_ERROR',
  VARIABLE_NOT_FOUND = 'VARIABLE_NOT_FOUND',

  // MCP errors (6xx)
  MCP_SERVER_NOT_FOUND = 'MCP_SERVER_NOT_FOUND',
  MCP_TOOL_ERROR = 'MCP_TOOL_ERROR',

  // General errors (9xx)
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Structured error payload for JSON serialization.
 */
export interface RelayPlaneErrorPayload {
  /** Machine-readable error code */
  code: RelayPlaneErrorCode | string;

  /** Human-readable error summary */
  message: string;

  /** Explanation of what went wrong */
  why: string;

  /** Exact code snippet or action to fix the error */
  fix: string;

  /** Command to reproduce or verify the fix */
  repro_cmd?: string;

  /** Unique trace ID for debugging */
  trace_id: string;

  /** Optional link to relevant documentation */
  docs?: string;

  /** Optional additional context */
  context?: Record<string, unknown>;
}

/**
 * Generates a unique trace ID.
 */
function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `trace_${timestamp}_${random}`;
}

/**
 * RelayPlane SDK error with structured, agent-friendly information.
 *
 * Extends Error with additional fields for debugging and self-correction:
 * - code: Machine-readable error code
 * - why: Explanation of what went wrong
 * - fix: Exact code snippet to fix it
 * - repro_cmd: Command to reproduce/verify fix
 * - trace_id: Unique ID for debugging
 *
 * @example
 * ```typescript
 * throw new RelayPlaneError({
 *   code: RelayPlaneErrorCode.PROVIDER_NOT_CONFIGURED,
 *   message: 'OpenAI provider is not configured',
 *   why: 'You tried to use "openai:gpt-4o" but no OpenAI API key was provided',
 *   fix: `relay.configure({
 *   providers: {
 *     openai: { apiKey: process.env.OPENAI_API_KEY }
 *   }
 * })`,
 *   repro_cmd: 'relay check --provider openai',
 *   docs: 'https://relayplane.com/docs/configuration#providers'
 * });
 * ```
 */
export class RelayPlaneError extends Error {
  /** Machine-readable error code */
  public readonly code: RelayPlaneErrorCode | string;

  /** Explanation of what went wrong */
  public readonly why: string;

  /** Exact code snippet or action to fix the error */
  public readonly fix: string;

  /** Command to reproduce or verify the fix */
  public readonly repro_cmd?: string;

  /** Unique trace ID for debugging */
  public readonly trace_id: string;

  /** Optional link to relevant documentation */
  public readonly docs?: string;

  /** Optional additional context */
  public readonly context?: Record<string, unknown>;

  /** Original error that caused this error */
  public readonly cause?: Error;

  constructor(payload: RelayPlaneErrorPayload, cause?: Error) {
    super(payload.message);
    this.name = 'RelayPlaneError';
    this.code = payload.code;
    this.why = payload.why;
    this.fix = payload.fix;
    this.repro_cmd = payload.repro_cmd;
    this.trace_id = payload.trace_id || generateTraceId();
    this.docs = payload.docs;
    this.context = payload.context;
    this.cause = cause;

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, RelayPlaneError.prototype);
  }

  /**
   * Converts the error to a JSON-serializable object.
   * Useful for logging and API responses.
   */
  toJSON(): RelayPlaneErrorPayload {
    return {
      code: this.code,
      message: this.message,
      why: this.why,
      fix: this.fix,
      repro_cmd: this.repro_cmd,
      trace_id: this.trace_id,
      docs: this.docs,
      context: this.context,
    };
  }

  /**
   * Returns a formatted string representation for logging.
   */
  toString(): string {
    return [
      `[${this.code}] ${this.message}`,
      ``,
      `Why: ${this.why}`,
      ``,
      `Fix:`,
      this.fix,
      ``,
      this.repro_cmd ? `Verify: ${this.repro_cmd}` : '',
      this.docs ? `Docs: ${this.docs}` : '',
      ``,
      `Trace ID: ${this.trace_id}`,
    ]
      .filter(Boolean)
      .join('\n');
  }
}

/**
 * Type guard to check if an error is a RelayPlaneError.
 */
export function isRelayPlaneError(error: unknown): error is RelayPlaneError {
  return error instanceof RelayPlaneError;
}

// ============================================================================
// Factory Functions for Common Errors
// ============================================================================

/**
 * Creates an error for unconfigured provider.
 */
export function providerNotConfiguredError(
  provider: string,
  model: string,
  traceId?: string
): RelayPlaneError {
  const envVar = `${provider.toUpperCase()}_API_KEY`;
  return new RelayPlaneError({
    code: RelayPlaneErrorCode.PROVIDER_NOT_CONFIGURED,
    message: `${provider} provider is not configured`,
    why: `You tried to use "${provider}:${model}" but no ${provider} API key was provided in relay.configure()`,
    fix: `relay.configure({
  providers: {
    ${provider}: { apiKey: process.env.${envVar} }
  }
})`,
    repro_cmd: `relay check --provider ${provider}`,
    trace_id: traceId || generateTraceId(),
    docs: 'https://relayplane.com/docs/configuration#providers',
    context: { provider, model },
  });
}

/**
 * Creates an error for policy not found.
 */
export function policyNotFoundError(
  policyId: string,
  availablePolicies: string[],
  traceId?: string
): RelayPlaneError {
  return new RelayPlaneError({
    code: RelayPlaneErrorCode.POLICY_NOT_FOUND,
    message: `Policy "${policyId}" not found`,
    why: `You tried to execute policy "${policyId}" but it hasn't been configured`,
    fix: `relay.configure({
  policies: {
    '${policyId}': {
      id: '${policyId}',
      model: 'openai:gpt-4o',
      // add your policy configuration
    }
  }
})`,
    repro_cmd: `relay policies list`,
    trace_id: traceId || generateTraceId(),
    docs: 'https://relayplane.com/docs/policies',
    context: { policyId, availablePolicies },
  });
}

/**
 * Creates an error for cost cap exceeded.
 */
export function costCapExceededError(
  policyId: string,
  actualCost: number,
  maxCost: number,
  traceId?: string
): RelayPlaneError {
  return new RelayPlaneError({
    code: RelayPlaneErrorCode.COST_CAP_EXCEEDED,
    message: `Cost cap exceeded for policy "${policyId}"`,
    why: `The execution cost ($${actualCost.toFixed(4)}) exceeded the maximum allowed ($${maxCost.toFixed(4)})`,
    fix: `relay.configure({
  policies: {
    '${policyId}': {
      // ... existing config
      costCaps: {
        maxCostPerExecution: ${(maxCost * 2).toFixed(2)} // Increase limit
      }
    }
  }
})`,
    repro_cmd: `relay run --policy ${policyId} --dry-run`,
    trace_id: traceId || generateTraceId(),
    docs: 'https://relayplane.com/docs/policies#cost-caps',
    context: { policyId, actualCost, maxCost },
  });
}

/**
 * Creates an error for circular dependency.
 */
export function circularDependencyError(
  workflowName: string,
  cycle: string[],
  traceId?: string
): RelayPlaneError {
  return new RelayPlaneError({
    code: RelayPlaneErrorCode.CIRCULAR_DEPENDENCY,
    message: `Circular dependency detected in workflow "${workflowName}"`,
    why: `Steps have circular dependencies: ${cycle.join(' → ')}`,
    fix: `// Remove the circular dependency by adjusting .depends() calls
// Current cycle: ${cycle.join(' → ')}
// Fix one of these steps to not depend on an earlier step in the chain`,
    repro_cmd: `relay workflow validate --name ${workflowName}`,
    trace_id: traceId || generateTraceId(),
    docs: 'https://relayplane.com/docs/workflows#dependencies',
    context: { workflowName, cycle },
  });
}

/**
 * Creates an error for step execution failure.
 */
export function stepFailedError(
  stepName: string,
  workflowName: string,
  errorMessage: string,
  attempts: number,
  traceId?: string
): RelayPlaneError {
  return new RelayPlaneError({
    code: RelayPlaneErrorCode.STEP_FAILED,
    message: `Step "${stepName}" failed in workflow "${workflowName}"`,
    why: `After ${attempts} attempt(s): ${errorMessage}`,
    fix: `// Add retry configuration to handle transient failures
.step('${stepName}', {
  retry: { maxRetries: 3, backoffMs: 1000 }
})
// Or add a fallback model
.fallback('anthropic:claude-sonnet-4-20250514')`,
    repro_cmd: `relay workflow run --name ${workflowName} --verbose`,
    trace_id: traceId || generateTraceId(),
    docs: 'https://relayplane.com/docs/workflows#retry-and-fallback',
    context: { stepName, workflowName, attempts, errorMessage },
  });
}

/**
 * Creates an error for timeout.
 */
export function timeoutError(
  context: string,
  timeoutMs: number,
  traceId?: string
): RelayPlaneError {
  return new RelayPlaneError({
    code: RelayPlaneErrorCode.TIMEOUT,
    message: `Timeout: ${context}`,
    why: `The operation took longer than the allowed ${timeoutMs}ms`,
    fix: `// Increase the timeout
.step('stepName', {
  timeout: ${timeoutMs * 2} // Double the timeout
})

// Or use a faster model
.with('openai:gpt-4o-mini')`,
    repro_cmd: `relay run --timeout ${timeoutMs * 2}`,
    trace_id: traceId || generateTraceId(),
    docs: 'https://relayplane.com/docs/configuration#timeouts',
    context: { context, timeoutMs },
  });
}

/**
 * Creates a generic error from an unknown error.
 */
export function fromUnknownError(error: unknown, traceId?: string): RelayPlaneError {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? error : undefined;

  return new RelayPlaneError(
    {
      code: RelayPlaneErrorCode.UNKNOWN_ERROR,
      message: `An unexpected error occurred: ${message}`,
      why: 'An unexpected error was thrown during execution',
      fix: `// Check the error message for details
// Trace ID: ${traceId || 'pending'}
// If this persists, please report at https://github.com/relayplane/sdk/issues`,
      trace_id: traceId || generateTraceId(),
      docs: 'https://relayplane.com/docs/troubleshooting',
      context: { originalMessage: message },
    },
    cause
  );
}
