/**
 * SDK Tests - V3 API
 *
 * Tests for the RelayPlane SDK V3 fluent builder API.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { relay } from '../src/index';

describe('V3 Workflow Builder', () => {
  beforeEach(() => {
    relay.resetConfig();
  });

  describe('Basic Workflow Creation', () => {
    it('should create a workflow with relay.workflow()', () => {
      const workflow = relay.workflow('test-workflow');
      expect(workflow).toBeDefined();
    });

    it('should create a step with .step()', () => {
      const step = relay.workflow('test').step('analyze');
      expect(step).toBeDefined();
    });

    it('should configure model with .with()', () => {
      const step = relay
        .workflow('test')
        .step('analyze')
        .with('openai:gpt-4o');

      expect(step).toBeDefined();
    });
  });

  describe('Step Configuration', () => {
    it('should set system prompt with config', () => {
      const step = relay
        .workflow('test')
        .step('analyze', {
          systemPrompt: 'Analyze the input',
        })
        .with('openai:gpt-4o');

      expect(step).toBeDefined();
    });

    it('should set schema with config', () => {
      const schema = {
        type: 'object',
        properties: {
          result: { type: 'string' },
        },
      };

      const step = relay
        .workflow('test')
        .step('extract', { schema })
        .with('openai:gpt-4o');

      expect(step).toBeDefined();
    });

    it('should set dependencies with .depends()', () => {
      const step = relay
        .workflow('test')
        .step('first')
        .with('openai:gpt-4o')
        .step('second')
        .with('anthropic:claude-3.5-sonnet')
        .depends('first');

      expect(step).toBeDefined();
    });
  });

  describe('Multi-Step Workflows', () => {
    it('should chain multiple steps', () => {
      const workflow = relay
        .workflow('multi-step')
        .step('extract')
        .with('openai:gpt-4o')
        .step('transform')
        .with('openai:gpt-4o')
        .depends('extract')
        .step('load')
        .with('anthropic:claude-3.5-sonnet')
        .depends('transform');

      expect(workflow).toBeDefined();
    });

    it('should support parallel branches', () => {
      const workflow = relay
        .workflow('parallel')
        .step('init')
        .with('openai:gpt-4o')
        .step('branch-a')
        .with('openai:gpt-4o')
        .depends('init')
        .step('branch-b')
        .with('anthropic:claude-3.5-sonnet')
        .depends('init');

      expect(workflow).toBeDefined();
    });
  });

  describe('Cloud Features', () => {
    it('should configure webhook', () => {
      const workflow = relay
        .workflow('webhook-test')
        .webhook('/api/process')
        .step('process')
        .with('openai:gpt-4o');

      expect(workflow).toBeDefined();
    });

    it('should configure schedule', () => {
      const workflow = relay
        .workflow('scheduled')
        .schedule('0 9 * * *', { timezone: 'America/New_York' })
        .step('report')
        .with('openai:gpt-4o');

      expect(workflow).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should configure providers', () => {
      relay.configure({
        providers: {
          openai: { apiKey: 'test-key' },
        },
      });

      const config = relay.getConfig();
      expect(config).toBeDefined();
      expect(config?.providers.openai).toBeDefined();
    });

    it('should reset configuration', () => {
      relay.configure({
        providers: {
          openai: { apiKey: 'test-key' },
        },
      });

      relay.resetConfig();
      const config = relay.getConfig();
      // After reset, providers should be empty
      expect(config?.providers).toEqual({});
    });
  });
});
