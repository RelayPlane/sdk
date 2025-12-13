/**
 * SDK Version Checker
 *
 * Client-side version checking for update notifications.
 * Non-blocking, fails silently, respects user preferences.
 */
export interface VersionCheckResult {
    updateAvailable: boolean;
    latest: string;
    current: string;
    urgency: 'none' | 'optional' | 'recommended' | 'critical';
    message?: string;
    releaseNotes?: string;
}
/**
 * Check for SDK updates
 *
 * Runs once per session, caches results for 24 hours.
 * Non-blocking - fails silently without affecting workflow execution.
 * Respects RELAY_NO_VERSION_CHECK environment variable.
 *
 * @example
 * ```typescript
 * import { checkForUpdates } from '@relayplane/sdk';
 *
 * // Manual check
 * const result = await checkForUpdates();
 * if (result?.updateAvailable) {
 *   console.log(`Update available: ${result.latest}`);
 * }
 * ```
 */
export declare function checkForUpdates(): Promise<VersionCheckResult | null>;
/**
 * Reset the version check state (for testing)
 */
export declare function resetVersionCheck(): void;
//# sourceMappingURL=version-check.d.ts.map