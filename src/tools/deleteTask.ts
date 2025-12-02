import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';

export function registerDeleteTask(server: McpServer) {
  server.registerTool(
    'delete_task',
    {
      description: 'Permanently deletes a task from the system.',
      inputSchema: z.object({
        id: z.string().describe('The ID of the task to delete'),
      }).shape,
    },
    async ({ id }) => {
      const success = await db.deleteTask(id);
      
      if (!success) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Task with ID ${id} not found.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Successfully deleted task ${id}.`,
          },
        ],
      };
    },
  );
}
