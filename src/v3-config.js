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
 * @packageDocumentation
 */
/**
 * Global SDK configuration singleton.
 * Stores provider configurations, telemetry settings, and cloud connection.
 */
let globalConfig = {
    providers: {},
    telemetry: {
        enabled: false,
    },
    cloud: {
        enabled: false,
    },
};
/**
 * Standard environment variable names for common providers.
 */
const PROVIDER_ENV_VARS = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY',
    xai: 'XAI_API_KEY',
    groq: 'GROQ_API_KEY',
    together: 'TOGETHER_API_KEY',
    replicate: 'REPLICATE_API_KEY',
};
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
export function configure(config) {
    // Merge with existing config (shallow merge for top-level properties)
    globalConfig = {
        ...globalConfig,
        ...config,
        providers: {
            ...globalConfig.providers,
            ...config.providers,
        },
    };
}
/**
 * Gets the current global configuration.
 * Useful for debugging or inspecting the current SDK state.
 *
 * @returns Current global configuration
 */
export function getConfig() {
    return Object.freeze({ ...globalConfig });
}
/**
 * Resets global configuration to default state.
 * Primarily useful for testing.
 */
export function resetConfig() {
    globalConfig = {
        providers: {},
        telemetry: {
            enabled: false,
        },
        cloud: {
            enabled: false,
        },
    };
}
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
export function resolveProviderConfig(provider, runOptions) {
    // 1. Check per-run override (highest priority)
    if (runOptions?.providers?.[provider]) {
        return runOptions.providers[provider];
    }
    // 2. Check global configuration
    if (globalConfig.providers?.[provider]) {
        return globalConfig.providers[provider];
    }
    // 3. Check environment variables (lowest priority, but most common)
    const envVarName = PROVIDER_ENV_VARS[provider];
    if (envVarName && process.env[envVarName]) {
        return {
            apiKey: process.env[envVarName],
        };
    }
    // Not found in any tier
    return undefined;
}
/**
 * Checks if a provider is configured.
 * Useful for validation before workflow execution.
 *
 * @param provider - Provider name
 * @param runOptions - Optional per-run overrides
 * @returns True if provider has a valid configuration
 */
export function isProviderConfigured(provider, runOptions) {
    const config = resolveProviderConfig(provider, runOptions);
    return config !== undefined && config.apiKey !== undefined && config.apiKey !== '';
}
/**
 * Gets all configured providers.
 * Combines environment variables and global configuration.
 *
 * @returns Array of provider names that have configuration
 */
export function getConfiguredProviders() {
    const providers = new Set();
    // Add providers from global config
    if (globalConfig.providers) {
        Object.keys(globalConfig.providers).forEach((p) => providers.add(p));
    }
    // Add providers from environment variables
    Object.entries(PROVIDER_ENV_VARS).forEach(([provider, envVar]) => {
        if (process.env[envVar]) {
            providers.add(provider);
        }
    });
    return Array.from(providers);
}
/**
 * Checks if cloud features are enabled.
 * Cloud features require authentication with RelayPlane Cloud.
 *
 * @returns True if cloud connection is enabled
 */
export function isCloudEnabled() {
    return globalConfig.cloud?.enabled === true && Boolean(globalConfig.cloud?.accessToken);
}
/**
 * Gets cloud configuration if available.
 *
 * @returns Cloud configuration or undefined if not connected
 */
export function getCloudConfig() {
    if (!isCloudEnabled()) {
        return undefined;
    }
    return globalConfig.cloud;
}
/**
 * Validates that all required providers for a workflow are configured.
 *
 * @param providers - Array of provider names used in workflow
 * @param runOptions - Optional per-run overrides
 * @throws Error if any provider is not configured
 */
export function validateProvidersConfigured(providers, runOptions) {
    const missing = [];
    for (const provider of providers) {
        if (!isProviderConfigured(provider, runOptions)) {
            missing.push(provider);
        }
    }
    if (missing.length > 0) {
        const envVars = missing.map((p) => PROVIDER_ENV_VARS[p] || `${p.toUpperCase()}_API_KEY`).join(', ');
        throw new Error(`Missing API keys for providers: ${missing.join(', ')}. ` +
            `Please set environment variables (${envVars}) or configure via relay.configure().`);
    }
}
//# sourceMappingURL=v3-config.js.map