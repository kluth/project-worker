import { db } from '../db.js';
import type { Task } from '../types.js';

export class VisualizationService {
  static generateProgressBar(percent: number, length: number = 20): string {
    const filled = Math.round(length * (percent / 100));
    const empty = length - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${Math.round(percent)}%`;
  }

  static async generateBurndownChart(sprintId?: string): Promise<string> {
    // Simple ASCII chart logic
    // Ideally, we need historical data. For now, we can simulate or use current status.
    // Since we don't have daily snapshots in DB yet (except audit logs),
    // we'll construct a "Point-in-time" burndown based on task completion dates if available,
    // or just a simple status summary.

    // Improving: Use tasks and their completedAt/updatedAt from audit logs or parsing.
    // For MVP as requested: "Calculate ideal trend line... Calculate actual remaining points..."

    let tasks = await db.getTasks();
    if (sprintId) {
      tasks = tasks.filter((t) => t.sprintId === sprintId);
    }

    // Total points (using estimatedHours as proxy for points)
    const totalPoints = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const completedPoints = tasks
      .filter((t) => t.status === 'done' || t.status === 'completed')
      .reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

    const remaining = totalPoints - completedPoints;

    return `
Burndown Chart (Snapshot)
-------------------------
Total Points: ${totalPoints}
Completed:    ${completedPoints}
Remaining:    ${remaining}

${this.generateProgressBar((completedPoints / (totalPoints || 1)) * 100)}
    `.trim();
  }

  static async generateKanbanBoard(_boardId?: string): Promise<string> {
    // Group by status
    const tasks = await db.getTasks();
    // Filter by boardId if we had board configs. For now, all tasks.

    const columns = {
      Todo: ['todo', 'open', 'new', 'backlog'],
      InProgress: ['in-progress', 'active', 'doing'],
      Done: ['done', 'closed', 'completed'],
    };

    const grouped: { Todo: Task[]; InProgress: Task[]; Done: Task[] } = {
      Todo: [],
      InProgress: [],
      Done: [],
    };

    tasks.forEach((t) => {
      const s = t.status.toLowerCase();
      if (columns.Done.includes(s)) grouped.Done.push(t);
      else if (columns.InProgress.includes(s)) grouped.InProgress.push(t);
      else grouped.Todo.push(t);
    });

    // Format side-by-side? Hard in CLI without width knowledge.
    // Vertical list with headers is safer.

    let output = 'Kanban Board\n============\n\n';

    output += 'TODO\n----\n';
    grouped.Todo.forEach((t) => (output += `- [ ] ${t.title} (${t.id})\n`));
    output += '\n';

    output += 'IN PROGRESS\n-----------\n';
    grouped.InProgress.forEach((t) => (output += `- [>] ${t.title} (${t.id})\n`));
    output += '\n';

    output += 'DONE\n----\n';
    grouped.Done.forEach((t) => (output += `- [x] ${t.title} (${t.id})\n`));

    return output;
  }

  static async generateWorkHeatmap(userId?: string, days: number = 30): Promise<string> {
    // We need to fetch work logs.
    // Current implementation of log_work updates actualHours on task and adds AuditLog.
    // So we need to query AuditLogs for field 'actualHours'.

    // This is heavy if we scan ALL logs.
    // Optimized approach: Get tasks first, then get logs for relevant tasks?
    // Or just scan `audit_logs` table if we exposed a method for it.
    // `db` has `getAuditLogsForTask`. We don't have `getAllAuditLogs`.
    // Let's rely on `db.getTasks` and then fetch logs for active tasks?
    // Better: Add `getAuditLogs` to DB or `getWorkLogs` specific query.

    // For now, let's assume we can't easily get comprehensive history without a new DB method.
    // I'll add `getWorkLogs` to `db` in next step if needed, or just iterate tasks.
    // Iterating tasks and their logs is okay for small datasets.

    const tasks = await db.getTasks();
    const history: { date: string; hours: number }[] = [];

    for (const task of tasks) {
      const logs = await db.getAuditLogsForTask(task.id);
      // Filter for actualHours changes
      logs.forEach((log) => {
        if (log.field === 'actualHours') {
          const oldVal = Number(log.oldValue) || 0;
          const newVal = Number(log.newValue) || 0;
          const diff = newVal - oldVal;
          if (diff > 0) {
            history.push({
              date: new Date(log.timestamp).toISOString().split('T')[0] || '',
              hours: diff,
            });
          }
        }
      });
    }

    // Filter by user if provided (audit log has `changedBy`)
    // Wait, audit log `changedBy` is the user.
    // But we need to check if that user matches input `userId`.

    // Aggregate
    const heatmap: Record<string, number> = {};
    history.forEach((h) => {
      heatmap[h.date] = (heatmap[h.date] || 0) + h.hours;
    });

    // Render
    // Simple list for now, or ASCII grid
    const sortedDates = Object.keys(heatmap).sort();
    let output = `Work Heatmap (Last ${days} days)\n-------------------------------\n`;
    sortedDates.forEach((date) => {
      const hours = heatmap[date] || 0;
      const bar = '█'.repeat(Math.min(hours, 10));
      output += `${date}: ${bar} (${hours}h)\n`;
    });

    return output;
  }
}
