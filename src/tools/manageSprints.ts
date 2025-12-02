import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';
import type { Sprint } from '../types.js';
import { randomUUID } from 'crypto';

export function registerManageSprints(server: McpServer): void {
  server.registerTool(
    'manage_sprints',
    {
      description: 'Create and manage sprints.',
      inputSchema: z.object({
        action: z.enum(['create', 'list']).describe('Action to perform'),
        name: z.string().optional().describe('Name of the sprint (create only)'),
        goal: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).shape,
    },
    async (input) => {
      if (input.action === 'create') {
        if (!input.name || !input.startDate || !input.endDate) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Name, startDate, and endDate required for create' }],
          };
        }

        const newSprint: Sprint = {
          id: randomUUID(),
          name: input.name,
          startDate: input.startDate,
          endDate: input.endDate,
          status: 'planned',
          goal: input.goal,
        };

        await db.addSprint(newSprint);
        return { content: [{ type: 'text', text: JSON.stringify(newSprint, null, 2) }] };
      }

      if (input.action === 'list') {
        const sprints = await db.getSprints();
        return { content: [{ type: 'text', text: JSON.stringify(sprints, null, 2) }] };
      }

      return { isError: true, content: [{ type: 'text', text: 'Invalid action' }] };
    },
  );
}
