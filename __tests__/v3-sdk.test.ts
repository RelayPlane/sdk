/**
 * SDK v3 Tests
 *
 * Tests for the v3 fluent builder API, type safety, and configuration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { relay, configure, resetConfig } from '../src/index';

describe('SDK v3', () => {
  beforeEach(() => {
    // Reset config before each test
    resetConfig();
  });

  describe('Configuration', () => {
    it('should configure providers globally', () => {
      configure({
        providers: {
          openai: {
            apiKey: 'test-key',
          },
        },
      });

      const config = relay.getConfig();
      expect(config.providers?.openai?.apiKey).toBe('test-key');
    });

    it('should reset configuration', () => {
      configure({
        providers: {
          openai: {
            apiKey: 'test-key',
          },
        },
      });

      resetConfig();

      const config = relay.getConfig();
      expect(config.providers).toEqual({});
    });
  });

  describe('Workflow Builder', () => {
    it('should create a workflow builder', () => {
      const workflow = relay.workflow('test-workflow');
      expect(workflow).toBeDefined();
      expect(workflow.step).toBeDefined();
    });

    it('should build a workflow with steps', () => {
      const workflow = relay
        .workflow('test-workflow')
        .step('step1', {
          systemPrompt: 'Test prompt',
        })
        .with('openai:gpt-4o');

      expect(workflow).toBeDefined();
    });

    it('should build a workflow with dependencies', () => {
      const workflow = relay
        .workflow('test-workflow')
        .step('step1', {
          systemPrompt: 'First step',
        })
        .with('openai:gpt-4o')
        .step('step2', {
          systemPrompt: 'Second step',
        })
        .with('anthropic:claude-3.5-sonnet')
        .depends('step1');

      expect(workflow).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should enforce step names in dependencies', () => {
      // This test verifies that TypeScript compilation succeeds
      // If there's a type error, the build will fail
      const workflow = relay
        .workflow('test-workflow')
        .step('extract')
        .with('openai:gpt-4o')
        .step('summarize')
        .with('anthropic:claude-3.5-sonnet')
        .depends('extract'); // Type-safe: 'extract' is available

      expect(workflow).toBeDefined();
    });
  });

  describe('Cloud Features', () => {
    it('should accept webhook configuration', () => {
      const workflow = relay
        .workflow('test-workflow')
        .step('step1')
        .with('openai:gpt-4o')
        .webhook('https://example.com/hook');

      expect(workflow).toBeDefined();
    });

    it('should accept schedule configuration', () => {
      const workflow = relay
        .workflow('test-workflow')
        .step('step1')
        .with('openai:gpt-4o')
        .schedule('0 9 * * *');

      expect(workflow).toBeDefined();
    });
  });
});
