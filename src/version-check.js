/**
 * SDK Version Checker
 *
 * Client-side version checking for update notifications.
 * Non-blocking, fails silently, respects user preferences.
 */
// Track if we've already checked this session
let hasCheckedThisSession = false;
let cachedResult = null;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
let lastCheckTime = 0;
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
export async function checkForUpdates() {
    // Respect user preference to disable version checks
    if (process.env.RELAY_NO_VERSION_CHECK === 'true') {
        return null;
    }
    // Only check once per session
    if (hasCheckedThisSession) {
        return cachedResult;
    }
    // Check cache duration
    const now = Date.now();
    if (cachedResult && (now - lastCheckTime) < CACHE_DURATION_MS) {
        return cachedResult;
    }
    hasCheckedThisSession = true;
    try {
        // Get current version from package.json
        const currentVersion = getPackageVersion();
        // Fetch latest version info
        const apiHost = process.env.RELAY_API_HOST || 'https://api.relayplane.com';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        const response = await fetch(`${apiHost}/api/v1/version/sdk`, {
            signal: controller.signal,
            headers: {
                'User-Agent': `relayplane-sdk/${currentVersion}`
            }
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        const { latest, urgency, releaseNotes } = data;
        // Compare versions
        const updateAvailable = compareVersions(currentVersion, latest) < 0;
        cachedResult = {
            updateAvailable,
            latest,
            current: currentVersion,
            urgency: updateAvailable ? urgency : 'none',
            releaseNotes
        };
        lastCheckTime = now;
        // Log update notification if available
        if (updateAvailable && shouldShowNotification(urgency)) {
            logUpdateNotification(currentVersion, latest, urgency, releaseNotes);
        }
        return cachedResult;
    }
    catch (_error) {
        // Fail silently - version check should never block workflow execution
        return null;
    }
}
/**
 * Get the current package version
 */
function getPackageVersion() {
    try {
        // Try to get version from package.json
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pkg = require('../package.json');
        return pkg.version || '0.0.0';
    }
    catch {
        return '0.0.0';
    }
}
/**
 * Compare two semver versions
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareVersions(a, b) {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const partA = partsA[i] || 0;
        const partB = partsB[i] || 0;
        if (partA < partB)
            return -1;
        if (partA > partB)
            return 1;
    }
    return 0;
}
/**
 * Determine if we should show a notification based on urgency
 */
function shouldShowNotification(urgency) {
    // Always show for critical updates
    if (urgency === 'critical')
        return true;
    // Show recommended updates unless silenced
    if (urgency === 'recommended' && process.env.RELAY_QUIET_VERSION_CHECK !== 'true') {
        return true;
    }
    // Show optional updates only if verbose
    if (urgency === 'optional' && process.env.RELAY_VERBOSE_VERSION_CHECK === 'true') {
        return true;
    }
    return false;
}
/**
 * Log update notification to console
 */
function logUpdateNotification(current, latest, urgency, releaseNotes) {
    const urgencyLabel = urgency === 'critical'
        ? '\x1b[31m[CRITICAL]\x1b[0m'
        : urgency === 'recommended'
            ? '\x1b[33m[RECOMMENDED]\x1b[0m'
            : '\x1b[34m[OPTIONAL]\x1b[0m';
    console.log(`
╔════════════════════════════════════════════════════════╗
║  RelayPlane SDK update available ${urgencyLabel}
║
║  Current: ${current}
║  Latest:  ${latest}
║
║  Run: npm update @relayplane/sdk
║  ${releaseNotes ? `Notes: ${releaseNotes}` : ''}
╚════════════════════════════════════════════════════════╝
`);
}
/**
 * Reset the version check state (for testing)
 */
export function resetVersionCheck() {
    hasCheckedThisSession = false;
    cachedResult = null;
    lastCheckTime = 0;
}
//# sourceMappingURL=version-check.js.map