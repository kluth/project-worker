import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';
import { Event } from '../types.js';
import { randomUUID } from 'crypto';

export function registerScheduleEvent(server: McpServer) {
  server.registerTool(
    'schedule_event',
    {
      description: 'Schedules a new agile ceremony or other event.',
      inputSchema: z.object({
        type: z.enum(['planning', 'review', 'stand-up', 'retrospective', 'demo', 'other']).describe('Type of the event.'),
        name: z.string().describe('Name or title of the event.'),
        description: z.string().optional().describe('Detailed description of the event.'),
        startTime: z.string().datetime().describe('Start time of the event (ISO 8601 format, e.g., "2024-12-01T09:00:00Z").'),
        endTime: z.string().datetime().describe('End time of the event (ISO 8601 format).'),
        attendees: z.array(z.string()).optional().describe('List of attendees (e.g., user IDs or names).'),
        relatedSprintId: z.string().optional().describe('ID of a related sprint, if applicable.'),
        relatedTaskId: z.string().optional().describe('ID of a related task, if applicable.'),
        location: z.string().optional().describe('Location of the event (e.g., "Zoom Link", "Meeting Room A").'),
      }).shape,
    },
    async ({ type, name, description, startTime, endTime, attendees, relatedSprintId, relatedTaskId, location }) => {
      const config = await configManager.get();

      const newEvent: Event = {
        id: randomUUID(),
        type,
        name,
        description,
        startTime,
        endTime,
        attendees,
        relatedSprintId,
        relatedTaskId,
        location,
        notificationSent: false, // Default to false
      };

      config.events.push(newEvent);
      await configManager.save(config);

      return {
        content: [
          {
            type: 'text',
            text: `Event "${name}" (${type}) scheduled successfully for ${new Date(startTime).toLocaleString()}. Event ID: ${newEvent.id}`
          }
        ]
      };
    },
  );
}
