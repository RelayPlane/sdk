/**
 * RelayPlane SDK v3 - KV Store
 *
 * Client SDK for shared key-value store operations.
 * Provides a simple interface for storing and retrieving data across workflow runs.
 */
export interface KVOptions {
    teamId?: string;
    namespace?: string;
    ttl?: number;
}
export interface KVEntry {
    key: string;
    value: any;
    valueType: string;
    ttl?: number;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface KVBatchEntry {
    key: string;
    value: any;
    valueType?: string;
    ttl?: number;
}
export interface KVListResult {
    keys: string[];
    total: number;
}
/**
 * Get a value from the KV store
 *
 * @param key - The key to retrieve
 * @param options - Optional configuration (teamId, namespace)
 * @returns The value or null if not found
 *
 * @example
 * ```typescript
 * const value = await kv.get('user:settings');
 * const teamValue = await kv.get('shared-config', { teamId: 'team-123' });
 * ```
 */
export declare function get<T = any>(key: string, options?: KVOptions): Promise<T | null>;
/**
 * Get a value with metadata from the KV store
 *
 * @param key - The key to retrieve
 * @param options - Optional configuration (teamId, namespace)
 * @returns The entry with metadata or null if not found
 *
 * @example
 * ```typescript
 * const entry = await kv.getWithMetadata('cache:data');
 * console.log(`Expires at: ${entry.expiresAt}`);
 * ```
 */
export declare function getWithMetadata(key: string, options?: KVOptions): Promise<KVEntry | null>;
/**
 * Set a value in the KV store
 *
 * @param key - The key to set
 * @param value - The value to store (will be JSON serialized if object)
 * @param options - Optional configuration (teamId, namespace, ttl)
 *
 * @example
 * ```typescript
 * await kv.set('user:settings', { theme: 'dark' });
 * await kv.set('cache:data', data, { ttl: 3600 }); // 1 hour TTL
 * await kv.set('team:config', config, { teamId: 'team-123' });
 * ```
 */
export declare function set(key: string, value: any, options?: KVOptions): Promise<void>;
/**
 * Delete a value from the KV store
 *
 * @param key - The key to delete
 * @param options - Optional configuration (teamId, namespace)
 * @returns True if deleted, false if not found
 *
 * @example
 * ```typescript
 * await kv.delete('cache:old-data');
 * ```
 */
export declare function del(key: string, options?: KVOptions): Promise<boolean>;
/**
 * List keys in the KV store
 *
 * @param options - Optional configuration (teamId, namespace, prefix, limit, offset)
 * @returns List of keys and total count
 *
 * @example
 * ```typescript
 * const result = await kv.list({ prefix: 'user:' });
 * console.log(`Found ${result.total} keys`);
 * ```
 */
export declare function list(options?: KVOptions & {
    prefix?: string;
    limit?: number;
    offset?: number;
}): Promise<KVListResult>;
/**
 * Batch set multiple key-value pairs
 *
 * @param entries - Array of key-value entries to set
 * @param options - Optional configuration (teamId, namespace, ttl)
 * @returns Array of results for each entry
 *
 * @example
 * ```typescript
 * const results = await kv.batchSet([
 *   { key: 'user:1', value: { name: 'Alice' } },
 *   { key: 'user:2', value: { name: 'Bob' } }
 * ]);
 * ```
 */
export declare function batchSet(entries: KVBatchEntry[], options?: KVOptions): Promise<Array<{
    key: string;
    success: boolean;
    error?: string;
}>>;
/**
 * Batch get multiple keys
 *
 * @param keys - Array of keys to retrieve
 * @param options - Optional configuration (teamId, namespace)
 * @returns Array of results for each key
 *
 * @example
 * ```typescript
 * const results = await kv.batchGet(['user:1', 'user:2', 'user:3']);
 * ```
 */
export declare function batchGet(keys: string[], options?: KVOptions): Promise<Array<{
    key: string;
    value?: any;
    error?: string;
}>>;
/**
 * KV store namespace
 */
export declare const kv: {
    get: typeof get;
    getWithMetadata: typeof getWithMetadata;
    set: typeof set;
    delete: typeof del;
    list: typeof list;
    batchSet: typeof batchSet;
    batchGet: typeof batchGet;
};
//# sourceMappingURL=v3-kv.d.ts.map