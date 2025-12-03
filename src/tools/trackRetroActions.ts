import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';
import { randomUUID } from 'crypto';
import type { RetroAction } from '../types.js';

export function registerTrackRetroActions(server: McpServer): void {
  server.registerTool(
    'track_retro_actions',
    {
      description:
        'Create, update, or list action items identified during retrospectives. Track progress on continuous improvement.',
      inputSchema: z.object({
        action: z
          .enum(['create', 'update', 'list'])
          .describe('Action: create new, update existing, or list action items'),
        description: z.string().optional().describe('Action item description (for create)'),
        assignee: z.string().optional().describe('Person assigned to the action (for create)'),
        retroId: z.string().optional().describe('Retrospective ID (for create or list filter)'),
        actionId: z.string().optional().describe('Action item ID (for update)'),
        status: z
          .enum(['pending', 'in-progress', 'completed'])
          .optional()
          .describe('Status (for update or list filter)'),
        notes: z.string().optional().describe('Additional notes (for update)'),
      }).shape,
    },
    async ({ action, description, assignee, retroId, actionId, status, notes }) => {
      const config = await configManager.get();

      if (action === 'create') {
        if (!description) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: description is required for create action.',
              },
            ],
            isError: true,
          };
        }

        const newAction: RetroAction = {
          id: randomUUID(),
          description,
          status: 'pending',
          assignee,
          retroId: retroId || '',
          createdAt: new Date().toISOString(),
        };

        config.retroActions.push(newAction);
        await configManager.save(config);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Action item created successfully.\nID: ${newAction.id}\nDescription: ${description}${assignee ? `\nAssignee: ${assignee}` : ''}`,
            },
          ],
        };
      }

      if (action === 'update') {
        if (!actionId) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: actionId is required for update action.',
              },
            ],
            isError: true,
          };
        }

        const actionItem = config.retroActions.find((a) => a.id === actionId);
        if (!actionItem) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: Action item with ID ${actionId} not found.`,
              },
            ],
            isError: true,
          };
        }

        if (status) {
          actionItem.status = status;
          if (status === 'completed') {
            actionItem.completedAt = new Date().toISOString();
          }
        }
        if (notes) {
          actionItem.notes = notes;
        }

        await configManager.save(config);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Action item updated successfully.\nStatus: ${actionItem.status}`,
            },
          ],
        };
      }

      if (action === 'list') {
        let actions = config.retroActions;

        // Filter by status if provided
        if (status) {
          actions = actions.filter((a) => a.status === status);
        }

        // Filter by retroId if provided
        if (retroId) {
          actions = actions.filter((a) => a.retroId === retroId);
        }

        if (actions.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No action items found matching the criteria.',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(actions, null, 2),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: 'Error: Invalid action specified.',
          },
        ],
        isError: true,
      };
    },
  );
}
