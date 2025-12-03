import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ProviderFactory } from '../services/providerFactory.js';
import type { Task } from '../types.js';

export function registerGenerateStandup(server: McpServer): void {
  server.registerTool(
    'generate_standup',
    {
      description: 'Generate a daily standup report based on recent activity.',
      inputSchema: z.object({
        username: z.string().optional().describe('Filter tasks by assignee (e.g., "matthias")'),
      }).shape,
    },
    async ({ username }) => {
      const provider = await ProviderFactory.getProvider();
      const tasks = await provider.getTasks(); // Get all tasks (or filtered if provider supported it)

      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ...

      // Determine "Yesterday" start/end
      const lookBackDays = dayOfWeek === 1 ? 3 : 1; // If Mon, look back 3 days (Fri)

      const yesterdayStart = new Date(now);
      yesterdayStart.setDate(now.getDate() - lookBackDays);
      yesterdayStart.setHours(0, 0, 0, 0);

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      // Helper to check if date is in "Yesterday" range (Yesterday 00:00 -> Today 00:00)
      const wasYesterday = (dateStr?: string) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d >= yesterdayStart && d < todayStart;
      };

      // Filter Helper
      const isAssigned = (t: Task) => {
        if (!username) return true; // If no username, include all (or maybe restrict? assume "my" standup)
        // Simple case-insensitive partial match
        return t.assignee && t.assignee.toLowerCase().includes(username.toLowerCase());
      };

      // 1. Done Yesterday
      // We look for tasks with status='Done' updated yesterday.
      // Note: This is imperfect (could be updated for other reasons), but good proxy.
      // Ideally we check audit logs or 'completedAt' if available.
      const doneTasks = tasks.filter(
        (t) => t.status.toLowerCase() === 'done' && wasYesterday(t.updatedAt) && isAssigned(t),
      );

      // 2. Work Logged Yesterday (via local DB audit logs)
      // We check for 'actualHours' changes.
      // We need to fetch audit logs from DB? Or just rely on tasks?
      // Let's query the DB audit logs directly if possible.
      // Since 'db' is imported, we can use it.
      // But 'db' is local. If tasks are remote, we might not have logs.
      // We'll try to find tasks where we logged work.
      // We'll iterate all tasks and see if they have recent activity? No, that's expensive.
      // Let's just list the Done tasks for now, and maybe 'In Progress' that were updated yesterday.
      const workedOnTasks = tasks.filter(
        (t) =>
          t.status.toLowerCase() === 'in progress' && wasYesterday(t.updatedAt) && isAssigned(t),
      );

      // 3. Today's Plan (In Progress or Todo)
      const todayTasks = tasks.filter(
        (t) => ['in progress', 'todo'].includes(t.status.toLowerCase()) && isAssigned(t),
      );

      // 4. Blockers
      const blockers = tasks.filter(
        (t) =>
          (t.status.toLowerCase() === 'blocked' || (t.tags && t.tags.includes('blocked'))) &&
          isAssigned(t),
      );

      // Format Output
      let report = `**Daily Standup - ${now.toLocaleDateString()}**\n\n`;

      report += `**Yesterday** (since ${yesterdayStart.toLocaleDateString()})\n`;
      if (doneTasks.length === 0 && workedOnTasks.length === 0) {
        report += `- (No completed tasks or active work logged)\n`;
      }
      doneTasks.forEach((t) => (report += `- Completed: ${t.title} (#${t.id})\n`));
      workedOnTasks.forEach((t) => (report += `- Worked on: ${t.title} (#${t.id})\n`));

      report += `\n**Today**\n`;
      if (todayTasks.length === 0) {
        report += `- (No tasks planned)\n`;
      }
      todayTasks.forEach((t) => (report += `- [${t.status}] ${t.title} (#${t.id})\n`));

      report += `\n**Blockers**\n`;
      if (blockers.length === 0) {
        report += `- (None)\n`;
      } else {
        blockers.forEach((t) => (report += `- ⛔ ${t.title} (#${t.id})\n`));
      }

      return { content: [{ type: 'text', text: report }] };
    },
  );
}
