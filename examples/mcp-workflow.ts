/**
 * Example: Workflow with MCP integration
 *
 * This example demonstrates how to use MCP (Model Context Protocol) tools
 * alongside AI models in a workflow.
 *
 * Usage:
 * ```typescript
 * import { relay } from '@relayplane/sdk';
 *
 * // Configure MCP servers
 * relay.configure({
 *   providers: {
 *     openai: { apiKey: process.env.OPENAI_API_KEY! }
 *   },
 *   mcp: {
 *     servers: {
 *       crm: {
 *         url: 'https://crm-mcp-server.example.com',
 *         enabled: true
 *       },
 *       github: {
 *         url: 'https://github-mcp-server.example.com',
 *         credentials: {
 *           token: process.env.GITHUB_TOKEN!
 *         },
 *         enabled: true
 *       }
 *     }
 *   }
 * });
 *
 * // Create workflow with mixed AI and MCP steps
 * const result = await relay
 *   .workflow('invoice-processor')
 *   // Step 1: Extract data from invoice using AI
 *   .step('extract', {
 *     systemPrompt: 'Extract vendor name and amount from this invoice'
 *   })
 *   .with('openai:gpt-4o-vision')
 *   // Step 2: Look up vendor in CRM using MCP
 *   .step('lookup')
 *   .mcp('crm:search')
 *   .params({
 *     name: '{{steps.extract.vendorName}}'
 *   })
 *   .depends('extract')
 *   // Step 3: Summarize results using AI
 *   .step('summarize', {
 *     systemPrompt: 'Create a summary of the invoice and vendor details'
 *   })
 *   .with('anthropic:claude-3.5-sonnet')
 *   .depends('extract', 'lookup')
 *   .run({
 *     fileUrl: 'https://example.com/invoice.pdf'
 *   });
 *
 * console.log(result.finalOutput);
 * ```
 */

import { relay } from '@relayplane/sdk';

export async function exampleMCPWorkflow() {
  // Configure SDK with providers and MCP servers
  relay.configure({
    providers: {
      openai: { apiKey: process.env.OPENAI_API_KEY! },
      anthropic: { apiKey: process.env.ANTHROPIC_API_KEY! }
    },
    mcp: {
      servers: {
        crm: {
          url: 'https://crm-mcp-server.example.com',
          enabled: true
        },
        github: {
          url: 'https://github-mcp-server.example.com',
          credentials: {
            token: process.env.GITHUB_TOKEN!
          },
          enabled: true
        }
      }
    }
  });

  // Create workflow with mixed AI and MCP steps
  const result = await relay
    .workflow('invoice-processor')
    // Step 1: Extract data from invoice using AI
    .step('extract', {
      systemPrompt: 'Extract vendor name and amount from this invoice'
    })
    .with('openai:gpt-4o-vision')
    // Step 2: Look up vendor in CRM using MCP
    .step('lookup')
    .mcp('crm:search')
    .params({
      name: '{{steps.extract.vendorName}}'
    })
    .depends('extract')
    // Step 3: Summarize results using AI
    .step('summarize', {
      systemPrompt: 'Create a summary of the invoice and vendor details'
    })
    .with('anthropic:claude-3.5-sonnet')
    .depends('extract', 'lookup')
    .run({
      fileUrl: 'https://example.com/invoice.pdf'
    });

  return result;
}

/**
 * Example: GitHub issue creation workflow
 */
export async function exampleGitHubWorkflow() {
  relay.configure({
    providers: {
      openai: { apiKey: process.env.OPENAI_API_KEY! }
    },
    mcp: {
      servers: {
        github: {
          url: 'https://github-mcp-server.example.com',
          credentials: {
            token: process.env.GITHUB_TOKEN!
          },
          enabled: true
        }
      }
    }
  });

  const result = await relay
    .workflow('bug-reporter')
    // Step 1: Analyze error log with AI
    .step('analyze', {
      systemPrompt: 'Analyze this error log and create a concise bug report'
    })
    .with('openai:gpt-4o')
    // Step 2: Create GitHub issue using MCP
    .step('create_issue')
    .mcp('github:create-issue')
    .params({
      repo: 'owner/repo',
      title: '{{steps.analyze.title}}',
      body: '{{steps.analyze.description}}',
      labels: ['bug', 'automated']
    })
    .depends('analyze')
    .run({
      errorLog: 'Error: Something went wrong...'
    });

  return result;
}
