import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerTicketGenerator(server: McpServer): void {
  server.registerPrompt(
    'ticket-generator',
    {
      title: 'Ticket Generator',
      description: 'Generate a structured project ticket based on a rough idea.',
      argsSchema: {
        type: z.enum(['feature', 'bug', 'chore']).describe('The type of ticket'),
        context: z.string().describe('The raw input or context for the ticket'),
      },
    },
    ({ type, context }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please generate a structured project management ticket for a "${type}".\n\nContext:\n${context}\n\nFormat requirements:\n- Title: Clear and concise\n- Description: Detailed breakdown\n- Acceptance Criteria: List of verifiable requirements\n- Priority: Suggested priority (Low/Medium/High)`,
          },
        },
      ],
    }),
  );
}
