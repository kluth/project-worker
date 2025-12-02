import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';
import { ProviderFactory } from '../services/providerFactory.js';
import { Task } from '../types.js';

export function registerGetBoardStatus(server: McpServer) {
  server.registerTool(
    'get_board_status',
    {
      description: 'Displays the status of a Kanban board, including tasks per column and WIP limit violations.',
      inputSchema: z.object({
        boardName: z.string().optional().describe('The name of the Kanban board. Defaults to "Default Board" if omitted.'),
      }).shape,
    },
    async ({ boardName = 'Default Board' }) => {
      const config = await configManager.get();
      const kanbanBoard = config.kanbanBoards.find(b => b.boardName === boardName);

      if (!kanbanBoard) {
        return { isError: true, content: [{ type: 'text', text: `Kanban board "${boardName}" not found.` }] };
      }

      const provider = await ProviderFactory.getProvider(config.activeProvider);
      const allTasks = await provider.getTasks(); // Fetch all tasks from active provider

      const statusMap = new Map<string, Task[]>();
      for (const task of allTasks) {
        const statusKey = task.status.toLowerCase(); // Use lowercase for consistent grouping
        if (!statusMap.has(statusKey)) {
          statusMap.set(statusKey, []);
        }
        statusMap.get(statusKey)?.push(task);
      }

      let output = `Kanban Board: ${boardName}\n\n`;
      let hasViolations = false;

      // Sort statuses for consistent output, prioritize those with WIP limits
      const sortedStatuses = Object.keys(kanbanBoard.wipLimits)
        .sort((a, b) => {
          const limitA = kanbanBoard.wipLimits[a as TaskStatus];
          const limitB = kanbanBoard.wipLimits[b as TaskStatus];
          if (limitA !== undefined && limitB === undefined) return -1;
          if (limitA === undefined && limitB !== undefined) return 1;
          return a.localeCompare(b);
        });

      const otherStatuses = Array.from(statusMap.keys())
        .filter(s => !Object.keys(kanbanBoard.wipLimits).includes(s))
        .sort();

      for (const status of [...sortedStatuses, ...otherStatuses]) {
        const tasksInStatus = statusMap.get(status) || [];
        const limit = kanbanBoard.wipLimits[status as TaskStatus];
        const currentCount = tasksInStatus.length;
        
        let statusLine = `Status: ${status} (Tasks: ${currentCount}`;
        if (limit !== undefined) {
          statusLine += `, WIP Limit: ${limit}`;
          if (limit > 0 && currentCount > limit) {
            statusLine += ` - ***VIOLATION***`;
            hasViolations = true;
          }
        }
        statusLine += `)\n`;
        output += statusLine;

        for (const task of tasksInStatus) {
          output += `  - ${task.id}: ${task.title}\n`;
        }
        output += `\n`;
      }
      
      if (hasViolations) {
        output += `***WARNING: One or more WIP limits have been violated!***\n`;
      }

      return {
        content: [
          {
            type: 'text',
            text: output
          }
        ]
      };
    },
  );
}
