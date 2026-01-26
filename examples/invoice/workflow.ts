/**
 * Invoice Processing Workflow
 *
 * Flagship demo workflow for RelayPlane.
 * Extracts, enriches, and summarizes invoice data from images/PDFs.
 *
 * **Workflow Steps:**
 * 1. **Extract**: Use vision model to extract structured data from invoice image
 * 2. **Enrich**: Add business context (payment terms, risk flags, GL codes)
 * 3. **Summarize**: Create concise 2-3 sentence summary
 *
 * @packageDocumentation
 */

import { relay } from '@relayplane/sdk';
import { InvoiceSchema } from './schema';
import type { Invoice, EnrichedInvoice, InvoiceSummary } from './schema';

/**
 * Invoice Processing Workflow
 *
 * Processes invoice images/PDFs through extraction, enrichment, and summarization.
 *
 * @example
 * ```typescript
 * import { invoiceWorkflow } from './templates/invoice/workflow';
 *
 * const result = await invoiceWorkflow.run({
 *   apiKeys: { openai: process.env.OPENAI_API_KEY },
 *   input: {
 *     imageUrl: 'https://example.com/invoice.png'
 *   }
 * });
 *
 * const extractedInvoice = result.steps.find(s => s.stepName === 'extract')?.output;
 * const enrichment = result.steps.find(s => s.stepName === 'enrich')?.output;
 * const summary = result.steps.find(s => s.stepName === 'summarize')?.output;
 * ```
 */
export const invoiceWorkflow = relay
  .workflow('invoice-processor')

  /**
   * Step 1: Extract
   *
   * Uses GPT-4o (vision) to extract structured invoice data from an image.
   * Supports both image URLs and base64-encoded images.
   */
  .step('extract', {
    schema: InvoiceSchema,
    systemPrompt: `You are an expert at extracting structured data from invoice images.

Analyze the invoice image and extract all relevant information accurately.

Requirements:
- Extract invoice number, dates, vendor info, line items, and totals
- Calculate totals if not explicitly shown
- Use YYYY-MM-DD format for dates
- Include currency if visible
- Be precise with numbers (no rounding unless necessary)

Return the data in the specified JSON format.`,
    metadata: {
      description: 'Extract structured data from invoice image using vision model',
      timeout: 30000, // 30 seconds for vision processing
    },
  })
  .with('openai:gpt-4o')

  /**
   * Step 2: Enrich
   *
   * Adds business intelligence and context to the extracted invoice data.
   * Analyzes payment terms, identifies risk flags, and suggests GL codes.
   */
  .step('enrich', {
    systemPrompt: `You are a financial analyst reviewing invoice data.

Based on this extracted invoice data:
{{extract.output}}

Provide business intelligence analysis including:

1. **Payment Terms Analysis**:
   - Calculate days until due (if invoice date and due date are available)
   - Determine if payment is upcoming, due soon, or overdue
   - Assess payment status

2. **Risk Flags**:
   - Check for potential duplicates (unusual similarity in amounts/vendors)
   - Flag unusual amounts (significantly higher/lower than typical)
   - Identify missing critical information (tax ID, address, etc.)
   - Note if this appears to be a new vendor
   - Any other red flags

3. **Suggested GL Codes**:
   - Suggest general ledger codes for each line item
   - Categorize expenses (e.g., "Office Supplies", "Consulting", "Software")
   - Indicate confidence level (high/medium/low)

4. **Analysis Notes**:
   - Any additional observations or recommendations
   - Suggested next actions

Respond in JSON format with the following structure:
{
  "paymentTerms": {
    "daysUntilDue": number or null,
    "isOverdue": boolean,
    "paymentStatus": "due" | "upcoming" | "overdue"
  },
  "riskFlags": [
    {
      "type": "duplicate" | "unusualAmount" | "newVendor" | "missingInfo" | "other",
      "severity": "low" | "medium" | "high",
      "description": "detailed description"
    }
  ],
  "suggestedGLCodes": [
    {
      "lineItemIndex": number,
      "code": "GL code like 5100",
      "category": "category name",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "analysisNotes": "string with additional insights"
}`,
    metadata: {
      description: 'Add business intelligence and risk analysis to invoice data',
    },
  })
  .with('openai:gpt-4o')
  .depends('extract')

  /**
   * Step 3: Summarize
   *
   * Creates a concise, human-readable summary of the invoice.
   * Combines extraction and enrichment data into actionable insights.
   */
  .step('summarize', {
    systemPrompt: `You are a financial assistant creating invoice summaries.

Based on this invoice information:

**Extracted Data:**
{{extract.output}}

**Enrichment Analysis:**
{{enrich.output}}

Create a concise 2-3 sentence summary that includes:
1. Key invoice details (vendor, amount, date)
2. Most important insights from the enrichment analysis
3. Any recommended actions

The summary should be clear, professional, and actionable.

Respond in JSON format:
{
  "summary": "2-3 sentence summary here",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "actionRequired": "description of any action needed or null"
}`,
    metadata: {
      description: 'Generate concise human-readable summary of invoice',
    },
  })
  .with('openai:gpt-4o')
  .depends('extract', 'enrich');

/**
 * Type-safe helper to extract results from workflow run.
 *
 * @param result - Workflow run result
 * @returns Typed invoice processing results
 */
export function extractInvoiceResults(result: any): {
  invoice: Invoice | null;
  enrichment: EnrichedInvoice | null;
  summary: InvoiceSummary | null;
  success: boolean;
} {
  const extractStep = result.steps.find((s: any) => s.stepName === 'extract');
  const enrichStep = result.steps.find((s: any) => s.stepName === 'enrich');
  const summarizeStep = result.steps.find((s: any) => s.stepName === 'summarize');

  return {
    invoice: extractStep?.success ? extractStep.output : null,
    enrichment: enrichStep?.success ? enrichStep.output : null,
    summary: summarizeStep?.success ? summarizeStep.output : null,
    success: result.success,
  };
}
