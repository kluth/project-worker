import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';
import { randomUUID } from 'crypto';

export function registerAddComment(server: McpServer) {
  server.registerTool(
    'add_comment',
    {
      description: 'Adds a text comment to a task.',
      inputSchema: z.object({
        taskId: z.string().describe('The ID of the task'),
        content: z.string().describe('The comment text'),
        author: z.string().default('Gemini').describe('The name of the commenter'),
      }).shape,
    },
    async ({ taskId, content, author }) => {
      const task = await db.getTaskById(taskId);
      
      if (!task) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Task with ID ${taskId} not found.`,
            },
          ],
        };
      }

      const newComment = {
        id: randomUUID(),
        content,
        author,
        timestamp: new Date().toISOString()
      };

      task.comments.push(newComment);
      task.updatedAt = new Date().toISOString();
      
      await db.updateTask(task);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(newComment, null, 2),
          },
        ],
      };
    },
  );
}
