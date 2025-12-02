import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';

export function registerEndSprint(server: McpServer) {
  server.registerTool(
    'end_sprint',
    {
      description: 'Ends the currently active sprint.',
      inputSchema: z.object({
        moveUncompletedToBacklog: z.boolean().default(true).describe('Whether to move uncompleted tasks to the backlog. (Not yet implemented)')
      }).shape,
    },
    async ({ moveUncompletedToBacklog }) => {
      const config = await configManager.get();
      const activeSprintIndex = config.sprints.findIndex(s => s.status === 'active');

      if (activeSprintIndex === -1) {
        return { isError: true, content: [{ type: 'text', text: 'No active sprint found to end.' }] };
      }

      const activeSprint = config.sprints[activeSprintIndex];
      activeSprint.status = 'completed';
      activeSprint.endDate = new Date().toISOString(); // Set actual end date

      // TODO: Implement logic to move uncompleted tasks to backlog (requires task API integration)
      if (moveUncompletedToBacklog) {
        // Placeholder for future implementation
        // For now, just a message to the user.
      }

      await configManager.save(config);

      return {
        content: [
          {
            type: 'text',
            text: `Sprint "${activeSprint.name}" successfully ended.`
          }
        ]
      };
    },
  );
}
