import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';
import { randomUUID } from 'crypto';
import type { Retrospective } from '../types.js';

export function registerStartRetrospective(server: McpServer): void {
  server.registerTool(
    'start_retrospective',
    {
      description:
        'Start a new team retrospective session with a chosen format (start-stop-continue, mad-sad-glad, 4Ls, sailboat).',
      inputSchema: z.object({
        title: z.string().describe('Title/name of the retrospective session'),
        format: z
          .enum(['start-stop-continue', 'mad-sad-glad', '4Ls', 'sailboat'])
          .describe('Retrospective format to use'),
        facilitator: z.string().optional().describe('Name of the session facilitator'),
        participants: z.array(z.string()).optional().describe('List of participant names'),
      }).shape,
    },
    async ({ title, format, facilitator, participants }) => {
      const config = await configManager.get();

      const newRetrospective: Retrospective = {
        id: randomUUID(),
        title,
        format,
        facilitator,
        participants,
        status: 'active',
        feedback: [],
        createdAt: new Date().toISOString(),
      };

      config.retrospectives.push(newRetrospective);
      await configManager.save(config);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Retrospective started successfully.\nID: ${newRetrospective.id}\nTitle: ${title}\nFormat: ${format}${facilitator ? `\nFacilitator: ${facilitator}` : ''}${participants ? `\nParticipants: ${participants.length}` : ''}`,
          },
        ],
      };
    },
  );
}
