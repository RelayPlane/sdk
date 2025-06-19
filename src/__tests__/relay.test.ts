/**
 * Basic tests for relay function
 */

import { relay, configure } from '../index';

describe('relay function', () => {
  test('should be defined', () => {
    expect(relay).toBeDefined();
    expect(typeof relay).toBe('function');
  });

  test('should throw error when missing required fields', async () => {
    await expect(relay({} as any)).rejects.toThrow('Missing required field: to');
  });

  test('should throw error when missing payload', async () => {
    await expect(relay({ to: 'claude-3-sonnet' } as any)).rejects.toThrow('Missing required field: payload');
  });
});

describe('configure function', () => {
  test('should be defined', () => {
    expect(configure).toBeDefined();
    expect(typeof configure).toBe('function');
  });

  test('should accept config without throwing', () => {
    expect(() => configure({ debug: true })).not.toThrow();
  });
}); 