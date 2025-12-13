/**
 * Remote Workflow Configuration
 *
 * Fetch and execute workflows stored in RelayPlane Cloud.
 */
import type { WorkflowBuilder } from './v3-types';
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
export declare function useRemote(workflowName: string, options?: {
    version?: number;
    cache?: boolean;
}): Promise<WorkflowBuilder>;
/**
 * Save workflow configuration to cloud
 *
 * @param workflowName - Name for the workflow
 * @param config - Workflow configuration
 * @returns Created config metadata
 */
export declare function saveRemote(workflowName: string, config: {
    description?: string;
    steps: Array<{
        name: string;
        model?: string;
        mcpTool?: string;
        mcpParams?: Record<string, any>;
        config?: Record<string, any>;
        dependsOn?: string[];
    }>;
}): Promise<{
    id: string;
    name: string;
    version: number;
}>;
/**
 * Delete remote workflow configuration
 */
export declare function deleteRemote(workflowName: string): Promise<void>;
//# sourceMappingURL=v3-remote.d.ts.map