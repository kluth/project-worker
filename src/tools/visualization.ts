import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { VisualizationService } from '../services/visualizationService.js';
import { db } from '../db.js';

export function registerVisualizationTools(server: McpServer): void {
  server.registerTool(
    'view_burndown_chart',
    {
      description: 'View a sprint burndown chart.',
      inputSchema: z.object({
        sprintId: z.string().optional(),
      }).shape,
    },
    async ({ sprintId }) => {
      const chart = await VisualizationService.generateBurndownChart(sprintId);
      return { content: [{ type: 'text', text: chart }] };
    },
  );

  server.registerTool(
    'view_kanban_board',
    {
      description: 'View tasks in a Kanban board layout.',
      inputSchema: z.object({
        boardId: z.string().optional(),
      }).shape,
    },
    async ({ boardId }) => {
      const board = await VisualizationService.generateKanbanBoard(boardId);
      return { content: [{ type: 'text', text: board }] };
    },
  );

  server.registerTool(
    'view_work_heatmap',
    {
      description: 'View work log heatmap.',
      inputSchema: z.object({
        userId: z.string().optional(),
        days: z.number().default(30),
      }).shape,
    },
    async ({ userId, days }) => {
      const heatmap = await VisualizationService.generateWorkHeatmap(userId, days);
      return { content: [{ type: 'text', text: heatmap }] };
    },
  );

  server.registerTool(
    'get_dashboard',
    {
      description: 'Get a comprehensive project dashboard.',
      inputSchema: z.object({}).shape,
    },
    async () => {
      // Aggregate
      const burndown = await VisualizationService.generateBurndownChart();

      // Active Sprint Info
      const sprints = await db.getSprints();
      const activeSprint = sprints.find((s) => s.status === 'active');
      const sprintInfo = activeSprint ? `Active Sprint: ${activeSprint.name}` : 'No Active Sprint';

      // Tasks
      const tasks = await db.getTasks();
      const myTasks = tasks.filter((t) => t.status !== 'done').slice(0, 5);
      let taskList = 'My Top Tasks:\n';
      myTasks.forEach((t) => (taskList += `- ${t.title} [${t.status}]\n`));

      return {
        content: [
          {
            type: 'text',
            text: `
PROJECT DASHBOARD
=================
${new Date().toDateString()}

${sprintInfo}

${burndown}

${taskList}
          `.trim(),
          },
        ],
      };
    },
  );
}
