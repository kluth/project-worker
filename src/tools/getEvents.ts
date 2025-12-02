import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';

export function registerGetEvents(server: McpServer) {
  server.registerTool(
    'get_events',
    {
      description:
        'Retrieves a list of scheduled events, optionally filtered by type, status, or date range.',
      inputSchema: z.object({
        eventId: z.string().optional().describe('The ID of a specific event to retrieve.'),
        type: z
          .enum(['planning', 'review', 'stand-up', 'retrospective', 'demo', 'other'])
          .optional()
          .describe('Filter events by type.'),
        status: z
          .enum(['upcoming', 'past', 'all'])
          .default('upcoming')
          .describe('Filter events by status (upcoming, past, all).'),
        startDate: z
          .string()
          .datetime()
          .optional()
          .describe('Start date for filtering events (ISO 8601 format).'),
        endDate: z
          .string()
          .datetime()
          .optional()
          .describe('End date for filtering events (ISO 8601 format).'),
      }).shape,
    },
    async ({ eventId, type, status, startDate, endDate }) => {
      const config = await configManager.get();
      let events = config.events;
      const now = new Date();

      if (eventId) {
        events = events.filter((e) => e.id === eventId);
        if (events.length === 0) {
          return { content: [{ type: 'text', text: `Event with ID ${eventId} not found.` }] };
        }
      }

      if (type) {
        events = events.filter((e) => e.type === type);
      }

      if (status === 'upcoming') {
        events = events.filter((e) => new Date(e.endTime) > now);
      } else if (status === 'past') {
        events = events.filter((e) => new Date(e.endTime) <= now);
      }

      if (startDate) {
        const startFilterDate = new Date(startDate);
        events = events.filter((e) => new Date(e.startTime) >= startFilterDate);
      }
      if (endDate) {
        const endFilterDate = new Date(endDate);
        events = events.filter((e) => new Date(e.endTime) <= endFilterDate);
      }

      if (events.length === 0) {
        return { content: [{ type: 'text', text: 'No events found matching the criteria.' }] };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(events, null, 2),
          },
        ],
      };
    },
  );
}
