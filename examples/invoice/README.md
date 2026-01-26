# Invoice Processing Workflow

Flagship demo workflow for RelayPlane. Extracts, enriches, and summarizes invoice data from images or PDFs using vision models.

## Features

- **Extract**: Structured data extraction from invoice images using GPT-4o vision
- **Enrich**: Business intelligence analysis (payment terms, risk flags, GL codes)
- **Summarize**: Concise human-readable summary with actionable insights

## Quick Start

### Installation

```bash
# Install dependencies (from repo root)
pnpm install
pnpm build
```

### Usage

```typescript
import { invoiceWorkflow } from './templates/invoice/workflow';

const result = await invoiceWorkflow.run({
  apiKeys: {
    openai: process.env.OPENAI_API_KEY,
  },
  input: {
    imageUrl: 'https://example.com/invoice.png',
  },
});

console.log('Invoice:', result.steps[0].output);
console.log('Enrichment:', result.steps[1].output);
console.log('Summary:', result.steps[2].output);
```

### Run Example

```bash
export OPENAI_API_KEY=sk-...
tsx templates/invoice/example.ts
```

## Workflow Steps

### 1. Extract (Vision Model)

Uses GPT-4o to extract structured invoice data from images.

**Input formats supported:**
- Image URL: `{ imageUrl: 'https://...' }`
- Base64: `{ imageUrl: 'data:image/png;base64,...' }`
- Array: `{ images: ['url1', 'url2'] }`
- OpenAI format: `{ content: [{ type: 'image_url', image_url: { url: '...' } }] }`

**Output schema:**
```typescript
{
  invoiceNumber: string;
  invoiceDate?: string;
  dueDate?: string;
  vendor: {
    name: string;
    address?: string;
    taxId?: string;
  };
  lineItems: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
  }>;
  total: number;
  // ... more fields
}
```

### 2. Enrich (Business Intelligence)

Adds financial analysis and business context.

**Analysis includes:**
- Payment terms (days until due, overdue status)
- Risk flags (duplicates, unusual amounts, missing info)
- Suggested GL codes for each line item
- Vendor history and patterns

**Output:**
```typescript
{
  paymentTerms: {
    daysUntilDue: number;
    paymentStatus: 'due' | 'upcoming' | 'overdue';
  };
  riskFlags: Array<{
    type: 'duplicate' | 'unusualAmount' | 'newVendor' | 'missingInfo';
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  suggestedGLCodes: Array<{
    code: string;
    category: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
}
```

### 3. Summarize (Human-Readable)

Creates a concise 2-3 sentence summary with key points and recommended actions.

**Output:**
```typescript
{
  summary: string;
  keyPoints: string[];
  actionRequired?: string;
}
```

## Example Output

```
═══════════════════════════════════════════════════════
📊 EXTRACTION RESULTS
═══════════════════════════════════════════════════════

Invoice Number: INV-2025-001
Date: 2025-01-15
Due Date: 2025-02-14
Vendor: Acme Corporation
Total: USD 6,540.00

Line Items:
  1. Web Development Services - USD 6,000.00
  2. Domain Registration - USD 540.00

═══════════════════════════════════════════════════════
💡 ENRICHMENT ANALYSIS
═══════════════════════════════════════════════════════

Payment Status: upcoming
Days Until Due: 29

⚠️  Risk Flags:
  1. [LOW] New vendor - first invoice from Acme Corporation

📝 Suggested GL Codes:
  Item 1: 5200 - Professional Services (high confidence)
  Item 2: 5100 - Technology Expenses (high confidence)

═══════════════════════════════════════════════════════
📝 SUMMARY
═══════════════════════════════════════════════════════

Invoice INV-2025-001 from Acme Corporation for $6,540.00 is due in 29 days for
web development services and domain registration. This is a new vendor with no
previous payment history. Recommended action: Verify vendor credentials before
processing payment.

Key Points:
  • First invoice from this vendor
  • Payment due February 14, 2025
  • Standard professional services categories
```

## Architecture

### Workflow Definition

The workflow uses RelayPlane's fluent builder API:

```typescript
relay
  .workflow('invoice-processor')
  .step({ name: 'extract', provider: 'openai', model: 'gpt-4o', schema: InvoiceSchema })
  .step({ name: 'enrich', provider: 'openai', model: 'gpt-4o', dependsOn: ['extract'] })
  .step({ name: 'summarize', provider: 'openai', model: 'gpt-4o', dependsOn: ['extract', 'enrich'] });
```

### Dependencies

- Extract → Enrich (sequential)
- Extract, Enrich → Summarize (join pattern)

### Error Handling

The workflow uses RelayPlane's built-in error handling:
- Early abort on step failure
- Detailed error logs for debugging
- Retry logic for transient errors (rate limits, timeouts)

## Testing

Run the test suite:

```bash
cd templates/invoice
pnpm test
```

## Production Considerations

### Vision Model Requirements

- GPT-4o or equivalent vision-enabled model
- Supports image URLs (public or pre-signed)
- Supports base64-encoded images

### Cost Estimation

Per invoice (assuming GPT-4o pricing):
- Extract: ~1,000 input tokens + ~500 output tokens
- Enrich: ~800 input tokens + ~400 output tokens
- Summarize: ~1,200 input tokens + ~200 output tokens
- **Total: ~$0.05-0.10 per invoice** (varies by invoice complexity)

### Performance

- Average workflow duration: 10-15 seconds
- Parallel execution not currently supported (sequential only)
- Vision step is typically the slowest (~5-8s)

### Security

- API keys stored in environment variables
- Invoice images should be on secure infrastructure
- Extracted data may contain sensitive information (PII, financial data)

## Customization

### Custom Providers

Replace OpenAI with Anthropic, xAI, or Local models:

```typescript
.step({
  name: 'extract',
  provider: 'anthropic', // Change provider
  model: 'claude-3-5-sonnet-20241022',
  // ... rest of config
})
```

### Custom Schema

Modify `schema.ts` to extract additional fields:

```typescript
export const InvoiceSchema = {
  type: 'object',
  properties: {
    // ... existing fields
    customField: {
      type: 'string',
      description: 'Your custom field description',
    },
  },
};
```

### Custom Enrichment

Modify the enrichment prompt in `workflow.ts` to add custom analysis logic.

## Support

For issues or questions:
- GitHub: https://github.com/relayplane/relayplane-workflows
- Docs: https://docs.relayplane.com
- Discord: https://discord.gg/relayplane
