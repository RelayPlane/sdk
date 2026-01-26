/**
 * Invoice Workflow Tests
 *
 * Integration tests for the invoice processing workflow.
 */

import { describe, it, expect } from 'vitest';
import { InvoiceSchema } from './schema';
import type { Invoice, EnrichedInvoice, InvoiceSummary } from './schema';

describe('Invoice Schema', () => {
  it('should have required fields', () => {
    expect(InvoiceSchema.required).toContain('invoiceNumber');
    expect(InvoiceSchema.required).toContain('total');
    expect(InvoiceSchema.required).toContain('vendor');
    expect(InvoiceSchema.required).toContain('lineItems');
  });

  it('should have vendor with name required', () => {
    const vendorSchema = InvoiceSchema.properties.vendor;
    expect(vendorSchema.required).toContain('name');
  });

  it('should have line items as array', () => {
    const lineItemsSchema = InvoiceSchema.properties.lineItems;
    expect(lineItemsSchema.type).toBe('array');
    expect(lineItemsSchema.items).toBeDefined();
  });

  it('should have numeric total field', () => {
    const totalSchema = InvoiceSchema.properties.total;
    expect(totalSchema.type).toBe('number');
  });

  it('should have date format fields', () => {
    const invoiceDateSchema = InvoiceSchema.properties.invoiceDate;
    const dueDateSchema = InvoiceSchema.properties.dueDate;
    expect(invoiceDateSchema.format).toBe('date');
    expect(dueDateSchema.format).toBe('date');
  });
});

describe('Invoice TypeScript Types', () => {
  it('should allow valid invoice data', () => {
    const invoice: Invoice = {
      invoiceNumber: 'INV-001',
      invoiceDate: '2025-01-15',
      dueDate: '2025-02-14',
      vendor: {
        name: 'Acme Corp',
        address: '123 Main St',
        taxId: '12-3456789',
      },
      lineItems: [
        {
          description: 'Web Development',
          quantity: 40,
          unitPrice: 150,
          amount: 6000,
        },
      ],
      subtotal: 6000,
      tax: 540,
      total: 6540,
      currency: 'USD',
    };

    expect(invoice.invoiceNumber).toBe('INV-001');
    expect(invoice.total).toBe(6540);
    expect(invoice.vendor.name).toBe('Acme Corp');
    expect(invoice.lineItems).toHaveLength(1);
  });

  it('should allow minimal invoice data', () => {
    const invoice: Invoice = {
      invoiceNumber: 'INV-002',
      vendor: { name: 'Basic Vendor' },
      lineItems: [{ description: 'Service', amount: 100 }],
      total: 100,
    };

    expect(invoice.invoiceNumber).toBe('INV-002');
    expect(invoice.total).toBe(100);
  });

  it('should allow enriched invoice data', () => {
    const enrichment: EnrichedInvoice = {
      paymentTerms: {
        daysUntilDue: 30,
        isOverdue: false,
        paymentStatus: 'upcoming',
      },
      riskFlags: [
        {
          type: 'newVendor',
          severity: 'low',
          description: 'First invoice from this vendor',
        },
      ],
      suggestedGLCodes: [
        {
          lineItemIndex: 0,
          code: '5200',
          category: 'Professional Services',
          confidence: 'high',
        },
      ],
      analysisNotes: 'Standard invoice, no issues detected',
    };

    expect(enrichment.paymentTerms?.paymentStatus).toBe('upcoming');
    expect(enrichment.riskFlags).toHaveLength(1);
    expect(enrichment.suggestedGLCodes).toHaveLength(1);
  });

  it('should allow summary data', () => {
    const summary: InvoiceSummary = {
      summary: 'Invoice for $6,540 due in 30 days',
      keyPoints: ['New vendor', 'Standard amount', 'Payment upcoming'],
      actionRequired: 'Verify vendor credentials',
    };

    expect(summary.summary).toContain('$6,540');
    expect(summary.keyPoints).toHaveLength(3);
    expect(summary.actionRequired).toBe('Verify vendor credentials');
  });
});

describe('Invoice Workflow Structure', () => {
  it('should have schema compatible with OpenAI strict mode', () => {
    // OpenAI strict mode requires:
    // 1. type: 'object' at root
    // 2. additionalProperties: false
    // 3. All objects must have 'required' field

    expect(InvoiceSchema.type).toBe('object');
    expect(InvoiceSchema.additionalProperties).toBe(false);
    expect(InvoiceSchema.required).toBeDefined();
  });

  it('should have descriptive field descriptions', () => {
    // Check that key fields have descriptions for better extraction
    expect(InvoiceSchema.properties.invoiceNumber.description).toBeDefined();
    expect(InvoiceSchema.properties.total.description).toBeDefined();
    expect(InvoiceSchema.properties.vendor.properties.name.description).toBeDefined();
  });

  it('should support nested objects', () => {
    const vendorSchema = InvoiceSchema.properties.vendor;
    expect(vendorSchema.type).toBe('object');
    expect(vendorSchema.properties).toBeDefined();
    expect(vendorSchema.properties.name).toBeDefined();
    expect(vendorSchema.properties.address).toBeDefined();
  });

  it('should support arrays of objects', () => {
    const lineItemsSchema = InvoiceSchema.properties.lineItems;
    expect(lineItemsSchema.type).toBe('array');
    expect(lineItemsSchema.items.type).toBe('object');
    expect(lineItemsSchema.items.properties).toBeDefined();
    expect(lineItemsSchema.items.required).toContain('description');
    expect(lineItemsSchema.items.required).toContain('amount');
  });
});

describe('Invoice Workflow Validation', () => {
  it('should validate invoice number is present', () => {
    const required = InvoiceSchema.required;
    expect(required).toContain('invoiceNumber');
  });

  it('should validate total is present', () => {
    const required = InvoiceSchema.required;
    expect(required).toContain('total');
  });

  it('should validate vendor is present', () => {
    const required = InvoiceSchema.required;
    expect(required).toContain('vendor');
  });

  it('should validate line items are present', () => {
    const required = InvoiceSchema.required;
    expect(required).toContain('lineItems');
  });

  it('should have proper numeric types for amounts', () => {
    expect(InvoiceSchema.properties.total.type).toBe('number');
    expect(InvoiceSchema.properties.subtotal.type).toBe('number');
    expect(InvoiceSchema.properties.tax.type).toBe('number');

    const lineItemSchema = InvoiceSchema.properties.lineItems.items;
    expect(lineItemSchema.properties.quantity.type).toBe('number');
    expect(lineItemSchema.properties.unitPrice.type).toBe('number');
    expect(lineItemSchema.properties.amount.type).toBe('number');
  });
});

describe('Invoice Data Examples', () => {
  it('should handle simple service invoice', () => {
    const invoice: Invoice = {
      invoiceNumber: 'SRV-2025-001',
      invoiceDate: '2025-01-15',
      dueDate: '2025-02-14',
      vendor: {
        name: 'Consulting Services Inc.',
        email: 'billing@consulting.com',
      },
      lineItems: [
        {
          description: 'Business Strategy Consulting',
          quantity: 20,
          unitPrice: 200,
          amount: 4000,
        },
      ],
      subtotal: 4000,
      tax: 360,
      total: 4360,
      currency: 'USD',
    };

    expect(invoice.lineItems[0].description).toContain('Consulting');
    expect(invoice.total).toBe(4360);
  });

  it('should handle multi-item product invoice', () => {
    const invoice: Invoice = {
      invoiceNumber: 'PROD-2025-042',
      invoiceDate: '2025-01-16',
      vendor: {
        name: 'Office Supplies Co.',
        address: '456 Supply Ave, Austin, TX 78701',
        taxId: '98-7654321',
      },
      billTo: {
        name: 'Tech Startup Inc.',
        address: '789 Innovation Blvd, San Francisco, CA 94105',
      },
      lineItems: [
        { description: 'Ergonomic Office Chairs', quantity: 5, unitPrice: 300, amount: 1500 },
        { description: 'Standing Desks', quantity: 3, unitPrice: 600, amount: 1800 },
        { description: 'Monitor Arms', quantity: 10, unitPrice: 50, amount: 500 },
      ],
      subtotal: 3800,
      tax: 304,
      total: 4104,
      currency: 'USD',
      notes: 'Net 30. Free delivery included.',
    };

    expect(invoice.lineItems).toHaveLength(3);
    expect(invoice.subtotal).toBe(3800);
    expect(invoice.notes).toContain('Net 30');
  });

  it('should handle invoice with minimal data', () => {
    const invoice: Invoice = {
      invoiceNumber: 'MIN-001',
      vendor: { name: 'Quick Service' },
      lineItems: [{ description: 'Emergency Repair', amount: 250 }],
      total: 250,
    };

    expect(invoice.invoiceNumber).toBe('MIN-001');
    expect(invoice.total).toBe(250);
    expect(invoice.lineItems[0].description).toBe('Emergency Repair');
  });
});

describe('Enrichment Data Examples', () => {
  it('should handle payment terms analysis', () => {
    const enrichment: EnrichedInvoice = {
      paymentTerms: {
        daysUntilDue: 15,
        isOverdue: false,
        paymentStatus: 'upcoming',
      },
    };

    expect(enrichment.paymentTerms?.daysUntilDue).toBe(15);
    expect(enrichment.paymentTerms?.paymentStatus).toBe('upcoming');
  });

  it('should handle risk flags', () => {
    const enrichment: EnrichedInvoice = {
      riskFlags: [
        {
          type: 'unusualAmount',
          severity: 'medium',
          description: 'Invoice amount 3x higher than vendor average',
        },
        {
          type: 'missingInfo',
          severity: 'low',
          description: 'Tax ID not provided',
        },
      ],
    };

    expect(enrichment.riskFlags).toHaveLength(2);
    expect(enrichment.riskFlags?.[0].severity).toBe('medium');
  });

  it('should handle GL code suggestions', () => {
    const enrichment: EnrichedInvoice = {
      suggestedGLCodes: [
        {
          lineItemIndex: 0,
          code: '5100',
          category: 'Office Supplies',
          confidence: 'high',
        },
        {
          lineItemIndex: 1,
          code: '5200',
          category: 'Professional Services',
          confidence: 'medium',
        },
      ],
    };

    expect(enrichment.suggestedGLCodes).toHaveLength(2);
    expect(enrichment.suggestedGLCodes?.[0].code).toBe('5100');
  });
});
