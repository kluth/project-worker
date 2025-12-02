import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';
import { Sprint } from '../types.js';
import { randomUUID } from 'crypto';

export function registerStartSprint(server: McpServer) {
  server.registerTool(
    'start_sprint',
    {
      description: 'Starts a new sprint with a given name, duration, and goal.',
      inputSchema: z.object({
        name: z.string().describe('The name of the sprint'),
        duration: z.number().int().positive().describe('The duration of the sprint in weeks').default(2),
        goal: z.string().optional().describe('The goal of the sprint'),
      }).shape,
    },
    async ({ name, duration, goal }) => {
      const config = await configManager.get();

      // Check if there's already an active sprint
      if (config.sprints.some(s => s.status === 'active')) {
        return { isError: true, content: [{ type: 'text', text: 'An active sprint already exists. Please end it before starting a new one.' }] };
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + (duration * 7)); // Add weeks

      const newSprint: Sprint = {
        id: randomUUID(),
        name,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: 'active',
        goal,
      };

      config.sprints.push(newSprint);
      await configManager.save(config);

      return {
        content: [
          {
            type: 'text',
            text: `Sprint "${name}" started successfully! It will end on ${endDate.toLocaleDateString()}.`
          }
        ]
      };
    },
  );
}
