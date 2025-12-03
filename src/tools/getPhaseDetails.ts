import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';

export function registerGetPhaseDetails(server: McpServer): void {
  server.registerTool(
    'get_phase_details',
    {
      description:
        'Get details about Waterfall phases. Can filter by phase ID or status, or list all phases.',
      inputSchema: z
        .object({
          phaseId: z.string().optional().describe('Specific phase ID to retrieve'),
          status: z
            .enum(['not-started', 'in-progress', 'completed'])
            .optional()
            .describe('Filter phases by status'),
        }).shape,
    },
    async ({ phaseId, status }) => {

      const config = await configManager.get();

      // Get specific phase by ID
      if (phaseId) {
        const phase = config.waterfallPhases.find((p) => p.id === phaseId);
        if (!phase) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: Phase with ID ${phaseId} not found.`,
              },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(phase, null, 2),
            },
          ],
        };
      }

      // Filter by status if provided
      let phases = config.waterfallPhases;
      if (status) {
        phases = phases.filter((p) => p.status === status);
      }

      // Sort by order
      phases = phases.sort((a, b) => a.order - b.order);

      if (phases.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No phases found matching the criteria.',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(phases, null, 2),
          },
        ],
      };
    },
  );
}
