import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ProviderFactory } from '../services/providerFactory.js';

export function registerDeleteTask(server: McpServer): void {
  server.registerTool(
    'delete_task',
    {
      description: 'Permanently deletes a task from the system.',
      inputSchema: z.object({
        id: z.string().describe('The ID of the task to delete'),
        source: z.string().optional().describe('The provider source (e.g. github, local)'),
      }).shape,
    },
    async ({ id, source }) => {
      const provider = await ProviderFactory.getProvider(source);

      try {
        const success = await provider.deleteTask(id);

        if (!success) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Task with ID ${id} not found or could not be deleted.`,
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
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to delete task: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );
}
