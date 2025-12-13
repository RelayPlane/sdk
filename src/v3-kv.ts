/**
 * RelayPlane SDK v3 - KV Store
 *
 * Client SDK for shared key-value store operations.
 * Provides a simple interface for storing and retrieving data across workflow runs.
 */

import { getConfig } from './v3-config';

export interface KVOptions {
  teamId?: string;
  namespace?: string;
  ttl?: number; // seconds
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
 * Get base URL for KV store API
 */
function getKVBaseUrl(): string {
  const config = getConfig();

  if (!config.cloud?.enabled) {
    throw new Error('Cloud features must be enabled to use KV store. Call relay.configure({ cloud: { enabled: true, accessToken: "..." } })');
  }

  return config.cloud.apiEndpoint || 'https://api.relayplane.com';
}

/**
 * Get headers for KV store requests
 */
function getKVHeaders(): Record<string, string> {
  const config = getConfig();

  if (!config.cloud?.accessToken) {
    throw new Error('Cloud access token is required for KV store operations');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.cloud.accessToken}`,
  };
}

/**
 * Build query parameters
 */
function buildQueryParams(options: KVOptions & { prefix?: string; limit?: number; offset?: number }): string {
  const params = new URLSearchParams();

  if (options.teamId) params.append('teamId', options.teamId);
  if (options.namespace) params.append('namespace', options.namespace);
  if (options.ttl !== undefined) params.append('ttl', String(options.ttl));
  if (options.prefix) params.append('prefix', options.prefix);
  if (options.limit !== undefined) params.append('limit', String(options.limit));
  if (options.offset !== undefined) params.append('offset', String(options.offset));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
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
export async function get<T = any>(key: string, options: KVOptions = {}): Promise<T | null> {
  const baseUrl = getKVBaseUrl();
  const headers = getKVHeaders();
  const queryParams = buildQueryParams(options);

  const response = await fetch(`${baseUrl}/api/kv/${encodeURIComponent(key)}${queryParams}`, {
    method: 'GET',
    headers,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'Failed to get KV value');
  }

  const data = await response.json() as { value: T };
  return data.value as T;
}

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
export async function getWithMetadata(key: string, options: KVOptions = {}): Promise<KVEntry | null> {
  const baseUrl = getKVBaseUrl();
  const headers = getKVHeaders();
  const queryParams = buildQueryParams({ ...options, withMetadata: true } as any);

  const response = await fetch(`${baseUrl}/api/kv/${encodeURIComponent(key)}${queryParams}&withMetadata=true`, {
    method: 'GET',
    headers,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'Failed to get KV entry');
  }

  const data = await response.json() as { key: string; value: any; valueType: string; ttl?: number; expiresAt?: string; createdAt: string; updatedAt: string };
  return {
    key: data.key,
    value: data.value,
    valueType: data.valueType,
    ttl: data.ttl,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

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
export async function set(key: string, value: any, options: KVOptions = {}): Promise<void> {
  const baseUrl = getKVBaseUrl();
  const headers = getKVHeaders();
  const queryParams = buildQueryParams(options);

  // Determine value type
  let valueType: string | undefined;
  if (typeof value === 'object') {
    valueType = 'json';
  } else if (typeof value === 'number') {
    valueType = 'number';
  } else if (typeof value === 'boolean') {
    valueType = 'boolean';
  } else {
    valueType = 'string';
  }

  const response = await fetch(`${baseUrl}/api/kv/${encodeURIComponent(key)}${queryParams}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ value, valueType }),
  });

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'Failed to set KV value');
  }
}

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
export async function del(key: string, options: KVOptions = {}): Promise<boolean> {
  const baseUrl = getKVBaseUrl();
  const headers = getKVHeaders();
  const queryParams = buildQueryParams(options);

  const response = await fetch(`${baseUrl}/api/kv/${encodeURIComponent(key)}${queryParams}`, {
    method: 'DELETE',
    headers,
  });

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'Failed to delete KV value');
  }

  return true;
}

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
export async function list(options: KVOptions & { prefix?: string; limit?: number; offset?: number } = {}): Promise<KVListResult> {
  const baseUrl = getKVBaseUrl();
  const headers = getKVHeaders();
  const queryParams = buildQueryParams(options);

  const response = await fetch(`${baseUrl}/api/kv${queryParams}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'Failed to list KV keys');
  }

  return await response.json() as KVListResult;
}

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
export async function batchSet(entries: KVBatchEntry[], options: KVOptions = {}): Promise<Array<{ key: string; success: boolean; error?: string }>> {
  const baseUrl = getKVBaseUrl();
  const headers = getKVHeaders();
  const queryParams = buildQueryParams(options);

  const response = await fetch(`${baseUrl}/api/kv/batch${queryParams}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ entries }),
  });

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'Failed to batch set KV values');
  }

  const data = await response.json() as { results: Array<{ key: string; success: boolean; error?: string }> };
  return data.results;
}

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
export async function batchGet(keys: string[], options: KVOptions = {}): Promise<Array<{ key: string; value?: any; error?: string }>> {
  const baseUrl = getKVBaseUrl();
  const headers = getKVHeaders();
  const queryParams = buildQueryParams({ ...options, keys: keys.join(',') } as any);

  const response = await fetch(`${baseUrl}/api/kv/batch${queryParams}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || 'Failed to batch get KV values');
  }

  const data = await response.json() as { results: Array<{ key: string; value?: any; error?: string }> };
  return data.results;
}

/**
 * KV store namespace
 */
export const kv = {
  get,
  getWithMetadata,
  set,
  delete: del,
  list,
  batchSet,
  batchGet,
};
