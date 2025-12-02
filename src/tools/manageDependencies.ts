import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';
import { AuditService } from '../services/auditService.js';

export function registerManageDependencies(server: McpServer): void {
  server.registerTool(
    'manage_dependencies',
    {
      description: 'Manage task dependencies. Block a task with another task.',
      inputSchema: z.object({
        taskId: z.string().describe('The ID of the task being blocked'),
        blockerId: z.string().describe('The ID of the task that is blocking'),
        action: z.enum(['add', 'remove']).describe('Whether to add or remove the dependency'),
      }).shape,
    },
    async ({ taskId, blockerId, action }) => {
      const task = await db.getTaskById(taskId);
      const blocker = await db.getTaskById(blockerId);

      if (!task)
        return { isError: true, content: [{ type: 'text', text: `Task ${taskId} not found` }] };
      if (!blocker)
        return {
          isError: true,
          content: [{ type: 'text', text: `Blocker ${blockerId} not found` }],
        };

      const oldBlockedBy = [...(task.blockedBy || [])];

      if (action === 'add') {
        if (task.blockedBy?.includes(blockerId)) {
          return {
            content: [{ type: 'text', text: `Task ${taskId} is already blocked by ${blockerId}` }],
          };
        }
        if (!task.blockedBy) task.blockedBy = [];
        task.blockedBy.push(blockerId);

        // Log
        await AuditService.logChange(taskId, 'blockedBy', oldBlockedBy, task.blockedBy);
      } else {
        if (!task.blockedBy?.includes(blockerId)) {
          return {
            content: [{ type: 'text', text: `Task ${taskId} is not blocked by ${blockerId}` }],
          };
        }
        task.blockedBy = task.blockedBy.filter((id) => id !== blockerId);

        // Log
        await AuditService.logChange(taskId, 'blockedBy', oldBlockedBy, task.blockedBy);
      }

      await db.updateTask(task);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ taskId, blockedBy: task.blockedBy }, null, 2),
          },
        ],
      };
    },
  );
}
