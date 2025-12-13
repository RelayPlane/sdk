/**
 * RelayPlane SDK v3 - Fluent Builder Implementation
 *
 * Implements the type-safe fluent builder API for workflow construction.
 * Uses phantom types to provide compile-time guarantees for workflow correctness.
 *
 * @packageDocumentation
 */
import type { WorkflowBuilder } from './v3-types';
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
export declare function createWorkflow(name: string): WorkflowBuilder<[]>;
//# sourceMappingURL=v3-builder.d.ts.map