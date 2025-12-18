import { defineConfig, Options } from 'tsup';

const commonOptions: Options = {
  entry: ['src/index.ts'],
  dts: false, // Using tsc for more accurate DTS generation
  sourcemap: true,
  clean: true,
  shims: false, // Disable shims to avoid createRequire in browser
  noExternal: [
    '@relayplane/engine',
    '@relayplane/adapters',
    '@relayplane/telemetry',
    '@relayplane/mcp'
  ],
  external: [
    '@anthropic-ai/sdk',
    '@google/generative-ai',
    'openai',
    'zod',
    // Mark Node.js built-ins as external to avoid bundling
    'fs',
    'path',
    'os',
    'module',
    'url'
  ],
  splitting: false,
  treeshake: true,
};

export default defineConfig([
  {
    ...commonOptions,
    format: ['cjs'],
    clean: true,
  },
  {
    ...commonOptions,
    format: ['esm'],
    clean: false,
    // No banner needed - we handle require dynamically in the code
  },
]);
