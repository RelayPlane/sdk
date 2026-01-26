# RelayPlane Quickstart

The simplest possible RelayPlane workflow - perfect for testing your setup.

## Installation

```bash
npm install @relayplane/sdk
```

## Usage

```typescript
import { relay } from '@relayplane/sdk';

relay.configure({
  providers: {
    openai: { apiKey: process.env.OPENAI_API_KEY },
  },
});

const result = await relay
  .workflow('hello-world')
  .step('greet')
  .with('openai:gpt-4o')
  .prompt('Say hello in a friendly way')
  .run();

console.log(result.output);
```

## Run This Example

```bash
# Install dependencies
npm install

# Set your API key
export OPENAI_API_KEY="sk-..."

# Run
npm start
```

## What's Next?

- [Invoice Example](../invoice) - Multi-step pipeline with vision models
- [Full Documentation](../../README.md) - Complete API reference

## Need Help?

- [GitHub Issues](https://github.com/RelayPlane/sdk/issues)
