/**
 * Invoice Schema
 *
 * JSON Schema and TypeScript types for structured invoice data extraction.
 * Used with vision models (gpt-4o) to extract data from invoice images/PDFs.
 *
 * @packageDocumentation
 */

/**
 * JSON Schema for invoice extraction.
 * Compatible with OpenAI's structured outputs API.
 */
export const InvoiceSchema = {
  type: 'object',
  properties: {
    invoiceNumber: {
      type: 'string',
      description: 'Unique invoice identifier (e.g., INV-001, #12345)',
    },
    invoiceDate: {
      type: 'string',
      format: 'date',
      description: 'Date the invoice was issued (YYYY-MM-DD)',
    },
    dueDate: {
      type: 'string',
      format: 'date',
      description: 'Payment due date (YYYY-MM-DD)',
    },
    vendor: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Vendor/supplier company name',
        },
        address: {
          type: 'string',
          description: 'Full vendor address',
        },
        taxId: {
          type: 'string',
          description: 'Tax ID, EIN, or VAT number',
        },
        email: {
          type: 'string',
          description: 'Vendor contact email',
        },
        phone: {
          type: 'string',
          description: 'Vendor contact phone',
        },
      },
      required: ['name'],
    },
    billTo: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Customer/recipient company name',
        },
        address: {
          type: 'string',
          description: 'Full customer address',
        },
      },
    },
    lineItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'Item or service description',
          },
          quantity: {
            type: 'number',
            description: 'Quantity ordered',
          },
          unitPrice: {
            type: 'number',
            description: 'Price per unit',
          },
          amount: {
            type: 'number',
            description: 'Total line item amount (quantity × unitPrice)',
          },
        },
        required: ['description', 'amount'],
      },
      description: 'Individual line items on the invoice',
    },
    subtotal: {
      type: 'number',
      description: 'Subtotal before tax',
    },
    tax: {
      type: 'number',
      description: 'Tax amount',
    },
    total: {
      type: 'number',
      description: 'Total amount due (subtotal + tax)',
    },
    currency: {
      type: 'string',
      description: 'Currency code (USD, EUR, GBP, etc.)',
    },
    notes: {
      type: 'string',
      description: 'Additional notes or payment instructions',
    },
  },
  required: ['invoiceNumber', 'total', 'vendor', 'lineItems'],
  additionalProperties: false,
} as const;

/**
 * TypeScript interface for Invoice data.
 * Generated from the JSON Schema above.
 *
 * @example
 * ```typescript
 * const invoice: Invoice = {
 *   invoiceNumber: 'INV-001',
 *   invoiceDate: '2025-01-15',
 *   dueDate: '2025-02-14',
 *   vendor: {
 *     name: 'Acme Corp',
 *     address: '123 Main St, San Francisco, CA 94102',
 *     taxId: '12-3456789'
 *   },
 *   lineItems: [
 *     {
 *       description: 'Web Development Services',
 *       quantity: 40,
 *       unitPrice: 150,
 *       amount: 6000
 *     }
 *   ],
 *   subtotal: 6000,
 *   tax: 540,
 *   total: 6540,
 *   currency: 'USD'
 * };
 * ```
 */
export interface Invoice {
  invoiceNumber: string;
  invoiceDate?: string;
  dueDate?: string;
  vendor: {
    name: string;
    address?: string;
    taxId?: string;
    email?: string;
    phone?: string;
  };
  billTo?: {
    name?: string;
    address?: string;
  };
  lineItems: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
  }>;
  subtotal?: number;
  tax?: number;
  total: number;
  currency?: string;
  notes?: string;
}

/**
 * TypeScript interface for enriched invoice data.
 * Contains business intelligence added by the enrichment step.
 */
export interface EnrichedInvoice {
  paymentTerms?: {
    daysUntilDue?: number;
    isOverdue?: boolean;
    paymentStatus?: 'due' | 'upcoming' | 'overdue';
  };
  riskFlags?: Array<{
    type: 'duplicate' | 'unusualAmount' | 'newVendor' | 'missingInfo' | 'other';
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  suggestedGLCodes?: Array<{
    lineItemIndex: number;
    code: string;
    category: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  vendorHistory?: {
    previousInvoices?: number;
    averageAmount?: number;
    relationshipDuration?: string;
  };
  analysisNotes?: string;
}

/**
 * TypeScript interface for invoice summary.
 * Contains a concise human-readable summary of the invoice.
 */
export interface InvoiceSummary {
  summary: string;
  keyPoints?: string[];
  actionRequired?: string;
}
