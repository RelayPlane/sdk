/**
 * RelayPlane SDK v3 - Upgrade Moments
 *
 * Implements contextual upgrade hints that guide users toward cloud features
 * without blocking local execution. These moments are designed to convert
 * users naturally when they need cloud automation features.
 *
 * Philosophy:
 * - Never block local execution
 * - Only show hints when relevant
 * - Always helpful, never salesy
 * - Respect RELAY_NO_HINTS environment variable
 *
 * @packageDocumentation
 */
import type { CloudFeatures, WorkflowResult } from './v3-types';
/**
 * Reasons why an upgrade hint might be shown.
 */
export type UpgradeReason = 'cloud-feature-needed' | 'post-run-hint' | 'debugging-hint' | 'npm-install' | 'cli-status';
/**
 * Checks if cloud features are being used in the workflow.
 *
 * @param cloudFeatures - Cloud features configuration
 * @returns True if any cloud features are configured
 */
export declare function detectCloudIntent(cloudFeatures?: CloudFeatures): boolean;
/**
 * Checks if upgrade hints should be suppressed.
 * Respects RELAY_NO_HINTS and RELAY_TELEMETRY environment variables.
 *
 * @returns True if hints should be suppressed
 */
export declare function shouldSuppressHints(): boolean;
/**
 * Prints an upgrade hint to console.
 * Only prints if cloud is not enabled and hints are not suppressed.
 *
 * @param reason - The reason for showing the hint
 * @param context - Optional context-specific information
 */
export declare function printUpgradeHint(reason: UpgradeReason, context?: Record<string, any>): void;
/**
 * Checks if a workflow has multiple steps (complexity indicator).
 *
 * @param stepCount - Number of steps in workflow
 * @returns True if workflow is multi-step (>= 2 steps)
 */
export declare function hasMultipleSteps(stepCount: number): boolean;
/**
 * Determines if post-run hint should be shown.
 *
 * Criteria:
 * - Workflow succeeded
 * - Workflow has multiple steps (indicates complexity)
 * - Cloud is not enabled
 * - Hints are not suppressed
 *
 * @param result - Workflow execution result
 * @param stepCount - Number of steps
 * @returns True if hint should be shown
 */
export declare function shouldShowPostRunHint(result: WorkflowResult, stepCount: number): boolean;
/**
 * Determines if debugging hint should be shown.
 *
 * Criteria:
 * - Workflow failed
 * - Cloud is not enabled
 * - Hints are not suppressed
 *
 * @param result - Workflow execution result
 * @returns True if hint should be shown
 */
export declare function shouldShowDebuggingHint(result: WorkflowResult): boolean;
/**
 * Anonymous telemetry capture for understanding usage patterns.
 * Only captures if telemetry is enabled and anonymizes all data.
 *
 * @param _event - Event name (unused - reserved for future)
 * @param _properties - Event properties (unused - reserved for future)
 */
export declare function captureAnonymousTelemetry(_event: string, _properties?: Record<string, any>): void;
/**
 * Checks if a feature requires cloud access.
 *
 * @param feature - Feature name
 * @returns True if feature requires cloud
 */
export declare function isCloudOnlyFeature(feature: string): boolean;
/**
 * Returns a helpful error message for cloud-only features.
 *
 * @param feature - Feature name
 * @returns Error message with upgrade instructions
 */
export declare function getCloudFeatureError(feature: string): string;
//# sourceMappingURL=v3-upgrade-hints.d.ts.map