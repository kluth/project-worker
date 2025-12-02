import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';

export function registerSearchTasks(server: McpServer) {
  server.registerTool(
    'search_tasks',
    {
      description: 'Advanced search for tasks using a query string. Searches across title, description, tags, and comments.',
      inputSchema: z.object({
        query: z.string().describe('The search term'),
      }).shape,
    },
    async ({ query }) => {
      const allTasks = await db.getTasks();
      const term = query.toLowerCase();

      const matches = allTasks.filter(task => {
        const inTitle = task.title.toLowerCase().includes(term);
        const inDesc = task.description.toLowerCase().includes(term);
        const inTags = task.tags.some(tag => tag.toLowerCase().includes(term));
        const inComments = task.comments.some(c => c.content.toLowerCase().includes(term));
        
        return inTitle || inDesc || inTags || inComments;
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(matches, null, 2),
          },
        ],
      };
    },
  );
}
