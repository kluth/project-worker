import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';
import type { Discussion } from '../types.js';
import { randomUUID } from 'crypto';

export function registerManageDiscussions(server: McpServer): void {
  server.registerTool(
    'manage_discussions',
    {
      description: 'Manage team discussions. Start threads, reply, and resolve topics.',
      inputSchema: z.object({
        action: z.enum(['start', 'reply', 'read', 'list', 'resolve']).describe('Action to perform'),
        discussionId: z.string().optional().describe('ID for reply/read/resolve'),
        title: z.string().optional().describe('Title for starting a new discussion'),
        content: z.string().optional().describe('Message content'),
        author: z.string().default('Gemini').describe('Author of the message'),
        tags: z.array(z.string()).optional(),
      }).shape,
    },
    async ({ action, discussionId, title, content, author, tags }) => {
      if (action === 'list') {
        const all = await db.getDiscussions();
        // Return summary
        const summary = all.map((d) => ({
          id: d.id,
          title: d.title,
          status: d.status,
          msgCount: d.messages.length,
        }));
        return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
      }

      if (action === 'start') {
        if (!title || !content)
          return {
            isError: true,
            content: [{ type: 'text', text: 'Title and content required to start' }],
          };

        const newDiscussion: Discussion = {
          id: randomUUID(),
          title,
          status: 'open',
          tags: tags || [],
          messages: [
            {
              id: randomUUID(),
              author,
              content,
              timestamp: new Date().toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await db.saveDiscussion(newDiscussion);
        return { content: [{ type: 'text', text: JSON.stringify(newDiscussion, null, 2) }] };
      }

      if (!discussionId)
        return { isError: true, content: [{ type: 'text', text: 'discussionId required' }] };
      const discussion = await db.getDiscussionById(discussionId);
      if (!discussion)
        return {
          isError: true,
          content: [{ type: 'text', text: `Discussion ${discussionId} not found` }],
        };

      if (action === 'read') {
        return { content: [{ type: 'text', text: JSON.stringify(discussion, null, 2) }] };
      }

      if (action === 'reply') {
        if (!content)
          return { isError: true, content: [{ type: 'text', text: 'Content required for reply' }] };
        discussion.messages.push({
          id: randomUUID(),
          author,
          content,
          timestamp: new Date().toISOString(),
        });
        discussion.updatedAt = new Date().toISOString();
        await db.saveDiscussion(discussion);
        return { content: [{ type: 'text', text: 'Reply added.' }] };
      }

      if (action === 'resolve') {
        discussion.status = 'resolved';
        discussion.updatedAt = new Date().toISOString();
        await db.saveDiscussion(discussion);
        return { content: [{ type: 'text', text: 'Discussion resolved.' }] };
      }

      return { isError: true, content: [{ type: 'text', text: 'Invalid action' }] };
    },
  );
}
