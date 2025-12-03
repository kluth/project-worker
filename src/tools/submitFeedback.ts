import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';
import { randomUUID } from 'crypto';
import type { FeedbackItem } from '../types.js';

export function registerSubmitFeedback(server: McpServer): void {
  server.registerTool(
    'submit_feedback',
    {
      description:
        'Submit feedback to an active retrospective session. Supports positive, negative, and suggestion feedback types.',
      inputSchema: z.object({
        retroId: z.string().describe('ID of the retrospective session'),
        type: z
          .enum(['positive', 'negative', 'suggestion'])
          .describe('Type of feedback (positive, negative, or suggestion)'),
        content: z.string().describe('Feedback content'),
        author: z.string().optional().describe('Name of the person submitting feedback'),
        anonymous: z
          .boolean()
          .optional()
          .describe('Submit feedback anonymously (default: false)'),
      }).shape,
    },
    async ({ retroId, type, content, author, anonymous }) => {
      const config = await configManager.get();

      const retrospective = config.retrospectives.find((r) => r.id === retroId);
      if (!retrospective) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: Retrospective with ID ${retroId} not found.`,
            },
          ],
          isError: true,
        };
      }

      if (retrospective.status === 'closed') {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Error: Cannot submit feedback to a closed retrospective.',
            },
          ],
          isError: true,
        };
      }

      const feedbackItem: FeedbackItem = {
        id: randomUUID(),
        type,
        content,
        author: anonymous ? undefined : author,
        anonymous: anonymous || false,
        createdAt: new Date().toISOString(),
      };

      retrospective.feedback.push(feedbackItem);
      await configManager.save(config);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Feedback submitted successfully.\nType: ${type}\nID: ${feedbackItem.id}${anonymous ? '\n(Anonymous)' : author ? `\nAuthor: ${author}` : ''}`,
          },
        ],
      };
    },
  );
}
