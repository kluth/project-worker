import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AgileMethodologyConfig } from '../config.js';
import { configManager } from '../config.js';

export function registerManageAgileConfig(server: McpServer) {
  server.registerTool(
    'manage_agile_config',
    {
      description: 'Manages the active agile methodology configuration.',
      inputSchema: z.object({
        action: z.enum(['set', 'get']).describe('Action to perform: "set" or "get"'),
        type: z
          .enum(['scrum', 'kanban', 'waterfall', 'lean', 'prince2', 'custom'])
          .optional()
          .describe('The type of agile methodology'),
        settings: z
          .record(z.any())
          .optional()
          .describe('Methodology-specific settings (e.g., { sprintLength: 2 })'),
      }).shape,
    },
    async ({ action, type, settings }) => {
      if (action === 'get') {
        const config = await configManager.get();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(config.agileMethodology, null, 2),
            },
          ],
        };
      }

      if (action === 'set') {
        if (!type) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Methodology type is required for "set" action.' }],
          };
        }
        const currentConfig = await configManager.get();
        const newAgileConfig: AgileMethodologyConfig = {
          type: type as AgileMethodologyConfig['type'],
          settings: settings || {},
        };
        currentConfig.agileMethodology = newAgileConfig;
        await configManager.save(currentConfig);
        return {
          content: [
            {
              type: 'text',
              text: `Agile methodology set to ${type} with settings: ${JSON.stringify(settings || {})}`,
            },
          ],
        };
      }

      return { isError: true, content: [{ type: 'text', text: 'Invalid action.' }] };
    },
  );
}
