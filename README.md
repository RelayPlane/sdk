# @relayplane/sdk

The local-first AI workflow engine. Switch providers without rewriting your app.

[![npm version](https://badge.fury.io/js/@relayplane%2Fsdk.svg)](https://www.npmjs.com/package/@relayplane/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Install

```bash
npm install @relayplane/sdk
```

## Quick Start

```typescript
import { relay } from "@relayplane/sdk";

const result = await relay
  .workflow("content-pipeline")
  .step("draft")
  .with("openai:gpt-4o")
  .prompt("Write a blog post about {{input.topic}}")
  .step("review")
  .with("anthropic:claude-3-5-sonnet-20241022")
  .prompt("Improve this draft for clarity and engagement")
  .depends("draft")
  .run({ topic: "AI workflows" });

console.log(result.steps.review);
```

That's it. Runs locally with your API keys. No gateway. No surprises.

## Switch Providers in One Line

```typescript
// OpenAI
.with("openai:gpt-4o")

// Anthropic
.with("anthropic:claude-3-5-sonnet-20241022")

// Google
.with("google:gemini-1.5-pro")

// xAI
.with("xai:grok-beta")

// Local (Ollama)
.with("local:llama3.2")
```

Same code. Same response format. Change one string.

## Why RelayPlane?

| Without RelayPlane | With RelayPlane |
|-------------------|-----------------|
| Different SDK for each provider | One SDK, every provider |
| Rewrite code to switch models | Change one string |
| Silent model changes break production | Explicit `provider:model` — what you write runs |
| DIY retry, fallback, caching | Built-in reliability |
| Observability is an afterthought | Telemetry from day one |
| Tool calls need separate plumbing | MCP steps native in workflows |

## Complete Example

```typescript
import { relay } from "@relayplane/sdk";
import { z } from "zod";

const InvoiceSchema = z.object({
  invoiceNumber: z.string(),
  vendor: z.string(),
  totalAmount: z.number(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
  })),
});

const result = await relay
  .workflow("invoice-processor")

  // Step 1: Extract structured data (gpt-4o has vision built-in)
  .step("extract", {
    schema: InvoiceSchema,
    systemPrompt: "Extract all invoice fields as structured JSON.",
  })
  .with("openai:gpt-4o")

  // Step 2: Validate with a different model
  .step("validate", {
    systemPrompt: "Verify totals and flag discrepancies.",
  })
  .with("anthropic:claude-3-5-sonnet-20241022")
  .depends("extract")

  // Step 3: Generate summary
  .step("summarize")
  .with("openai:gpt-4o-mini")
  .prompt("Create executive summary for finance approval.")
  .depends("validate")

  .run({ fileUrl: "https://example.com/invoice.pdf" });

console.log(result.steps.extract);   // Typed as InvoiceSchema
console.log(result.steps.summarize);
```

## MCP Tool Integration

Mix AI steps with external tools using the Model Context Protocol:

```typescript
relay.configure({
  mcp: {
    servers: {
      crm: { url: "http://localhost:3100" },
      github: { url: "http://localhost:3101" },
    },
  },
});

const result = await relay
  .workflow("lead-enrichment")

  // AI step: Extract company name
  .step("extract")
  .with("openai:gpt-4o")
  .prompt("Extract the company name from: {{input.email}}")

  // MCP step: Look up in CRM
  .step("lookup")
  .mcp("crm:searchCompany")
  .params({ name: "{{steps.extract.companyName}}" })
  .depends("extract")

  // AI step: Generate personalized outreach
  .step("outreach")
  .with("anthropic:claude-3-5-sonnet-20241022")
  .prompt("Write a personalized email using this CRM data: {{steps.lookup}}")
  .depends("lookup")

  .run({ email: "jane@acme.com" });
```

## Configuration

### Environment Variables (Recommended)

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
XAI_API_KEY=...
```

### Programmatic

```typescript
relay.configure({
  providers: {
    openai: { apiKey: process.env.OPENAI_API_KEY },
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
  },
});
```

### Per-Run Override

```typescript
await relay
  .workflow("example")
  .step("test").with("openai:gpt-4o")
  .run(input, {
    providers: {
      openai: { apiKey: "sk-override-key" },
    },
  });
```

## Supported Providers

| Provider | Example Models | Format |
|----------|----------------|--------|
| **OpenAI** | GPT-4o, GPT-4o-mini | `openai:gpt-4o` |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3.5 Haiku | `anthropic:claude-3-5-sonnet-20241022` |
| **Google** | Gemini 2.0 Flash, Gemini 2.5 Pro | `google:gemini-2.0-flash` |
| **xAI** | Grok Beta | `xai:grok-beta` |
| **Local** | Any Ollama model | `local:llama3.2` |

> **Note:** Use exact model IDs from each provider. RelayPlane passes these directly to provider APIs without modification.

## API Reference

### Workflow Builder

```typescript
relay
  .workflow("name")           // Create workflow
  .step("stepName", config?)  // Add step
  .with("provider:model")     // Set AI model
  .prompt("text")             // Set prompt
  .mcp("server:tool")         // Or use MCP tool
  .params({ ... })            // MCP parameters
  .depends("step1", "step2")  // Declare dependencies
  .webhook("https://...")     // Add webhook (cloud)
  .schedule("0 9 * * *")      // Add schedule (cloud)
  .run(input, options?)       // Execute
```

### Step Config

```typescript
.step("name", {
  schema: ZodSchema,           // Structured output validation
  systemPrompt: "...",         // System prompt
  userPrompt: "...",           // User prompt
  retry: { maxAttempts: 3 },   // Retry config
  metadata: { ... },           // Custom metadata
})
```

### Result

```typescript
const result = await workflow.run(input);

result.success        // boolean
result.steps          // { stepName: output, ... }
result.finalOutput    // Last step's output
result.error          // { message, stepName, cause }
result.metadata       // { workflowName, startTime, endTime, duration }
```

### Error Handling

```typescript
const result = await relay
  .workflow("example")
  .step("process").with("openai:gpt-4o")
  .run(input);

if (!result.success) {
  console.error(`Failed at step: ${result.error.stepName}`);
  console.error(result.error.message);
}
```

### TypeScript: Typed Results with Schemas

```typescript
import { z } from "zod";

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

const result = await relay
  .workflow("extract-user")
  .step("extract", { schema: UserSchema })
  .with("openai:gpt-4o")
  .run({ text: "Contact: John at john@example.com" });

// result.steps.extract is typed as { name: string; email: string }
console.log(result.steps.extract.name);
```

## Cloud Features (Optional)

### Webhooks & Schedules

```typescript
await relay
  .workflow("daily-report")
  .schedule("0 9 * * *")
  .webhook("https://slack.com/webhook/...")
  .step("generate").with("openai:gpt-4o")
  .run(input);
```

### Key-Value Store

```typescript
// Store data across runs
await relay.kv.set("user:settings", { theme: "dark" });
const settings = await relay.kv.get("user:settings");

// With TTL
await relay.kv.set("cache:data", data, { ttl: 3600 });
```

### Backup & Restore

```typescript
const backupId = await relay.backup.create({
  name: "daily-backup",
  includes: { workflows: true, configs: true },
});

await relay.backup.restore({ backupId, mode: "merge" });
```

**Pricing:** Free tier available. Pro ($99/mo) unlocks webhooks & schedules.

## BYOK (Bring Your Own Keys)

RelayPlane never proxies your API calls. Your keys talk directly to providers.

- No markup on API costs
- No usage fees beyond providers
- Your data stays between you and the provider

## CLI

```bash
npx relay login      # Authenticate (optional)
npx relay status     # Check connection
npx relay dashboard  # Open web dashboard
npx relay logout     # Sign out
```

## Links

- [Documentation](https://relayplane.com/docs)
- [Examples](https://relayplane.com/docs/examples)
- [Pricing](https://relayplane.com/#pricing)
- [Dashboard](https://app.relayplane.com)
- [GitHub](https://github.com/relayplane/sdk)

## License

MIT
