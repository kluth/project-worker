import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';

export function registerSummarizeMeeting(server: McpServer): void {
  server.registerTool(
    'summarize_meeting',
    {
      description:
        'Generate a summary of a meeting based on notes. Highlights action items and key discussions.',
      inputSchema: z.object({
        meetingId: z.string().describe('ID of the meeting to summarize'),
      }).shape,
    },
    async ({ meetingId }) => {
      const config = await configManager.get();

      const meeting = config.meetings.find((m) => m.id === meetingId);
      if (!meeting) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: Meeting with ID ${meetingId} not found.`,
            },
          ],
          isError: true,
        };
      }

      if (meeting.notes.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Meeting Summary: ${meeting.topic}\n\nNo notes available for this meeting.`,
            },
          ],
        };
      }

      // Generate summary
      const actionItems = meeting.notes.filter((n) => n.actionItem);
      const regularNotes = meeting.notes.filter((n) => !n.actionItem);

      let summary = `Meeting Summary: ${meeting.topic}\n`;
      summary += `Date: ${meeting.scheduledFor || meeting.createdAt}\n`;
      summary += `Attendees: ${meeting.attendees.join(', ')}\n\n`;

      if (regularNotes.length > 0) {
        summary += `Discussion Points:\n`;
        regularNotes.forEach((note, idx) => {
          summary += `${idx + 1}. ${note.content}${note.author ? ` (${note.author})` : ''}\n`;
        });
        summary += `\n`;
      }

      if (actionItems.length > 0) {
        summary += `Action Items:\n`;
        actionItems.forEach((note, idx) => {
          summary += `${idx + 1}. ${note.content}${note.author ? ` (Assigned: ${note.author})` : ''}\n`;
        });
      }

      // Save summary to meeting
      meeting.summary = summary;
      await configManager.save(config);

      return {
        content: [
          {
            type: 'text' as const,
            text: summary,
          },
        ],
      };
    },
  );
}
