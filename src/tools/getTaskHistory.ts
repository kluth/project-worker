import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';

export function registerGetTaskHistory(server: McpServer): void {
  server.registerTool(
    'get_task_history',
    {
      description: 'View the audit log (history of changes) for a specific task.',
      inputSchema: z.object({
        taskId: z.string().describe('The ID of the task'),
      }).shape,
    },
    async ({ taskId }) => {
      const logs = await db.getAuditLogsForTask(taskId);

      if (logs.length === 0) {
        return { content: [{ type: 'text', text: 'No history found for this task.' }] };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(logs, null, 2),
          },
        ],
      };
    },
  );
}
