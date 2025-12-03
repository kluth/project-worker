import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';
import { randomUUID } from 'crypto';
import type { MeetingNote } from '../types.js';

export function registerAddMeetingNote(server: McpServer): void {
  server.registerTool(
    'add_meeting_note',
    {
      description: 'Add a note to an existing meeting. Can mark notes as action items.',
      inputSchema: z.object({
        meetingId: z.string().describe('ID of the meeting'),
        content: z.string().describe('Note content'),
        author: z.string().optional().describe('Note author'),
        timestamp: z.string().optional().describe('Note timestamp (ISO format)'),
        actionItem: z.boolean().optional().describe('Mark as action item (default: false)'),
      }).shape,
    },
    async ({ meetingId, content, author, timestamp, actionItem }) => {
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

      const note: MeetingNote = {
        id: randomUUID(),
        content,
        author,
        timestamp,
        actionItem: actionItem || false,
        createdAt: new Date().toISOString(),
      };

      meeting.notes.push(note);
      await configManager.save(config);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Note added successfully.\nID: ${note.id}${author ? `\nAuthor: ${author}` : ''}${actionItem ? '\nMarked as ACTION ITEM' : ''}`,
          },
        ],
      };
    },
  );
}
