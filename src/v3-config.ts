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

import type { GlobalConfig, Policy, ProviderConfig, RunOptions } from './v3-types';
import { SDKTelemetryClient } from './telemetry/client';

/**
 * Check if we're running in a Node.js environment (not browser).
 */
const isNode = typeof process !== 'undefined' && process.versions?.node;

/**
 * Reads the CLI config file to get the access token.
 * CLI stores config at ~/.relay/config.json after `relay login`.
 * Only works in Node.js environments - returns undefined in browser.
 */
function readCliConfig(): { accessToken?: string; teamId?: string } | undefined {
  // Skip in browser environments
  if (!isNode) {
    return undefined;
  }

  try {
    // Use new Function to hide require from bundler static analysis
    // This prevents bundlers from trying to polyfill Node.js built-ins
    const nodeRequire = new Function('return require')();
    const fs = nodeRequire('fs');
    const path = nodeRequire('path');
    const os = nodeRequire('os');

    const configPath = process.env.RELAY_CONFIG_PATH || path.join(os.homedir(), '.relay', 'config.json');
    if (!fs.existsSync(configPath)) {
      return undefined;
    }
    const content = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);
    return config?.cloud;
  } catch {
    return undefined;
  }
}

/**
 * Initialize telemetry from CLI config or environment.
 */
function initTelemetryConfig(): GlobalConfig['telemetry'] {
  // Check for explicit env var first
  const apiKey = process.env.RELAY_API_KEY;
  if (apiKey) {
    return {
      enabled: true,
      apiEndpoint: process.env.RELAY_API_ENDPOINT || 'https://api.relayplane.com/v1/telemetry/logs',
      apiKey,
    };
  }

  // Try to read from CLI config
  const cliConfig = readCliConfig();
  if (cliConfig?.accessToken) {
    return {
      enabled: true,
      apiEndpoint: 'https://api.relayplane.com/v1/telemetry/logs',
      apiKey: cliConfig.accessToken,
    };
  }

  // Telemetry disabled by default
  return { enabled: false };
}

/**
 * Global SDK configuration singleton.
 * Stores provider configurations, telemetry settings, and cloud connection.
 * Auto-initializes telemetry from CLI config or RELAY_API_KEY env var.
 */
let globalConfig: GlobalConfig = {
  providers: {},
  policies: {},
  telemetry: initTelemetryConfig(),
  cloud: {
    enabled: false,
  },
};

/**
 * Standard environment variable names for common providers.
 */
const PROVIDER_ENV_VARS: Record<string, string> = {
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
export function configure(config: GlobalConfig): void {
  // Validate policies if provided
  if (config.policies) {
    for (const [id, policy] of Object.entries(config.policies)) {
      validatePolicyConfig(id, policy);
    }
  }

  // Auto-derive telemetry config from cloud settings if not explicitly provided
  // This allows users to just set cloud.accessToken and get telemetry automatically
  let telemetryConfig = config.telemetry;
  if (!telemetryConfig?.apiKey && config.cloud?.enabled && config.cloud?.accessToken) {
    const cloudTelemetry = (config.cloud as any)?.telemetry;
    telemetryConfig = {
      enabled: cloudTelemetry?.enabled !== false, // Default to enabled if cloud is enabled
      apiEndpoint: config.cloud.apiEndpoint
        ? `${config.cloud.apiEndpoint}/v1/telemetry/logs`
        : 'https://api.relayplane.com/v1/telemetry/logs',
      apiKey: config.cloud.accessToken,
      flushInterval: cloudTelemetry?.flushInterval,
      maxRetries: cloudTelemetry?.maxRetries,
    };
  }

  // Merge with existing config (shallow merge for top-level properties)
  globalConfig = {
    ...globalConfig,
    ...config,
    providers: {
      ...globalConfig.providers,
      ...config.providers,
    },
    policies: {
      ...globalConfig.policies,
      ...config.policies,
    },
    // Use derived telemetry config if available
    telemetry: telemetryConfig || globalConfig.telemetry,
  };
}

/**
 * Gets the current global configuration.
 * Useful for debugging or inspecting the current SDK state.
 *
 * @returns Current global configuration
 */
export function getConfig(): Readonly<GlobalConfig> {
  return Object.freeze({ ...globalConfig });
}

/**
 * Resets global configuration to default state.
 * Primarily useful for testing.
 */
export function resetConfig(): void {
  globalConfig = {
    providers: {},
    policies: {},
    telemetry: {
      enabled: false,
    },
    cloud: {
      enabled: false,
    },
  };
}

// ============================================================================
// Policy Management
// ============================================================================

/**
 * Validates a policy configuration.
 * Throws an error if the policy is invalid.
 *
 * @param id - Policy ID (for error messages)
 * @param policy - Policy configuration to validate
 * @throws Error if policy is invalid
 */
function validatePolicyConfig(id: string, policy: Policy): void {
  if (!policy.model) {
    throw new Error(`Policy "${id}" must specify a model (e.g., "openai:gpt-4o")`);
  }

  // Validate model format (provider:model)
  if (!policy.model.includes(':')) {
    throw new Error(
      `Policy "${id}" model must be in format "provider:model" (got "${policy.model}")`
    );
  }

  // Validate fallback format if provided
  if (policy.fallback) {
    for (const fallback of policy.fallback) {
      if (!fallback.includes(':')) {
        throw new Error(
          `Policy "${id}" fallback must be in format "provider:model" (got "${fallback}")`
        );
      }
    }
  }

  // Validate cost caps if provided
  if (policy.costCaps) {
    if (policy.costCaps.maxCostPerExecution !== undefined && policy.costCaps.maxCostPerExecution < 0) {
      throw new Error(`Policy "${id}" maxCostPerExecution must be non-negative`);
    }
    if (policy.costCaps.maxTokensPerExecution !== undefined && policy.costCaps.maxTokensPerExecution < 1) {
      throw new Error(`Policy "${id}" maxTokensPerExecution must be at least 1`);
    }
  }

  // Validate temperature if provided
  if (policy.temperature !== undefined && (policy.temperature < 0 || policy.temperature > 2)) {
    throw new Error(`Policy "${id}" temperature must be between 0 and 2`);
  }
}

/**
 * Gets a policy by ID.
 *
 * @param policyId - The policy ID to retrieve
 * @returns The policy configuration or undefined if not found
 *
 * @example
 * ```typescript
 * const policy = getPolicy('fast-analysis');
 * if (!policy) {
 *   throw new Error('Policy not found');
 * }
 * console.log(policy.model); // 'openai:gpt-4o'
 * ```
 */
export function getPolicy(policyId: string): Policy | undefined {
  return globalConfig.policies?.[policyId];
}

/**
 * Lists all configured policy IDs.
 *
 * @returns Array of policy IDs
 *
 * @example
 * ```typescript
 * const policyIds = listPolicies();
 * console.log(policyIds); // ['fast-analysis', 'deep-reasoning', 'cost-efficient']
 * ```
 */
export function listPolicies(): string[] {
  return Object.keys(globalConfig.policies || {});
}

/**
 * Gets all configured policies with their full configurations.
 *
 * @returns Record of policy ID to policy configuration
 */
export function getAllPolicies(): Record<string, Policy> {
  return { ...globalConfig.policies };
}

/**
 * Checks if a policy exists.
 *
 * @param policyId - The policy ID to check
 * @returns True if the policy exists
 */
export function hasPolicy(policyId: string): boolean {
  return policyId in (globalConfig.policies || {});
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
export function resolveProviderConfig(
  provider: string,
  runOptions?: RunOptions
): ProviderConfig | undefined {
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
      apiKey: process.env[envVarName]!,
    };
  }

  // Not found in any tier
  return undefined;
}

/**
 * Providers that don't require an API key (local LLMs).
 */
const KEYLESS_PROVIDERS = new Set(['local']);

/**
 * Checks if a provider is configured.
 * Useful for validation before workflow execution.
 *
 * @param provider - Provider name
 * @param runOptions - Optional per-run overrides
 * @returns True if provider has a valid configuration
 */
export function isProviderConfigured(provider: string, runOptions?: RunOptions): boolean {
  // Local providers (Ollama) don't require an API key - they're always "configured"
  if (KEYLESS_PROVIDERS.has(provider)) {
    return true;
  }

  const config = resolveProviderConfig(provider, runOptions);
  return config !== undefined && config.apiKey !== undefined && config.apiKey !== '';
}

/**
 * Gets all configured providers.
 * Combines environment variables and global configuration.
 *
 * @returns Array of provider names that have configuration
 */
export function getConfiguredProviders(): string[] {
  const providers = new Set<string>();

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
export function isCloudEnabled(): boolean {
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
 * Gets telemetry configuration.
 *
 * @returns Telemetry configuration
 */
export function getTelemetryConfig(): GlobalConfig['telemetry'] {
  return globalConfig.telemetry;
}

/**
 * Checks if telemetry is enabled and properly configured.
 *
 * @returns true if telemetry is enabled with endpoint and key
 */
export function isTelemetryEnabled(): boolean {
  const t = globalConfig.telemetry;
  return t?.enabled === true && Boolean(t?.apiEndpoint) && Boolean(t?.apiKey);
}

/**
 * Validates that all required providers for a workflow are configured.
 *
 * @param providers - Array of provider names used in workflow
 * @param runOptions - Optional per-run overrides
 * @throws Error if any provider is not configured
 */
export function validateProvidersConfigured(providers: string[], runOptions?: RunOptions): void {
  const missing: string[] = [];

  for (const provider of providers) {
    if (!isProviderConfigured(provider, runOptions)) {
      missing.push(provider);
    }
  }

  if (missing.length > 0) {
    const envVars = missing.map((p) => PROVIDER_ENV_VARS[p] || `${p.toUpperCase()}_API_KEY`).join(', ');
    throw new Error(
      `Missing API keys for providers: ${missing.join(', ')}. ` +
        `Please set environment variables (${envVars}) or configure via relay.configure().`
    );
  }
}

/**
 * Singleton telemetry client instance.
 * Created lazily on first access.
 */
let telemetryClient: SDKTelemetryClient | undefined;

/**
 * Gets the singleton telemetry client.
 * Creates it if not exists and telemetry is enabled.
 *
 * @returns SDKTelemetryClient if enabled, undefined otherwise
 */
export function getTelemetryClient(): SDKTelemetryClient | undefined {
  // Return cached client
  if (telemetryClient) {
    return telemetryClient;
  }

  // Check if telemetry is enabled
  if (!isTelemetryEnabled()) {
    return undefined;
  }

  // Create new client with current config
  const config = globalConfig.telemetry!;
  telemetryClient = new SDKTelemetryClient({
    enabled: true,
    apiEndpoint: config.apiEndpoint!,
    apiKey: config.apiKey!,
    flushInterval: config.flushInterval,
    maxRetries: config.maxRetries,
  });

  return telemetryClient;
}
