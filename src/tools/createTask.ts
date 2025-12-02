import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ProviderFactory } from '../services/providerFactory.js';
import type { CreateTaskInput } from '../types.js'; // Keep for type annotation of 'input'

export function registerCreateTask(server: McpServer): void {
  // Add void return type
  server.registerTool(
    'create_task',
    {
      description: 'Creates a new task. Defaults to active provider, or specify one.',
      inputSchema: z.object({
        title: z.string().describe('The title of the task'),
        description: z.string().default('').describe('Detailed description'),
        status: z
          .enum([
            'todo',
            'in-progress',
            'blocked',
            'review',
            'done',
            'new',
            'active',
            'closed',
            'backlog',
            'ready for dev',
            'in progress',
            'qa',
            'to do',
            'doing',
            'completed',
          ])
          .default('todo'),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
        type: z
          .enum([
            'epic',
            'story',
            'task',
            'subtask',
            'bug',
            'item',
            'feature',
            'initiative',
            'spike',
            'request',
            'change',
          ])
          .default('task'),
        assignee: z.string().optional(),
        tags: z.array(z.string()).default([]),
        source: z.enum(['local', 'github', 'jira']).optional().describe('Override active provider'),
      }).shape,
    },
    async (input: CreateTaskInput) => {
      // Use CreateTaskInput for type safety
      const provider = await ProviderFactory.getProvider(input.source);
      const newTask = await provider.createTask(input);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(newTask, null, 2),
          },
        ],
      };
    },
  );
}
