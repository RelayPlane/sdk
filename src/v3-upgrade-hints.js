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
import { isCloudEnabled } from './v3-config';
/**
 * Checks if cloud features are being used in the workflow.
 *
 * @param cloudFeatures - Cloud features configuration
 * @returns True if any cloud features are configured
 */
export function detectCloudIntent(cloudFeatures) {
    if (!cloudFeatures) {
        return false;
    }
    return Boolean(cloudFeatures.webhook ||
        cloudFeatures.schedule ||
        cloudFeatures.telemetry?.enabled);
}
/**
 * Checks if upgrade hints should be suppressed.
 * Respects RELAY_NO_HINTS and RELAY_TELEMETRY environment variables.
 *
 * @returns True if hints should be suppressed
 */
export function shouldSuppressHints() {
    return process.env.RELAY_NO_HINTS === 'true' || process.env.RELAY_TELEMETRY === 'false';
}
/**
 * Prints an upgrade hint to console.
 * Only prints if cloud is not enabled and hints are not suppressed.
 *
 * @param reason - The reason for showing the hint
 * @param context - Optional context-specific information
 */
export function printUpgradeHint(reason, context) {
    // Don't show hints if cloud is already enabled
    if (isCloudEnabled()) {
        return;
    }
    // Respect user preference to suppress hints
    if (shouldSuppressHints()) {
        return;
    }
    const hints = {
        'cloud-feature-needed': getCloudFeatureNeededHint(context),
        'post-run-hint': getPostRunHint(context),
        'debugging-hint': getDebuggingHint(context),
        'npm-install': getNpmInstallHint(),
        'cli-status': getCliStatusHint(context),
    };
    const hint = hints[reason];
    if (hint) {
        console.log('\n' + hint + '\n');
    }
}
/**
 * Moment 1: Cloud Feature Needed
 *
 * Triggered when developer tries to use cloud-only features like
 * .schedule(), .webhook(), or .telemetry().
 */
function getCloudFeatureNeededHint(context) {
    const feature = context?.feature || 'cloud features';
    return `
╭─────────────────────────────────────────────────────────╮
│ Cloud features are disabled in local mode.              │
│                                                          │
│ RelayPlane is local-first, so your workflow will run    │
│ normally — but ${feature.padEnd(38)} │
│ require a cloud account.                                 │
│                                                          │
│ 👉 To enable cloud:                                     │
│    $ npx relay login                                     │
│                                                          │
│ Learn more: https://relayplane.com/cloud                │
╰─────────────────────────────────────────────────────────╯
`.trim();
}
/**
 * Moment 2: Post-Run Hint
 *
 * After workflow.run() completes successfully for multi-step workflows,
 * suggest cloud telemetry for better debugging and run history.
 */
function getPostRunHint(context) {
    const stepCount = context?.stepCount || 'multiple';
    return `
✓ Workflow completed successfully (${stepCount} steps).

Want run history, step-level logs, and model usage tracking?

→ Enable Cloud Telemetry:
   npx relay login

(Your workflow will continue running locally by default.)
`.trim();
}
/**
 * Moment 3: Debugging Hint
 *
 * When workflow throws an error, suggest cloud telemetry for
 * better debugging with step-level logs and replay capability.
 */
function getDebuggingHint(context) {
    const stepName = context?.stepName || 'unknown';
    return `
⚠️  Workflow failed at step "${stepName}".
Local mode shows limited debugging information.

Cloud Telemetry gives:
  ✓ Step-level logs
  ✓ Model inputs/outputs (sanitized)
  ✓ Error traces
  ✓ Replay capability

→ Enable Cloud: npx relay login
`.trim();
}
/**
 * Moment 4: NPM Post-Install
 *
 * Message shown after npm install (via package.json postinstall script).
 */
function getNpmInstallHint() {
    return `
🎉 Thank you for installing @relayplane/workflows!

RelayPlane runs workflows locally for free.
No gateway. No markup. No lock-in.

If you want:
  • Webhooks
  • Cron schedules
  • Run history + debugging
  • Team access

Run:
  npx relay login

Documentation: https://relayplane.com/docs
`.trim();
}
/**
 * Moment 5: CLI Status
 *
 * Shown by `npx relay status` command to inform about optional cloud features.
 */
function getCliStatusHint(context) {
    const workflowCount = context?.workflowCount || 0;
    return `
RelayPlane Status
─────────────────
Mode: Local-only
Cloud: Not connected
Workflows: ${workflowCount} local workflow${workflowCount === 1 ? '' : 's'} detected

Optional Cloud Features:
  • Webhooks
  • Schedules
  • Run History
  • Team Access

Run \`npx relay login\` to enable.
`.trim();
}
/**
 * Checks if a workflow has multiple steps (complexity indicator).
 *
 * @param stepCount - Number of steps in workflow
 * @returns True if workflow is multi-step (>= 2 steps)
 */
export function hasMultipleSteps(stepCount) {
    return stepCount >= 2;
}
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
export function shouldShowPostRunHint(result, stepCount) {
    return (result.success &&
        hasMultipleSteps(stepCount) &&
        !isCloudEnabled() &&
        !shouldSuppressHints());
}
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
export function shouldShowDebuggingHint(result) {
    return (!result.success &&
        !isCloudEnabled() &&
        !shouldSuppressHints());
}
/**
 * Anonymous telemetry capture for understanding usage patterns.
 * Only captures if telemetry is enabled and anonymizes all data.
 *
 * @param _event - Event name (unused - reserved for future)
 * @param _properties - Event properties (unused - reserved for future)
 */
export function captureAnonymousTelemetry(_event, _properties) {
    // Only capture if telemetry is not explicitly disabled
    if (process.env.RELAY_TELEMETRY === 'false') {
        return;
    }
    // TODO: Implement anonymous telemetry capture
    // This would send anonymized usage data to help improve the SDK
    // Examples: workflow_run, step_count, providers_used, etc.
}
/**
 * Checks if a feature requires cloud access.
 *
 * @param feature - Feature name
 * @returns True if feature requires cloud
 */
export function isCloudOnlyFeature(feature) {
    const cloudOnlyFeatures = ['webhook', 'schedule', 'telemetry', 'team', 'replay'];
    return cloudOnlyFeatures.includes(feature.toLowerCase());
}
/**
 * Returns a helpful error message for cloud-only features.
 *
 * @param feature - Feature name
 * @returns Error message with upgrade instructions
 */
export function getCloudFeatureError(feature) {
    return `${feature} is a cloud-only feature. Please run "npx relay login" to enable cloud features.`;
}
//# sourceMappingURL=v3-upgrade-hints.js.map