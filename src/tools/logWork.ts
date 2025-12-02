import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';
import { AuditService } from '../services/auditService.js';

export function registerLogWork(server: McpServer): void {
  server.registerTool(
    'log_work',
    {
      description: 'Log time spent on a task or update estimates (Jira-style time tracking).',
      inputSchema: z.object({
        taskId: z.string().describe('The Task ID'),
        timeSpent: z.number().optional().describe('Hours to add to actualHours'),
        estimate: z.number().optional().describe('New estimatedHours total'),
      }).shape,
    },
    async ({ taskId, timeSpent, estimate }) => {
      const task = await db.getTaskById(taskId);
      if (!task)
        return { isError: true, content: [{ type: 'text', text: `Task ${taskId} not found` }] };

      if (timeSpent !== undefined) {
        const oldVal = task.actualHours || 0;
        task.actualHours = oldVal + timeSpent;
        await AuditService.logChange(taskId, 'actualHours', oldVal, task.actualHours);
      }

      if (estimate !== undefined) {
        const oldVal = task.estimatedHours || 0;
        task.estimatedHours = estimate;
        await AuditService.logChange(taskId, 'estimatedHours', oldVal, task.estimatedHours);
      }

      await db.updateTask(task);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                taskId,
                estimatedHours: task.estimatedHours,
                actualHours: task.actualHours,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
