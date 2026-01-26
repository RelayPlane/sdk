/**
 * Invoice Workflow Example
 *
 * Demonstrates how to run the invoice processing workflow
 * with a sample invoice image.
 *
 * Usage:
 * ```bash
 * OPENAI_API_KEY=sk-... tsx templates/invoice/example.ts
 * ```
 */

import { invoiceWorkflow, extractInvoiceResults } from './workflow';

/**
 * Example: Process a sample invoice
 *
 * This example shows how to:
 * 1. Run the invoice workflow with an image URL
 * 2. Extract typed results
 * 3. Display the results
 */
async function main() {
  console.log('🚀 RelayPlane Invoice Processing Demo\n');

  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is required');
    console.error('   Set it with: export OPENAI_API_KEY=sk-...\n');
    process.exit(1);
  }

  // Sample invoice image URL (you can replace this with your own)
  // This is a placeholder - in a real scenario, you'd provide an actual invoice image
  const sampleInvoiceUrl =
    'https://example.com/sample-invoice.png'; // Replace with actual invoice URL

  // Alternative: Use base64-encoded image
  // const sampleInvoiceBase64 = 'data:image/png;base64,...';

  console.log('📄 Processing invoice...');
  console.log(`   Image URL: ${sampleInvoiceUrl}\n`);

  try {
    // Run the workflow
    const result = await invoiceWorkflow.run({
      apiKeys: {
        openai: apiKey,
      },
      input: {
        imageUrl: sampleInvoiceUrl, // Vision models accept image URLs
        // Alternative formats:
        // image_url: sampleInvoiceUrl,
        // images: [sampleInvoiceUrl],
        // content: [{ type: 'image_url', image_url: { url: sampleInvoiceUrl } }]
      },
    });

    // Check overall success
    if (!result.success) {
      console.error('❌ Workflow failed');
      console.error(`   Error: ${result.steps.find((s) => !s.success)?.error?.message}\n`);
      process.exit(1);
    }

    console.log('✅ Workflow completed successfully!\n');

    // Extract typed results
    const { invoice, enrichment, summary } = extractInvoiceResults(result);

    // Display results
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 EXTRACTION RESULTS');
    console.log('═══════════════════════════════════════════════════════\n');

    if (invoice) {
      console.log('Invoice Number:', invoice.invoiceNumber);
      console.log('Date:', invoice.invoiceDate || 'N/A');
      console.log('Due Date:', invoice.dueDate || 'N/A');
      console.log('Vendor:', invoice.vendor.name);
      console.log('Total:', invoice.currency || 'USD', invoice.total.toFixed(2));
      console.log('\nLine Items:');
      invoice.lineItems.forEach((item, i) => {
        console.log(
          `  ${i + 1}. ${item.description} - ${invoice.currency || 'USD'} ${item.amount.toFixed(2)}`
        );
      });
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('💡 ENRICHMENT ANALYSIS');
    console.log('═══════════════════════════════════════════════════════\n');

    if (enrichment) {
      if (enrichment.paymentTerms) {
        console.log('Payment Status:', enrichment.paymentTerms.paymentStatus);
        if (enrichment.paymentTerms.daysUntilDue !== undefined) {
          console.log('Days Until Due:', enrichment.paymentTerms.daysUntilDue);
        }
      }

      if (enrichment.riskFlags && enrichment.riskFlags.length > 0) {
        console.log('\n⚠️  Risk Flags:');
        enrichment.riskFlags.forEach((flag, i) => {
          console.log(`  ${i + 1}. [${flag.severity.toUpperCase()}] ${flag.description}`);
        });
      }

      if (enrichment.suggestedGLCodes && enrichment.suggestedGLCodes.length > 0) {
        console.log('\n📝 Suggested GL Codes:');
        enrichment.suggestedGLCodes.forEach((gl) => {
          console.log(
            `  Item ${gl.lineItemIndex + 1}: ${gl.code} - ${gl.category} (${gl.confidence} confidence)`
          );
        });
      }

      if (enrichment.analysisNotes) {
        console.log('\n📋 Analysis Notes:');
        console.log(`  ${enrichment.analysisNotes}`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📝 SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    if (summary) {
      console.log(summary.summary);

      if (summary.keyPoints && summary.keyPoints.length > 0) {
        console.log('\nKey Points:');
        summary.keyPoints.forEach((point, i) => {
          console.log(`  • ${point}`);
        });
      }

      if (summary.actionRequired) {
        console.log('\n⚡ Action Required:');
        console.log(`  ${summary.actionRequired}`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📈 EXECUTION METRICS');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('Workflow:', result.workflowName);
    console.log('Run ID:', result.runId);
    console.log('Duration:', Math.round((new Date(result.finishedAt).getTime() - new Date(result.startedAt).getTime()) / 1000), 'seconds');
    console.log('\nSteps:');
    result.steps.forEach((step) => {
      const status = step.success ? '✓' : '✗';
      const duration = step.durationMs ? `${step.durationMs}ms` : 'N/A';
      const tokens = step.tokensIn && step.tokensOut
        ? `${step.tokensIn + step.tokensOut} tokens`
        : '';
      console.log(`  ${status} ${step.stepName} (${duration}${tokens ? ', ' + tokens : ''})`);
    });

    console.log('\n✨ Demo complete!\n');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
