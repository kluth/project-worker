import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ProviderFactory } from '../services/providerFactory.js';

export function registerGetTasks(server: McpServer) {
  server.registerTool(
    'get_tasks',
    {
      description: 'Retrieves a list of tasks. Defaults to active provider, or specify one.',
      inputSchema: z.object({
        status: z.enum(['todo', 'in-progress', 'blocked', 'review', 'done']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        assignee: z.string().optional(),
        search: z.string().optional(),
        source: z.enum(['local', 'github', 'jira']).optional().describe('Override active provider'),
      }).shape,
    },
    async (filters) => {
      const provider = await ProviderFactory.getProvider(filters.source);
      const tasks = await provider.getTasks(filters);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(tasks, null, 2),
          },
        ],
      };
    },
  );
}