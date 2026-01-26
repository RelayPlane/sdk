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
