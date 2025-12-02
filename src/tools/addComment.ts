import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ProviderFactory } from '../services/providerFactory.js';

export function registerAddComment(server: McpServer) {
  server.registerTool(
    'add_comment',
    {
      description: 'Adds a text comment to a task.',
      inputSchema: z.object({
        taskId: z.string().describe('The ID of the task'),
        content: z.string().describe('The comment text'),
        author: z.string().default('Gemini').describe('The name of the commenter'),
        source: z.string().optional().describe('The provider source (e.g. github, local)'),
      }).shape,
    },
    async ({ taskId, content, source }) => {
      const provider = await ProviderFactory.getProvider(source);
      
      try {
        const updatedTask = await provider.addComment(taskId, content);
        
        // We return the last comment added, or the whole task if simpler.
        // Let's return the last comment for consistency with previous behavior if possible,
        // otherwise the task.
        const lastComment = updatedTask.comments[updatedTask.comments.length - 1];

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(lastComment || updatedTask, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to add comment: ${error.message}`,
            },
          ],
        };
      }
    },
  );
}
