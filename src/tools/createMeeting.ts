import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';
import { randomUUID } from 'crypto';
import type { Meeting } from '../types.js';

export function registerCreateMeeting(server: McpServer): void {
  server.registerTool(
    'create_meeting',
    {
      description: 'Create a new meeting with topic, attendees, and agenda.',
      inputSchema: z.object({
        topic: z.string().describe('Meeting topic/title'),
        attendees: z.array(z.string()).describe('List of attendee names'),
        agenda: z.array(z.string()).describe('Meeting agenda items'),
        scheduledFor: z.string().optional().describe('Scheduled date/time (ISO format)'),
        location: z.string().optional().describe('Meeting location (physical or virtual)'),
      }).shape,
    },
    async ({ topic, attendees, agenda, scheduledFor, location }) => {
      const config = await configManager.get();

      const newMeeting: Meeting = {
        id: randomUUID(),
        topic,
        attendees,
        agenda,
        location,
        scheduledFor,
        notes: [],
        createdAt: new Date().toISOString(),
      };

      config.meetings.push(newMeeting);
      await configManager.save(config);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Meeting created successfully.\nID: ${newMeeting.id}\nTopic: ${topic}\nAttendees: ${attendees.length}\nAgenda Items: ${agenda.length}${scheduledFor ? `\nScheduled: ${scheduledFor}` : ''}${location ? `\nLocation: ${location}` : ''}`,
          },
        ],
      };
    },
  );
}
