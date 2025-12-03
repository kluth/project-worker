import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';
import { randomUUID } from 'crypto';
import type { WaterfallPhase } from '../types.js';

export function registerDefinePhase(server: McpServer): void {
  server.registerTool(
    'define_phase',
    {
      description:
        'Define a new Waterfall project phase with gate checks and deliverables. Requires Waterfall methodology to be active.',
      inputSchema: z
        .object({
          name: z
            .string()
            .describe('Name of the phase (e.g., Requirements, Design, Implementation)'),
          description: z.string().optional().describe('Detailed description of the phase'),
          order: z.number().describe('Sequential order of the phase (1, 2, 3, etc.)'),
          gateChecks: z
            .array(z.string())
            .optional()
            .describe('Gate criteria that must be met before completing this phase'),
          deliverables: z
            .array(z.string())
            .optional()
            .describe('Expected deliverables for this phase'),
          approver: z
            .string()
            .optional()
            .describe('Person responsible for approving phase completion'),
        }).shape,
    },
    async ({ name, description, order, gateChecks, deliverables, approver }) => {

      const config = await configManager.get();

      // Validate Waterfall methodology is active
      if (config.agileMethodology.type !== 'waterfall') {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Error: Waterfall methodology must be active to define phases. Use manage_agile_config to set methodology to waterfall.',
            },
          ],
          isError: true,
        };
      }

      // Check for duplicate phase names
      const existingPhase = config.waterfallPhases.find((p) => p.name === name);
      if (existingPhase) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: Phase with name "${name}" already exists.`,
            },
          ],
          isError: true,
        };
      }

      // Create new phase
      const newPhase: WaterfallPhase = {
        id: randomUUID(),
        name,
        description: description || '',
        order,
        status: 'not-started',
        gateChecks: gateChecks || [],
        deliverables,
        approver,
        startDate: undefined,
        endDate: undefined,
      };

      config.waterfallPhases.push(newPhase);

      // Sort phases by order
      config.waterfallPhases.sort((a, b) => a.order - b.order);

      await configManager.save(config);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Phase "${name}" defined successfully at order ${order}.\nID: ${newPhase.id}\nGate Checks: ${newPhase.gateChecks.length}\nStatus: ${newPhase.status}`,
          },
        ],
      };
    },
  );
}
