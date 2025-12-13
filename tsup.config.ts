import { defineConfig, Options } from 'tsup';

const commonOptions: Options = {
  entry: ['src/index.ts'],
  dts: false, // Using tsc for more accurate DTS generation
  sourcemap: true,
  clean: true,
  shims: true,
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
    'zod'
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
    banner: {
      js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
    },
  },
]);
