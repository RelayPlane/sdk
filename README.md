# @relayplane/sdk

**Local-first AI workflow engine for building multi-step AI workflows with explicit provider:model selection.**

Build production-ready AI workflows that run locally by default, with optional cloud features like webhooks, schedules, and run history.

[![npm version](https://badge.fury.io/js/@relayplane%2Fsdk.svg)](https://www.npmjs.com/package/@relayplane/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why RelayPlane?

- **Local-First** - Workflows run on your machine using your API keys. No cloud required.
- **Multi-Model** - Chain GPT-4, Claude, Gemini, Groq in a single workflow
- **Explicit Models** - Use `provider:model` format: `openai:gpt-4o`, `anthropic:claude-3.5-sonnet`
- **Type-Safe** - Full TypeScript support with Zod schema validation
- **Dependency Graphs** - Express complex step dependencies with `.depends()`
- **No Gateway Tax** - Direct API calls to providers, no usage fees
- **Optional Cloud** - Add webhooks, schedules, and run history when you need them

## Quick Start

```bash
npm install @relayplane/sdk
```

```typescript
import { relay } from "@relayplane/sdk";

const result = await relay
  .workflow("invoice-processor")
  .step("extract").with("openai:gpt-4o-vision")
  .step("summarize").with("anthropic:claude-3.5-sonnet").depends("extract")
  .run({ fileUrl: "https://example.com/invoice.pdf" });

console.log(result.steps.summarize);
```

That's it! This workflow runs locally with zero configuration beyond API keys.

## Core Concepts

### Fluent Builder API

RelayPlane uses a fluent builder pattern: **step → with → depends → run**

```typescript
relay
  .workflow("workflow-name")
  .step("step-name").with("provider:model")
  .step("step-name").with("provider:model").depends("previous-step")
  .run(input);
```

### Explicit Provider:Model Format

Always specify both provider and model:

```typescript
.with("openai:gpt-4o")           // ✅ Correct
.with("anthropic:claude-3.5-sonnet")  // ✅ Correct
.with("google:gemini-1.5-pro")   // ✅ Correct
.with("gpt-4")                   // ❌ Missing provider
```

### Dependency Graphs

Chain steps with explicit dependencies:

```typescript
relay
  .workflow("pipeline")
  .step("fetch").with("openai:gpt-4o-mini")
  .step("parse").with("openai:gpt-4o").depends("fetch")
  .step("validate").with("anthropic:claude-3.5-sonnet").depends("parse")
  .step("summarize").with("openai:gpt-4o-mini").depends("validate")
  .run(input);
```

Steps execute in dependency order. `parse` waits for `fetch`, `validate` waits for `parse`, etc.

## Complete Example

```typescript
import { relay } from "@relayplane/sdk";
import { z } from "zod";

// Define structured output schema
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

// Build multi-step workflow
const result = await relay
  .workflow("invoice-processor")

  // Step 1: Extract structured data using vision model
  .step("extract", {
    schema: InvoiceSchema,
    systemPrompt: "Extract all invoice fields as structured JSON.",
  })
  .with("openai:gpt-4o-vision")

  // Step 2: Validate using language model
  .step("validate", {
    systemPrompt: "Verify totals and flag discrepancies.",
  })
  .with("anthropic:claude-3.5-sonnet")
  .depends("extract")

  // Step 3: Summarize for approval
  .step("summarize", {
    systemPrompt: "Create executive summary for finance approval.",
  })
  .with("openai:gpt-4o-mini")
  .depends("validate")

  .run({ fileUrl: "https://example.com/invoice.pdf" });

// Access step outputs
console.log(result.steps.extract);   // Typed as InvoiceSchema
console.log(result.steps.validate);
console.log(result.steps.summarize);
```

## API Keys

### Environment Variables (Recommended)

```bash
# .env.local
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
GROQ_API_KEY=gsk-...
```

### Programmatic Configuration

```typescript
import { relay } from "@relayplane/sdk";

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

| Provider | Models | Format |
|----------|---------|--------|
| **OpenAI** | GPT-4, GPT-4 Turbo, GPT-4o, GPT-4o-mini | `openai:gpt-4o` |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3 Opus/Haiku | `anthropic:claude-3.5-sonnet` |
| **Google** | Gemini 1.5 Pro/Flash | `google:gemini-1.5-pro` |
| **Groq** | Llama 3.1, Mixtral | `groq:llama-3.1-70b` |

Full model list: [docs.relayplane.com/providers](https://docs.relayplane.com/providers)

## Cloud Features (Optional)

### Webhooks

Trigger workflows via HTTP:

```bash
npx relay login

curl -X POST https://api.relayplane.com/webhooks/trigger \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"workflowName": "invoice-processor", "input": {...}}'
```

### Schedules

Run workflows on cron schedules:

```typescript
relay
  .workflow("daily-report")
  .schedule("0 9 * * *")  // Every day at 9am
  .step("generate").with("openai:gpt-4o")
  .run(input);
```

### Run History

Track executions with step-by-step logs and token usage:

```bash
npx relay dashboard
```

**Pricing:** Free local mode. Cloud features: $99/mo (Pro), $399/mo (Scale), Enterprise available.

## Use Cases

### Agency & Professional Services
- **Invoice Processing** - Extract data from invoices with GPT-4 Vision
- **Contract Analysis** - Extract key terms from legal documents
- **Proposal Generation** - Auto-generate proposals from RFPs

### Customer Support
- **Ticket Routing** - Classify and route support tickets
- **Reply Generation** - Draft context-aware support responses
- **CSAT Analysis** - Analyze feedback sentiment and themes

### Content & Marketing
- **Content Pipelines** - Research, outline, write, edit workflows
- **SEO Audit** - Analyze pages and generate recommendations
- **Email Digests** - Summarize newsletters and reports

### Data & Analytics
- **Data Enrichment** - Augment records with external data
- **Metrics Summary** - Generate executive dashboards
- **Churn Analysis** - Predict customer churn risk

### Development & Operations
- **Code Review** - Automated PR feedback and suggestions
- **Log Analysis** - Parse and summarize error logs
- **Incident Reports** - Generate post-mortems from incident data

**See 25+ examples:** [docs.relayplane.com/examples](https://docs.relayplane.com/examples)

## Best Practices

### 1. Use Schemas for Structured Output

```typescript
.step("extract", { schema: MySchema })
  .with("openai:gpt-4o")
```

Zod schemas provide type safety and validation.

### 2. Choose Models by Task

- **Complex reasoning:** `openai:gpt-4o`, `anthropic:claude-3.5-sonnet`
- **Vision tasks:** `openai:gpt-4o-vision`
- **Simple tasks:** `openai:gpt-4o-mini` (cheaper, faster)
- **Code:** `anthropic:claude-3.5-sonnet`

### 3. Chain Models for Validation

```typescript
.step("extract").with("openai:gpt-4o")
.step("validate").with("anthropic:claude-3.5-sonnet").depends("extract")
```

Use a second model to verify critical data.

### 4. Handle Errors

```typescript
try {
  const result = await relay.workflow("example")...run(input);
} catch (error) {
  console.error("Workflow failed:", error);
}
```

### 5. Optimize Costs

- Use cheaper models (gpt-4o-mini) for non-critical steps
- Cache results when possible
- Minimize token usage with focused prompts

## CLI Commands

```bash
# Authenticate with RelayPlane Cloud (optional)
npx relay login

# List discovered workflows in project
npx relay workflows

# Check cloud connection status
npx relay status

# Open web dashboard
npx relay dashboard

# Logout from cloud
npx relay logout
```

## TypeScript Support

Full TypeScript support with type inference:

```typescript
const InvoiceSchema = z.object({
  total: z.number(),
});

const result = await relay
  .workflow("example")
  .step("extract", { schema: InvoiceSchema })
  .with("openai:gpt-4o")
  .run(input);

// result.steps.extract is typed as z.infer<typeof InvoiceSchema>
result.steps.extract.total; // ✅ Type-safe
```

## Upgrading from v2

The v3 API uses a fluent builder pattern. Migration guide:

**v2 (deprecated):**
```typescript
const workflow = relay.workflow('name', [
  relay.step({ name: 'step1', model: 'gpt-4o', provider: 'openai' }),
]);
```

**v3 (current):**
```typescript
const result = await relay
  .workflow('name')
  .step('step1').with('openai:gpt-4o')
  .run(input);
```

## Documentation

- **Getting Started:** [docs.relayplane.com/quickstart](https://docs.relayplane.com/quickstart)
- **Examples:** [docs.relayplane.com/examples](https://docs.relayplane.com/examples)
- **API Reference:** [docs.relayplane.com/api](https://docs.relayplane.com/api)
- **Guides:** [docs.relayplane.com/guides](https://docs.relayplane.com/guides)

## Community

- **GitHub:** [github.com/RelayPlane/sdk](https://github.com/RelayPlane/sdk)
- **Discord:** [Join our community](https://discord.gg/relayplane)
- **Twitter:** [@relayplane](https://twitter.com/relayplane)

## License

MIT © RelayPlane

---

**Built with RelayPlane?** Share your workflow on Twitter with #relayplane!
