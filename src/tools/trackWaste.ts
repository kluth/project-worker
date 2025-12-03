import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';
import { randomUUID } from 'crypto';
import type { WasteItem, WasteType } from '../types.js';

export function registerTrackWaste(server: McpServer): void {
  server.registerTool(
    'track_waste',
    {
      description:
        'Track waste (Muda) in the Lean process. Supports 8 types: defects, overproduction, waiting, non-utilized-talent, transportation, inventory, motion, extra-processing.',
      inputSchema: z
        .object({
          type: z
            .enum([
              'defects',
              'overproduction',
              'waiting',
              'non-utilized-talent',
              'transportation',
              'inventory',
              'motion',
              'extra-processing',
            ])
            .describe('Type of waste (one of the 8 types of Muda)'),
          description: z.string().describe('Description of the waste observed'),
          location: z.string().optional().describe('Where the waste occurs'),
          impact: z
            .enum(['low', 'medium', 'high'])
            .optional()
            .describe('Impact level of the waste'),
          mitigation: z.string().optional().describe('Proposed mitigation plan'),
        }).shape,
    },
    async ({ type, description, location, impact, mitigation }) => {

      const config = await configManager.get();

      // Validate Lean methodology is active
      if (config.agileMethodology.type !== 'lean') {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Error: Lean methodology must be active to track waste. Use manage_agile_config to set methodology to lean.',
            },
          ],
          isError: true,
        };
      }

      // Create new waste item
      const newWaste: WasteItem = {
        id: randomUUID(),
        type: type as WasteType,
        description,
        location,
        impact,
        mitigation,
        identifiedAt: new Date().toISOString(),
      };

      config.wasteLog.push(newWaste);
      await configManager.save(config);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Waste tracked successfully.\nType: ${type}\nImpact: ${impact || 'Not specified'}\nID: ${newWaste.id}${mitigation ? '\nMitigation: ' + mitigation : ''}`,
          },
        ],
      };
    },
  );
}
