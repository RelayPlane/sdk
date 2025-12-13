/**
 * SDK Adapter Executor Tests
 *
 * Tests for the adapter executor bridge.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SDKAdapterExecutor, createAdapterExecutor } from '../src/adapters/executor';
import { AdapterRegistry } from '@relayplane/adapters';
import type { ModelAdapter, AdapterResult } from '@relayplane/engine';

describe('SDKAdapterExecutor', () => {
  let registry: AdapterRegistry;
  let mockAdapter: ModelAdapter;
  let apiKeys: Record<string, string>;

  beforeEach(() => {
    registry = new AdapterRegistry();
    mockAdapter = {
      execute: vi.fn().mockResolvedValue({
        success: true,
        output: { result: 'test output' },
        durationMs: 100,
        tokensIn: 10,
        tokensOut: 20,
      } as AdapterResult),
    };
    apiKeys = {
      openai: 'sk-test-key',
      anthropic: 'sk-ant-test-key',
    };
  });

  describe('Basic Execution', () => {
    it('should create executor', () => {
      const executor = new SDKAdapterExecutor(registry, apiKeys);

      expect(executor).toBeDefined();
    });

    it('should create adapter executor function', () => {
      const executor = new SDKAdapterExecutor(registry, apiKeys);
      const adapterExecutor = executor.createExecutor();

      expect(typeof adapterExecutor).toBe('function');
    });

    it('should execute with valid adapter', async () => {
      registry.register('openai', mockAdapter);

      const executor = new SDKAdapterExecutor(registry, apiKeys);
      const adapterExecutor = executor.createExecutor();

      const result = await adapterExecutor({
        model: 'gpt-4o',
        input: 'test input',
        stepName: 'test-step',
        stepMetadata: { provider: 'openai' },
      });

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ result: 'test output' });
      expect(mockAdapter.execute).toHaveBeenCalledWith({
        model: 'gpt-4o',
        input: 'test input',
        schema: undefined,
        apiKey: 'sk-test-key',
      });
    });

    it('should pass schema to adapter', async () => {
      registry.register('openai', mockAdapter);

      const executor = new SDKAdapterExecutor(registry, apiKeys);
      const adapterExecutor = executor.createExecutor();

      const schema = {
        type: 'object',
        properties: { value: { type: 'number' } },
      };

      await adapterExecutor({
        model: 'gpt-4o',
        input: 'test',
        stepName: 'test',
        stepMetadata: { provider: 'openai' },
        schema,
      });

      expect(mockAdapter.execute).toHaveBeenCalledWith({
        model: 'gpt-4o',
        input: 'test',
        schema,
        apiKey: 'sk-test-key',
      });
    });
  });

  describe('Error Handling', () => {
    it('should return error if provider not in metadata', async () => {
      const executor = new SDKAdapterExecutor(registry, apiKeys);
      const adapterExecutor = executor.createExecutor();

      const result = await adapterExecutor({
        model: 'gpt-4o',
        input: 'test',
        stepName: 'test',
        stepMetadata: {},
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('ValidationError');
      expect(result.error?.message).toContain('provider');
    });

    it('should return error if adapter not registered', async () => {
      const executor = new SDKAdapterExecutor(registry, apiKeys);
      const adapterExecutor = executor.createExecutor();

      const result = await adapterExecutor({
        model: 'gpt-4o',
        input: 'test',
        stepName: 'test',
        stepMetadata: { provider: 'openai' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('ValidationError');
      expect(result.error?.message).toContain('No adapter registered');
    });

    it('should return error if API key not provided', async () => {
      registry.register('google', mockAdapter);

      const executor = new SDKAdapterExecutor(registry, { openai: 'key' });
      const adapterExecutor = executor.createExecutor();

      const result = await adapterExecutor({
        model: 'gemini-1.5-pro',
        input: 'test',
        stepName: 'test',
        stepMetadata: { provider: 'google' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('ValidationError');
      expect(result.error?.message).toContain('No API key provided');
    });

    it('should handle adapter throwing error', async () => {
      const throwingAdapter: ModelAdapter = {
        execute: vi.fn().mockRejectedValue(new Error('API error')),
      };

      registry.register('openai', throwingAdapter);

      const executor = new SDKAdapterExecutor(registry, apiKeys);
      const adapterExecutor = executor.createExecutor();

      const result = await adapterExecutor({
        model: 'gpt-4o',
        input: 'test',
        stepName: 'test',
        stepMetadata: { provider: 'openai' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('API error');
    });
  });

  describe('Error Normalization', () => {
    it('should normalize rate limit errors', async () => {
      const errorAdapter: ModelAdapter = {
        execute: vi.fn().mockRejectedValue(new Error('rate limit exceeded')),
      };

      registry.register('openai', errorAdapter);

      const executor = new SDKAdapterExecutor(registry, apiKeys);
      const adapterExecutor = executor.createExecutor();

      const result = await adapterExecutor({
        model: 'gpt-4o',
        input: 'test',
        stepName: 'test',
        stepMetadata: { provider: 'openai' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('RateLimitError');
      expect(result.error?.recoverable).toBe(true);
    });

    it('should normalize timeout errors', async () => {
      const errorAdapter: ModelAdapter = {
        execute: vi.fn().mockRejectedValue(new Error('timeout occurred')),
      };

      registry.register('openai', errorAdapter);

      const executor = new SDKAdapterExecutor(registry, apiKeys);
      const adapterExecutor = executor.createExecutor();

      const result = await adapterExecutor({
        model: 'gpt-4o',
        input: 'test',
        stepName: 'test',
        stepMetadata: { provider: 'openai' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('TimeoutError');
      expect(result.error?.recoverable).toBe(true);
    });

    it('should normalize authentication errors', async () => {
      const errorAdapter: ModelAdapter = {
        execute: vi.fn().mockRejectedValue(new Error('unauthorized: invalid api key')),
      };

      registry.register('openai', errorAdapter);

      const executor = new SDKAdapterExecutor(registry, apiKeys);
      const adapterExecutor = executor.createExecutor();

      const result = await adapterExecutor({
        model: 'gpt-4o',
        input: 'test',
        stepName: 'test',
        stepMetadata: { provider: 'openai' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('AuthenticationError');
      expect(result.error?.recoverable).toBe(false);
    });

    it('should normalize server errors as recoverable', async () => {
      const errorAdapter: ModelAdapter = {
        execute: vi.fn().mockRejectedValue(new Error('500 Internal Server Error')),
      };

      registry.register('openai', errorAdapter);

      const executor = new SDKAdapterExecutor(registry, apiKeys);
      const adapterExecutor = executor.createExecutor();

      const result = await adapterExecutor({
        model: 'gpt-4o',
        input: 'test',
        stepName: 'test',
        stepMetadata: { provider: 'openai' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('ProviderError');
      expect(result.error?.recoverable).toBe(true);
    });

    it('should handle unknown errors', async () => {
      const errorAdapter: ModelAdapter = {
        execute: vi.fn().mockRejectedValue('string error'),
      };

      registry.register('openai', errorAdapter);

      const executor = new SDKAdapterExecutor(registry, apiKeys);
      const adapterExecutor = executor.createExecutor();

      const result = await adapterExecutor({
        model: 'gpt-4o',
        input: 'test',
        stepName: 'test',
        stepMetadata: { provider: 'openai' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('UnknownError');
      expect(result.error?.message).toBe('string error');
    });

    it('should pass through structured errors', async () => {
      const errorAdapter: ModelAdapter = {
        execute: vi.fn().mockRejectedValue({
          type: 'CustomError',
          message: 'Custom error message',
          recoverable: true,
        }),
      };

      registry.register('openai', errorAdapter);

      const executor = new SDKAdapterExecutor(registry, apiKeys);
      const adapterExecutor = executor.createExecutor();

      const result = await adapterExecutor({
        model: 'gpt-4o',
        input: 'test',
        stepName: 'test',
        stepMetadata: { provider: 'openai' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('CustomError');
      expect(result.error?.message).toBe('Custom error message');
      expect(result.error?.recoverable).toBe(true);
    });
  });

  describe('Multiple Providers', () => {
    it('should route to correct adapter based on provider', async () => {
      const openaiAdapter: ModelAdapter = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          output: { provider: 'openai' },
          durationMs: 100,
        }),
      };

      const anthropicAdapter: ModelAdapter = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          output: { provider: 'anthropic' },
          durationMs: 100,
        }),
      };

      registry.register('openai', openaiAdapter);
      registry.register('anthropic', anthropicAdapter);

      const executor = new SDKAdapterExecutor(registry, apiKeys);
      const adapterExecutor = executor.createExecutor();

      // Execute with OpenAI
      const result1 = await adapterExecutor({
        model: 'gpt-4o',
        input: 'test',
        stepName: 'test1',
        stepMetadata: { provider: 'openai' },
      });

      expect(result1.output).toEqual({ provider: 'openai' });
      expect(openaiAdapter.execute).toHaveBeenCalled();
      expect(anthropicAdapter.execute).not.toHaveBeenCalled();

      // Execute with Anthropic
      const result2 = await adapterExecutor({
        model: 'claude-3-5-sonnet',
        input: 'test',
        stepName: 'test2',
        stepMetadata: { provider: 'anthropic' },
      });

      expect(result2.output).toEqual({ provider: 'anthropic' });
      expect(anthropicAdapter.execute).toHaveBeenCalled();
    });

    it('should use correct API key for each provider', async () => {
      registry.register('openai', mockAdapter);
      registry.register('anthropic', mockAdapter);

      const executor = new SDKAdapterExecutor(registry, {
        openai: 'openai-key',
        anthropic: 'anthropic-key',
      });
      const adapterExecutor = executor.createExecutor();

      // Execute with OpenAI
      await adapterExecutor({
        model: 'gpt-4o',
        input: 'test',
        stepName: 'test1',
        stepMetadata: { provider: 'openai' },
      });

      expect(mockAdapter.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'openai-key',
        })
      );

      // Execute with Anthropic
      await adapterExecutor({
        model: 'claude-3-5-sonnet',
        input: 'test',
        stepName: 'test2',
        stepMetadata: { provider: 'anthropic' },
      });

      expect(mockAdapter.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'anthropic-key',
        })
      );
    });
  });

  describe('Helper Function', () => {
    it('should create executor via helper function', () => {
      registry.register('openai', mockAdapter);

      const adapterExecutor = createAdapterExecutor(registry, apiKeys);

      expect(typeof adapterExecutor).toBe('function');
    });

    it('should execute via helper function', async () => {
      registry.register('openai', mockAdapter);

      const adapterExecutor = createAdapterExecutor(registry, apiKeys);

      const result = await adapterExecutor({
        model: 'gpt-4o',
        input: 'test',
        stepName: 'test',
        stepMetadata: { provider: 'openai' },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Duration Tracking', () => {
    it('should track duration for validation errors', async () => {
      const executor = new SDKAdapterExecutor(registry, apiKeys);
      const adapterExecutor = executor.createExecutor();

      const result = await adapterExecutor({
        model: 'gpt-4o',
        input: 'test',
        stepName: 'test',
        stepMetadata: {},
      });

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should track duration for execution errors', async () => {
      const errorAdapter: ModelAdapter = {
        execute: vi.fn().mockRejectedValue(new Error('test error')),
      };

      registry.register('openai', errorAdapter);

      const executor = new SDKAdapterExecutor(registry, apiKeys);
      const adapterExecutor = executor.createExecutor();

      const result = await adapterExecutor({
        model: 'gpt-4o',
        input: 'test',
        stepName: 'test',
        stepMetadata: { provider: 'openai' },
      });

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
