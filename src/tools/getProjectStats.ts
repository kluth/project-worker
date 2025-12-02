import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';

export function registerGetProjectStats(server: McpServer) {
  server.registerTool(
    'get_project_stats',
    {
      description: 'Returns high-level statistics about the project workload. Useful for planning and analysis.',
      inputSchema: z.object({}).shape,
    },
    async () => {
      const tasks = await db.getTasks();
      const total = tasks.length;
      
      const byStatus = tasks.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const byPriority = tasks.reduce((acc, t) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const byAssignee = tasks.reduce((acc, t) => {
        const assignee = t.assignee || 'Unassigned';
        acc[assignee] = (acc[assignee] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const overdue = tasks.filter(t => 
        t.dueDate && 
        new Date(t.dueDate) < new Date() && 
        t.status !== 'done'
      ).length;

      const stats = {
        totalTasks: total,
        tasksByStatus: byStatus,
        tasksByPriority: byPriority,
        workloadByAssignee: byAssignee,
        overdueTasksCount: overdue
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    },
  );
}
