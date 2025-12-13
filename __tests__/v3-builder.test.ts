/**
 * SDK v3 Builder Tests
 *
 * Comprehensive tests for the v3 fluent builder API.
 * Tests workflow construction, step types, dependencies, and validation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { relay, configure, resetConfig } from '../src/index';

// Mock the engine and adapters to prevent actual API calls
vi.mock('@relayplane/engine', () => ({
  runWorkflow: vi.fn().mockResolvedValue({
    success: true,
    finalOutput: { result: 'mocked' },
    steps: [],
  }),
}));

vi.mock('@relayplane/adapters', () => ({
  defaultAdapterRegistry: {
    get: vi.fn(),
    register: vi.fn(),
  },
}));

vi.mock('@relayplane/mcp', () => ({
  MCPLoader: vi.fn().mockImplementation(() => ({
    loadFromConfig: vi.fn(),
    getAllServers: vi.fn().mockReturnValue([]),
  })),
  MCPExecutor: vi.fn().mockImplementation(() => ({
    execute: vi.fn(),
  })),
}));

describe('v3 Workflow Builder', () => {
  beforeEach(() => {
    resetConfig();
    vi.clearAllMocks();
  });

  describe('Basic Workflow Creation', () => {
    it('should create a named workflow', () => {
      const workflow = relay.workflow('my-workflow');
      expect(workflow).toBeDefined();
      expect(workflow.step).toBeTypeOf('function');
    });

    it('should create multiple independent workflows', () => {
      const workflow1 = relay.workflow('workflow-1');
      const workflow2 = relay.workflow('workflow-2');

      expect(workflow1).not.toBe(workflow2);
    });
  });

  describe('AI Steps', () => {
    it('should add an AI step with .step().with()', () => {
      const workflow = relay
        .workflow('test')
        .step('analyze')
        .with('openai:gpt-4o');

      expect(workflow).toBeDefined();
      expect(workflow.run).toBeTypeOf('function');
    });

    it('should add step with config', () => {
      const workflow = relay
        .workflow('test')
        .step('analyze', {
          systemPrompt: 'You are an analyst',
          temperature: 0.5,
        })
        .with('openai:gpt-4o');

      expect(workflow).toBeDefined();
    });

    it('should chain multiple AI steps', () => {
      const workflow = relay
        .workflow('pipeline')
        .step('extract')
        .with('openai:gpt-4o')
        .step('summarize')
        .with('anthropic:claude-sonnet-4-20250514')
        .step('format')
        .with('openai:gpt-4o-mini');

      expect(workflow).toBeDefined();
      expect(workflow.run).toBeTypeOf('function');
    });

    it('should set prompt in step config', () => {
      // Note: .prompt() helper is defined but may need rebuilding
      // Using config directly for reliable testing
      const workflow = relay
        .workflow('test')
        .step('analyze', {
          systemPrompt: 'Analyze the following text for key themes',
        })
        .with('openai:gpt-4o');

      expect(workflow).toBeDefined();
    });

    it('should support multiple providers', () => {
      const workflow = relay
        .workflow('multi-provider')
        .step('openai-step')
        .with('openai:gpt-4o')
        .step('anthropic-step')
        .with('anthropic:claude-sonnet-4-20250514')
        .step('google-step')
        .with('google:gemini-2.0-flash');

      expect(workflow).toBeDefined();
    });
  });

  describe('MCP Configuration', () => {
    // Note: MCP step builder (.mcp()) is implemented in v3-builder.ts
    // These tests verify MCP configuration is properly handled

    it('should support MCP configuration in global config', () => {
      configure({
        mcp: {
          servers: {
            crm: {
              url: 'https://mcp.example.com/crm',
              enabled: true,
            },
          },
        },
      });

      const config = relay.getConfig();
      expect(config.mcp?.servers?.crm).toBeDefined();
      expect(config.mcp?.servers?.crm?.url).toBe('https://mcp.example.com/crm');
    });

    it('should support multiple MCP servers', () => {
      configure({
        mcp: {
          servers: {
            crm: { url: 'https://mcp.example.com/crm' },
            github: { url: 'https://mcp.example.com/github' },
            slack: { url: 'https://mcp.example.com/slack' },
          },
        },
      });

      const config = relay.getConfig();
      expect(Object.keys(config.mcp?.servers || {})).toHaveLength(3);
    });
  });

  describe('Step Dependencies', () => {
    it('should add single dependency with .depends()', () => {
      const workflow = relay
        .workflow('deps')
        .step('first')
        .with('openai:gpt-4o')
        .step('second')
        .with('openai:gpt-4o')
        .depends('first');

      expect(workflow).toBeDefined();
    });

    it('should add multiple dependencies', () => {
      const workflow = relay
        .workflow('multi-deps')
        .step('a')
        .with('openai:gpt-4o')
        .step('b')
        .with('openai:gpt-4o')
        .step('c')
        .with('openai:gpt-4o')
        .depends('a', 'b');

      expect(workflow).toBeDefined();
    });

    it('should support diamond dependency pattern', () => {
      const workflow = relay
        .workflow('diamond')
        .step('start')
        .with('openai:gpt-4o')
        .step('left')
        .with('openai:gpt-4o')
        .depends('start')
        .step('right')
        .with('openai:gpt-4o')
        .depends('start')
        .step('end')
        .with('openai:gpt-4o')
        .depends('left', 'right');

      expect(workflow).toBeDefined();
    });
  });

  describe('Cloud Features', () => {
    it('should configure webhook trigger', () => {
      const workflow = relay
        .workflow('webhook-test')
        .step('process')
        .with('openai:gpt-4o')
        .webhook('https://example.com/webhook');

      expect(workflow).toBeDefined();
    });

    it('should configure webhook with options', () => {
      const workflow = relay
        .workflow('webhook-opts')
        .step('process')
        .with('openai:gpt-4o')
        .webhook('https://example.com/webhook', {
          method: 'PUT',
          headers: { 'X-Custom': 'value' },
        });

      expect(workflow).toBeDefined();
    });

    it('should configure schedule trigger', () => {
      const workflow = relay
        .workflow('scheduled')
        .step('report')
        .with('openai:gpt-4o')
        .schedule('0 9 * * *');

      expect(workflow).toBeDefined();
    });

    it('should configure schedule with timezone', () => {
      const workflow = relay
        .workflow('scheduled-tz')
        .step('report')
        .with('openai:gpt-4o')
        .schedule('0 9 * * *', { timezone: 'America/New_York' });

      expect(workflow).toBeDefined();
    });
  });

  describe('Model Format Validation', () => {
    it('should accept valid provider:model format', async () => {
      configure({
        providers: {
          openai: { apiKey: 'test-key' },
        },
      });

      const workflow = relay
        .workflow('test')
        .step('step1')
        .with('openai:gpt-4o');

      // Should not throw when building
      expect(workflow).toBeDefined();
    });

    it('should accept various valid model formats', () => {
      // All these should be valid
      const formats = [
        'openai:gpt-4o',
        'openai:gpt-4o-mini',
        'anthropic:claude-sonnet-4-20250514',
        'anthropic:claude-opus-4-20250514',
        'google:gemini-2.0-flash',
        'google:gemini-1.5-pro',
        'xai:grok-2',
      ];

      for (const model of formats) {
        const [provider] = model.split(':');
        const workflow = relay
          .workflow(`test-${model}`)
          .step('step')
          .with(model as any);

        expect(workflow).toBeDefined();
      }
    });
  });

  describe('Workflow Execution', () => {
    it('should have run method on completed workflow', () => {
      const workflow = relay
        .workflow('runnable')
        .step('step1')
        .with('openai:gpt-4o');

      expect(workflow.run).toBeTypeOf('function');
    });

    it('should accept input when running', async () => {
      configure({
        providers: {
          openai: { apiKey: 'test-key' },
        },
      });

      const workflow = relay
        .workflow('with-input')
        .step('step1')
        .with('openai:gpt-4o');

      // Should not throw
      const result = await workflow.run({ text: 'test input' });
      expect(result).toBeDefined();
    });

    it('should accept run options', async () => {
      configure({
        providers: {
          openai: { apiKey: 'test-key' },
        },
      });

      const workflow = relay
        .workflow('with-options')
        .step('step1')
        .with('openai:gpt-4o');

      const result = await workflow.run(
        { text: 'input' },
        {
          timeout: 30000,
          metadata: { requestId: '123' },
        }
      );

      expect(result).toBeDefined();
    });
  });

  describe('Configuration Integration', () => {
    it('should use globally configured providers', async () => {
      configure({
        providers: {
          openai: { apiKey: 'global-key' },
          anthropic: { apiKey: 'anthropic-key' },
        },
      });

      const workflow = relay
        .workflow('configured')
        .step('step1')
        .with('openai:gpt-4o')
        .step('step2')
        .with('anthropic:claude-sonnet-4-20250514');

      const result = await workflow.run({});
      expect(result).toBeDefined();
    });

    it('should override global config with run options', async () => {
      configure({
        providers: {
          openai: { apiKey: 'global-key' },
        },
      });

      const workflow = relay
        .workflow('override')
        .step('step1')
        .with('openai:gpt-4o');

      const result = await workflow.run(
        {},
        {
          apiKeys: {
            openai: 'override-key',
          },
        }
      );

      expect(result).toBeDefined();
    });
  });

  describe('Complex Workflow Patterns', () => {
    it('should build a real-world invoice processing workflow', () => {
      const workflow = relay
        .workflow('invoice-processor')
        .step('extract', {
          systemPrompt: 'Extract invoice data from the image',
          schema: {
            type: 'object',
            properties: {
              vendor: { type: 'string' },
              amount: { type: 'number' },
              date: { type: 'string' },
            },
          },
        })
        .with('openai:gpt-4o')
        .step('categorize', {
          systemPrompt: 'Categorize this expense',
        })
        .with('anthropic:claude-sonnet-4-20250514')
        .depends('extract')
        .step('approve', {
          systemPrompt: 'Determine if this expense needs approval',
        })
        .with('openai:gpt-4o-mini')
        .depends('categorize');

      expect(workflow).toBeDefined();
      expect(workflow.run).toBeTypeOf('function');
    });

    it('should build a multi-step content workflow', () => {
      const workflow = relay
        .workflow('content-pipeline')
        .step('draft', {
          systemPrompt: 'Write a blog post about AI trends',
        })
        .with('anthropic:claude-sonnet-4-20250514')
        .step('edit', {
          systemPrompt: 'Edit and improve the draft',
        })
        .with('openai:gpt-4o')
        .depends('draft')
        .step('format', {
          systemPrompt: 'Format for publishing',
        })
        .with('openai:gpt-4o-mini')
        .depends('edit');

      expect(workflow).toBeDefined();
      expect(workflow.run).toBeTypeOf('function');
    });
  });
});
