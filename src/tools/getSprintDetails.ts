import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';

export function registerGetSprintDetails(server: McpServer) {
  server.registerTool(
    'get_sprint_details',
    {
      description: 'Retrieves details for a specific sprint or lists all sprints.',
      inputSchema: z.object({
        sprintId: z
          .string()
          .optional()
          .describe('The ID of the sprint to retrieve details for. If omitted, lists all sprints.'),
        status: z
          .enum(['planned', 'active', 'completed'])
          .optional()
          .describe('Filter sprints by status.'),
      }).shape,
    },
    async ({ sprintId, status }) => {
      const config = await configManager.get();
      let sprints = config.sprints;

      if (sprintId) {
        sprints = sprints.filter((s) => s.id === sprintId);
        if (sprints.length === 0) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Sprint with ID ${sprintId} not found.` }],
          };
        }
      }

      if (status) {
        sprints = sprints.filter((s) => s.status === status);
      }

      if (sprints.length === 0) {
        return { content: [{ type: 'text', text: 'No sprints found matching the criteria.' }] };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(sprints, null, 2),
          },
        ],
      };
    },
  );
}
