import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';
import { TaskStatus } from '../types.js';

export function registerSetWipLimit(server: McpServer) {
  server.registerTool(
    'set_wip_limit',
    {
      description: 'Sets or updates a Work-In-Progress (WIP) limit for a specific status/column on a Kanban board.',
      inputSchema: z.object({
        boardName: z.string().optional().describe('The name of the Kanban board. Defaults to "Default Board" if omitted.'),
        status: z.string().describe('The status/column for which to set the WIP limit.'),
        limit: z.number().int().positive().or(z.literal(0)).describe('The maximum number of tasks allowed in this status. Use 0 for no limit.'),
      }).shape,
    },
    async ({ boardName = 'Default Board', status, limit }) => {
      const config = await configManager.get();
      let kanbanBoard = config.kanbanBoards.find(b => b.boardName === boardName);

      if (!kanbanBoard) {
        kanbanBoard = { boardName, wipLimits: {} };
        config.kanbanBoards.push(kanbanBoard);
      }

      kanbanBoard.wipLimits[status as TaskStatus] = limit;
      await configManager.save(config);

      return {
        content: [
          {
            type: 'text',
            text: `WIP limit for status "${status}" on board "${boardName}" set to ${limit}.`
          }
        ]
      };
    },
  );
}
