import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';
import { UpdateTaskInput } from '../types.js';
import { AuditService } from '../services/auditService.js';

export function registerUpdateTask(server: McpServer) {
  server.registerTool(
    'update_task',
    {
      description: 'Updates an existing task. Logs changes to history.',
      inputSchema: z.object({
        id: z.string().describe('The ID of the task to update'),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(['todo', 'in-progress', 'blocked', 'review', 'done', 'new', 'active', 'closed', 'backlog', 'ready for dev', 'in progress', 'qa', 'to do', 'doing', 'completed']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        type: z.enum(['epic', 'story', 'task', 'subtask', 'bug', 'item', 'feature', 'initiative', 'spike', 'request', 'change']).optional(),
        assignee: z.string().optional(),
        tags: z.array(z.string()).optional(),
        dueDate: z.string().optional(),
        sprintId: z.string().optional(),
        parentId: z.string().optional(),
        releaseId: z.string().optional(),
        estimatedHours: z.number().optional(),
      }).shape,
    },
    async (input: UpdateTaskInput) => {
      const task = await db.getTaskById(input.id);
      
      if (!task) {
        return { isError: true, content: [{ type: 'text', text: `Task with ID ${input.id} not found.` }] };
      }

      const oldTask = { ...task };
      const updatedTask = {
        ...task,
        ...input,
        updatedAt: new Date().toISOString()
      };

      // Log changes for specific fields
      const fieldsToTrack = [
        'title', 'description', 'status', 'priority', 'assignee', 
        'dueDate', 'sprintId', 'type', 'parentId', 'releaseId', 'estimatedHours'
      ] as const;
      
      for (const field of fieldsToTrack) {
        if (input[field] !== undefined) {
          await AuditService.logChange(input.id, field, (oldTask as any)[field], (input as any)[field]);
        }
      }

      if (input.tags) {
         await AuditService.logChange(input.id, 'tags', oldTask.tags, input.tags);
      }

      await db.updateTask(updatedTask);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(updatedTask, null, 2),
          },
        ],
      };
    },
  );
}
