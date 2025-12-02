import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';

export function registerCustomFields(server: McpServer): void {
  server.registerTool(
    'custom_fields',
    {
      description: 'Manage custom key-value metadata for tasks (GitHub Projects style).',
      inputSchema: z.object({
        taskId: z.string().describe('Task ID'),
        key: z.string().describe('Field name'),
        value: z
          .union([z.string(), z.number(), z.boolean()])
          .optional()
          .describe('Value to set. If omitted, deletes the key.'),
      }).shape,
    },
    async ({ taskId, key, value }) => {
      const task = await db.getTaskById(taskId);
      if (!task)
        return { isError: true, content: [{ type: 'text', text: `Task ${taskId} not found` }] };

      if (!task.customFields) task.customFields = {};

      if (value === undefined) {
        delete task.customFields[key];
      } else {
        task.customFields[key] = value;
      }

      await db.updateTask(task);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(task.customFields, null, 2),
          },
        ],
      };
    },
  );
}
