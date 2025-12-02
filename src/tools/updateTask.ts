import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ProviderFactory } from '../services/providerFactory.js';
import { AuditService } from '../services/auditService.js'; // Import AuditService
import { UpdateTaskInput, Task } from '../types.js'; // Import Task type

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
    async (input: UpdateTaskInput) => { // Use UpdateTaskInput for type safety
      const provider = await ProviderFactory.getProvider(input.source);
      
      try {
        const oldTask: Task | undefined = await provider.getTaskById(input.id); // Get old task for audit logging

        const updatedTask = await provider.updateTask(input);

        if (oldTask) {
          // Audit logging
          for (const key in input) {
            if (Object.prototype.hasOwnProperty.call(input, key) && key !== 'id' && key !== 'source') {
              const typedKey = key as keyof UpdateTaskInput;
              const oldValue = (oldTask as any)[typedKey]; // Cast to any for dynamic access
              const newValue = input[typedKey];

              // Deep compare for arrays like tags, otherwise simple compare
              if (Array.isArray(oldValue) && Array.isArray(newValue)) {
                if (JSON.stringify(oldValue.sort()) !== JSON.stringify(newValue.sort())) {
                  await AuditService.logChange(input.id, typedKey, oldValue, newValue);
                }
              } else if (oldValue !== newValue) {
                await AuditService.logChange(input.id, typedKey, oldValue, newValue);
              }
            }
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(updatedTask, null, 2),
            },
          ],
        };
      } catch (error: any) { // Keep error: any for now as error types can be diverse
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
