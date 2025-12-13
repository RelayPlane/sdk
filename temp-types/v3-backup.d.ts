/**
 * RelayPlane SDK v3 - Backup & Restore
 *
 * Client SDK for cloud backup and restore operations.
 */
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
export declare function create(options: BackupOptions): Promise<string>;
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
export declare function restore(options: RestoreOptions): Promise<string>;
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
export declare function list(options?: ListBackupsOptions): Promise<{
    backups: Backup[];
    total: number;
}>;
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
export declare function deleteBackup(backupId: string): Promise<void>;
/**
 * Backup namespace
 */
export declare const backup: {
    create: typeof create;
    restore: typeof restore;
    list: typeof list;
    delete: typeof deleteBackup;
};
//# sourceMappingURL=v3-backup.d.ts.map