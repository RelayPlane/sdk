/**
 * RelayPlane SDK v3 - Backup & Restore
 *
 * Client SDK for cloud backup and restore operations.
 */

import { getConfig } from './v3-config';

export interface BackupOptions {
  teamId?: string;
  name: string;
  description?: string;
  includes?: {
    workflows?: boolean;
    agents?: boolean;
    configs?: boolean;
    kv?: boolean;
  };
}

export interface RestoreOptions {
  teamId?: string;
  backupId: string;
  mode?: 'merge' | 'replace' | 'selective';
  selectedItems?: {
    workflows?: string[];
    agents?: string[];
    configs?: string[];
  };
  conflictResolution?: 'skip' | 'overwrite' | 'rename';
}

export interface ListBackupsOptions {
  teamId?: string;
  limit?: number;
  offset?: number;
}

export interface Backup {
  id: string;
  name: string;
  description?: string;
  backupType: string;
  sizeBytes: number;
  itemCounts: Record<string, number>;
  status: string;
  createdAt: Date;
}

/**
 * Get base URL for backup API
 */
function getBackupBaseUrl(): string {
  const config = getConfig();

  if (!config.cloud?.enabled) {
    throw new Error('Cloud features must be enabled for backup operations. Call relay.configure({ cloud: { enabled: true, accessToken: "..." } })');
  }

  return config.cloud.apiEndpoint || 'https://api.relayplane.com';
}

/**
 * Get headers for backup requests
 */
function getBackupHeaders(): Record<string, string> {
  const config = getConfig();

  if (!config.cloud?.accessToken) {
    throw new Error('Cloud access token is required for backup operations');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.cloud.accessToken}`,
  };
}

/**
 * Create a backup
 *
 * @param options - Backup configuration
 * @returns Promise resolving to backup ID
 *
 * @example
 * ```typescript
 * const backupId = await relay.backup.create({
 *   name: 'daily-backup',
 *   description: 'Automated daily backup',
 *   includes: { workflows: true, agents: true, configs: true }
 * });
 * ```
 */
export async function create(options: BackupOptions): Promise<string> {
  const baseUrl = getBackupBaseUrl();
  const headers = getBackupHeaders();

  const response = await fetch(`${baseUrl}/api/backups`, {
    method: 'POST',
    headers,
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'Failed to create backup');
  }

  const data = await response.json() as { backupId: string };
  return data.backupId;
}

/**
 * Restore from a backup
 *
 * @param options - Restore configuration
 * @returns Promise resolving to restore ID
 *
 * @example
 * ```typescript
 * const restoreId = await relay.backup.restore({
 *   backupId: 'backup-123',
 *   mode: 'merge',
 *   conflictResolution: 'skip'
 * });
 * ```
 */
export async function restore(options: RestoreOptions): Promise<string> {
  const baseUrl = getBackupBaseUrl();
  const headers = getBackupHeaders();

  const { backupId, ...restoreOptions } = options;

  const response = await fetch(`${baseUrl}/api/backups/${backupId}/restore`, {
    method: 'POST',
    headers,
    body: JSON.stringify(restoreOptions),
  });

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'Failed to restore backup');
  }

  const data = await response.json() as { restoreId: string };
  return data.restoreId;
}

/**
 * List backups
 *
 * @param options - Optional filtering and pagination
 * @returns Promise resolving to list of backups
 *
 * @example
 * ```typescript
 * const { backups, total } = await relay.backup.list({
 *   limit: 20,
 *   offset: 0
 * });
 * ```
 */
export async function list(options: ListBackupsOptions = {}): Promise<{ backups: Backup[]; total: number }> {
  const baseUrl = getBackupBaseUrl();
  const headers = getBackupHeaders();

  const params = new URLSearchParams();
  if (options.teamId) params.append('teamId', options.teamId);
  if (options.limit !== undefined) params.append('limit', String(options.limit));
  if (options.offset !== undefined) params.append('offset', String(options.offset));

  const queryString = params.toString();
  const url = `${baseUrl}/api/backups${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'Failed to list backups');
  }

  const data = await response.json() as { backups: any[]; total: number };

  return {
    backups: data.backups.map((b: any) => ({
      ...b,
      createdAt: new Date(b.created_at),
    })),
    total: data.total,
  };
}

/**
 * Delete a backup
 *
 * @param backupId - The backup ID to delete
 *
 * @example
 * ```typescript
 * await relay.backup.delete('backup-123');
 * ```
 */
export async function deleteBackup(backupId: string): Promise<void> {
  const baseUrl = getBackupBaseUrl();
  const headers = getBackupHeaders();

  const response = await fetch(`${baseUrl}/api/backups/${backupId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'Failed to delete backup');
  }
}

/**
 * Backup namespace
 */
export const backup = {
  create,
  restore,
  list,
  delete: deleteBackup,
};
