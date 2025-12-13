/**
 * RelayPlane SDK v3 - Global Configuration
 *
 * Manages global SDK configuration including provider API keys,
 * telemetry settings, and cloud connection.
 *
 * Implements three-tier API key resolution:
 * 1. Environment variables (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.)
 * 2. Global configuration via relay.configure()
 * 3. Per-run overrides via .run({ providers: {...} })
 *
 * Auto-detects CLI login token from ~/.relay/config.json for telemetry.
 *
 * @packageDocumentation
 */
import type { GlobalConfig, ProviderConfig, RunOptions } from './v3-types';
import { SDKTelemetryClient } from './telemetry/client';
/**
 * Configures global SDK settings.
 * Provider configurations set here will be used as defaults for all workflow runs.
 *
 * @param config - Global configuration object
 *
 * @example
 * ```typescript
 * import { relay } from '@relayplane/sdk';
 *
 * relay.configure({
 *   providers: {
 *     openai: {
 *       apiKey: process.env.OPENAI_API_KEY!,
 *       baseUrl: 'https://api.openai.com/v1'
 *     },
 *     anthropic: {
 *       apiKey: process.env.ANTHROPIC_API_KEY!
 *     }
 *   },
 *   telemetry: {
 *     enabled: true,
 *     apiEndpoint: 'https://api.relayplane.com/v1/telemetry',
 *     apiKey: process.env.RELAY_API_KEY
 *   }
 * });
 * ```
 */
export declare function configure(config: GlobalConfig): void;
/**
 * Gets the current global configuration.
 * Useful for debugging or inspecting the current SDK state.
 *
 * @returns Current global configuration
 */
export declare function getConfig(): Readonly<GlobalConfig>;
/**
 * Resets global configuration to default state.
 * Primarily useful for testing.
 */
export declare function resetConfig(): void;
/**
 * Resolves provider configuration using three-tier resolution strategy.
 *
 * Resolution order (highest priority first):
 * 1. Per-run override from RunOptions
 * 2. Global configuration from relay.configure()
 * 3. Environment variables (OPENAI_API_KEY, etc.)
 *
 * @param provider - Provider name (e.g., 'openai', 'anthropic')
 * @param runOptions - Optional per-run overrides
 * @returns Provider configuration or undefined if not found
 *
 * @example
 * ```typescript
 * const config = resolveProviderConfig('openai', runOptions);
 * if (!config) {
 *   throw new Error('OpenAI API key not configured');
 * }
 * const apiKey = config.apiKey;
 * ```
 */
export declare function resolveProviderConfig(provider: string, runOptions?: RunOptions): ProviderConfig | undefined;
/**
 * Checks if a provider is configured.
 * Useful for validation before workflow execution.
 *
 * @param provider - Provider name
 * @param runOptions - Optional per-run overrides
 * @returns True if provider has a valid configuration
 */
export declare function isProviderConfigured(provider: string, runOptions?: RunOptions): boolean;
/**
 * Gets all configured providers.
 * Combines environment variables and global configuration.
 *
 * @returns Array of provider names that have configuration
 */
export declare function getConfiguredProviders(): string[];
/**
 * Checks if cloud features are enabled.
 * Cloud features require authentication with RelayPlane Cloud.
 *
 * @returns True if cloud connection is enabled
 */
export declare function isCloudEnabled(): boolean;
/**
 * Gets cloud configuration if available.
 *
 * @returns Cloud configuration or undefined if not connected
 */
export declare function getCloudConfig(): {
    enabled: boolean;
    teamId?: string;
    accessToken?: string;
    apiUrl?: string;
} | undefined;
/**
 * Gets telemetry configuration.
 *
 * @returns Telemetry configuration
 */
export declare function getTelemetryConfig(): GlobalConfig['telemetry'];
/**
 * Checks if telemetry is enabled and properly configured.
 *
 * @returns true if telemetry is enabled with endpoint and key
 */
export declare function isTelemetryEnabled(): boolean;
/**
 * Validates that all required providers for a workflow are configured.
 *
 * @param providers - Array of provider names used in workflow
 * @param runOptions - Optional per-run overrides
 * @throws Error if any provider is not configured
 */
export declare function validateProvidersConfigured(providers: string[], runOptions?: RunOptions): void;
/**
 * Gets the singleton telemetry client.
 * Creates it if not exists and telemetry is enabled.
 *
 * @returns SDKTelemetryClient if enabled, undefined otherwise
 */
export declare function getTelemetryClient(): SDKTelemetryClient | undefined;
//# sourceMappingURL=v3-config.d.ts.map