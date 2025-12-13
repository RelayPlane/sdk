/**
 * Remote Workflow Configuration
 *
 * Fetch and execute workflows stored in RelayPlane Cloud.
 */

import { createWorkflow } from './v3-builder';
import type { WorkflowBuilder } from './v3-types';
import { getConfig } from './v3-config';

export interface RemoteWorkflowConfig {
  name: string;
  description?: string;
  version: number;
  config: {
    steps: Array<{
      name: string;
      model?: string;
      mcpTool?: string;
      mcpParams?: Record<string, any>;
      config?: Record<string, any>;
      dependsOn?: string[];
    }>;
  };
}

/**
 * Fetch remote workflow configuration from cloud
 */
async function fetchRemoteConfig(
  workflowName: string,
  version?: number
): Promise<RemoteWorkflowConfig> {
  const globalConfig = getConfig();

  if (!globalConfig.cloud?.enabled) {
    throw new Error(
      'Cloud features not enabled. Call relay.configure({ cloud: { enabled: true, accessToken: "..." } })'
    );
  }

  const apiEndpoint = globalConfig.cloud.apiEndpoint || 'https://api.relayplane.com';
  const accessToken = globalConfig.cloud.accessToken;

  if (!accessToken) {
    throw new Error('Cloud access token required. Set in relay.configure({ cloud: { accessToken: "..." } })');
  }

  // Build URL
  const url = version
    ? `${apiEndpoint}/api/remote-configs/${workflowName}/versions/${version}`
    : `${apiEndpoint}/api/remote-configs/${workflowName}`;

  // Fetch config
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Workflow "${workflowName}" not found in cloud`);
    }
    throw new Error(`Failed to fetch remote workflow: ${response.statusText}`);
  }

  return await response.json() as RemoteWorkflowConfig;
}

/**
 * Build workflow from remote configuration
 */
function buildFromRemoteConfig(remoteConfig: RemoteWorkflowConfig): WorkflowBuilder {
  let builder: any = createWorkflow(remoteConfig.name);

  for (const step of remoteConfig.config.steps) {
    // Add step with config
    builder = builder.step(step.name, step.config || {});

    // Add model or MCP tool
    if (step.model) {
      builder = builder.with(step.model);
    } else if (step.mcpTool) {
      builder = builder.mcp(step.mcpTool);
      if (step.mcpParams) {
        builder = builder.params(step.mcpParams);
      }
    } else {
      throw new Error(`Step "${step.name}" must have either model or mcpTool`);
    }

    // Add dependencies
    if (step.dependsOn && step.dependsOn.length > 0) {
      builder = builder.depends(...step.dependsOn);
    }
  }

  return builder;
}

/**
 * Use a remote workflow configuration
 *
 * Fetches workflow definition from RelayPlane Cloud and returns a builder.
 *
 * @param workflowName - Name of the remote workflow
 * @param options - Optional configuration
 * @returns Workflow builder configured from cloud
 *
 * @example
 * ```typescript
 * // Configure cloud connection
 * relay.configure({
 *   cloud: {
 *     enabled: true,
 *     accessToken: process.env.RELAYPLANE_TOKEN!
 *   }
 * });
 *
 * // Use remote workflow
 * const result = await relay
 *   .useRemote('invoice-processor')
 *   .run({ fileUrl: 'https://example.com/invoice.pdf' });
 * ```
 */
export async function useRemote(
  workflowName: string,
  options?: {
    version?: number;
    cache?: boolean;
  }
): Promise<WorkflowBuilder> {
  try {
    // Fetch remote configuration
    const remoteConfig = await fetchRemoteConfig(workflowName, options?.version);

    // Build workflow from config
    const builder = buildFromRemoteConfig(remoteConfig);

    console.log(`[RemoteWorkflow] Loaded "${workflowName}" (v${remoteConfig.version}) from cloud`);

    return builder;
  } catch (error) {
    console.error('[RemoteWorkflow] Failed to load remote workflow:', error);
    throw error;
  }
}

/**
 * Save workflow configuration to cloud
 *
 * @param workflowName - Name for the workflow
 * @param config - Workflow configuration
 * @returns Created config metadata
 */
export async function saveRemote(
  workflowName: string,
  config: {
    description?: string;
    steps: Array<{
      name: string;
      model?: string;
      mcpTool?: string;
      mcpParams?: Record<string, any>;
      config?: Record<string, any>;
      dependsOn?: string[];
    }>;
  }
): Promise<{ id: string; name: string; version: number }> {
  const globalConfig = getConfig();

  if (!globalConfig.cloud?.enabled) {
    throw new Error('Cloud features not enabled');
  }

  const apiEndpoint = globalConfig.cloud.apiEndpoint || 'https://api.relayplane.com';
  const accessToken = globalConfig.cloud.accessToken;

  if (!accessToken) {
    throw new Error('Cloud access token required');
  }

  const response = await fetch(`${apiEndpoint}/api/remote-configs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: workflowName,
      description: config.description,
      config: { steps: config.steps },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save remote workflow: ${response.statusText}`);
  }

  const result = await response.json() as { id: string; name: string; version: number };
  console.log(`[RemoteWorkflow] Saved "${workflowName}" (v${result.version}) to cloud`);

  return result;
}

/**
 * Delete remote workflow configuration
 */
export async function deleteRemote(workflowName: string): Promise<void> {
  const globalConfig = getConfig();

  if (!globalConfig.cloud?.enabled) {
    throw new Error('Cloud features not enabled');
  }

  const apiEndpoint = globalConfig.cloud.apiEndpoint || 'https://api.relayplane.com';
  const accessToken = globalConfig.cloud.accessToken;

  if (!accessToken) {
    throw new Error('Cloud access token required');
  }

  const response = await fetch(`${apiEndpoint}/api/remote-configs/${workflowName}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete remote workflow: ${response.statusText}`);
  }

  console.log(`[RemoteWorkflow] Deleted "${workflowName}" from cloud`);
}
