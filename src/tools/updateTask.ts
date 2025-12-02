import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ProviderFactory } from '../services/providerFactory.js';
import { UpdateTaskInput } from '../types.js';

export function registerUpdateTask(server: McpServer) {
  server.registerTool(
    'update_task',
    {
      description: 'Updates an existing task. Logs changes to history.',
      inputSchema: z.object({
        id: z.string().describe('The ID of the task to update'),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(['todo', 'in-progress', 'blocked', 'review', 'done', 'new', 'active', 'closed']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        type: z.enum(['epic', 'story', 'task', 'subtask', 'bug', 'item', 'feature']).optional(),
        assignee: z.string().optional(),
        tags: z.array(z.string()).optional(),
        dueDate: z.string().optional(),
        sprintId: z.string().optional(),
        parentId: z.string().optional(),
        releaseId: z.string().optional(),
        estimatedHours: z.number().optional(),
        source: z.string().optional().describe('The provider source (e.g. github, local)'),
      }).shape,
    },
    async (input: any) => {
      const provider = await ProviderFactory.getProvider(input.source);
      
      try {
        const updatedTask = await provider.updateTask(input);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(updatedTask, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to update task: ${error.message}`,
            },
          ],
        };
      }
    },
  );
}
