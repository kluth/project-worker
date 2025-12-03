import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';
import type { BusinessCase } from '../types.js';

export function registerManageBusinessCase(server: McpServer): void {
  server.registerTool(
    'manage_business_case',
    {
      description:
        'Create, update, or retrieve the PRINCE2 Business Case which justifies the project investment.',
      inputSchema: z.object({
        action: z
          .enum(['create', 'update', 'get'])
          .describe('Action: create new, update existing, or get current business case'),
        executiveSummary: z
          .string()
          .optional()
          .describe('Executive summary of the business case'),
        reasons: z.array(z.string()).optional().describe('Reasons for undertaking the project'),
        benefits: z.array(z.string()).optional().describe('Expected benefits'),
        costs: z.number().optional().describe('Estimated costs'),
        timescale: z.string().optional().describe('Project timescale'),
        risks: z.array(z.string()).optional().describe('Major risks'),
        options: z.array(z.string()).optional().describe('Options considered'),
      }).shape,
    },
    async ({
      action,
      executiveSummary,
      reasons,
      benefits,
      costs,
      timescale,
      risks,
      options,
    }) => {
      const config = await configManager.get();

      // Validate PRINCE2 methodology is active
      if (config.agileMethodology.type !== 'prince2') {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Error: PRINCE2 methodology must be active to manage business case. Use manage_agile_config to set methodology to prince2.',
            },
          ],
          isError: true,
        };
      }

      if (action === 'get') {
        if (!config.businessCase) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No business case defined. Use action "create" to define one.',
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(config.businessCase, null, 2),
            },
          ],
        };
      }

      if (action === 'create') {
        if (!executiveSummary) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: executiveSummary is required for create action.',
              },
            ],
            isError: true,
          };
        }

        const newBusinessCase: BusinessCase = {
          executiveSummary,
          reasons: reasons || [],
          benefits: benefits || [],
          costs: costs || 0,
          timescale: timescale || '',
          risks: risks || [],
          options: options || [],
          createdAt: new Date().toISOString(),
        };

        config.businessCase = newBusinessCase;
        await configManager.save(config);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Business case created successfully.\nBenefits: ${benefits?.length || 0}\nCosts: ${costs || 0}\nTimescale: ${timescale || 'Not specified'}`,
            },
          ],
        };
      }

      if (action === 'update') {
        if (!config.businessCase) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: No business case exists. Use action "create" first.',
              },
            ],
            isError: true,
          };
        }

        // Update only provided fields
        const updatedBusinessCase: BusinessCase = {
          ...config.businessCase,
          executiveSummary: executiveSummary || config.businessCase.executiveSummary,
          reasons: reasons || config.businessCase.reasons,
          benefits: benefits || config.businessCase.benefits,
          costs: costs !== undefined ? costs : config.businessCase.costs,
          timescale: timescale || config.businessCase.timescale,
          risks: risks || config.businessCase.risks,
          options: options || config.businessCase.options,
          updatedAt: new Date().toISOString(),
        };

        config.businessCase = updatedBusinessCase;
        await configManager.save(config);

        return {
          content: [
            {
              type: 'text' as const,
              text: 'Business case updated successfully.',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: 'Error: Invalid action specified.',
          },
        ],
        isError: true,
      };
    },
  );
}
