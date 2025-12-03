import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';
import type { PomodoroSession, PersonalTodo } from '../types.js';
import { randomUUID } from 'crypto';

export function registerPersonalProductivity(server: McpServer): void {
  // Start Pomodoro
  server.registerTool(
    'start_pomodoro',
    {
      description: 'Start a Pomodoro timer session.',
      inputSchema: z.object({
        durationMinutes: z.number().default(25).describe('Duration in minutes (default 25)'),
        label: z.string().optional().describe('Label or task name for the session'),
      }).shape,
    },
    async ({ durationMinutes, label }) => {
      const now = new Date();
      const endTime = new Date(now.getTime() + durationMinutes * 60000);

      const session: PomodoroSession = {
        id: randomUUID(),
        startTime: now.toISOString(),
        endTime: endTime.toISOString(),
        durationMinutes,
        label,
        status: 'running',
      };

      await db.savePomodoroSession(session);

      return {
        content: [
          {
            type: 'text',
            text: `Pomodoro session started! ${durationMinutes} minutes. Ends at ${endTime.toLocaleTimeString()}.`,
          },
        ],
      };
    },
  );

  // Check Pomodoro Status
  server.registerTool(
    'check_pomodoro',
    {
      description: 'Check the status of recent Pomodoro sessions.',
      inputSchema: z.object({}).shape,
    },
    async () => {
      const sessions = await db.getPomodoroSessions();
      // Filter for active or recently completed
      const now = new Date();
      const active = sessions.find((s) => s.status === 'running' && new Date(s.endTime) > now);

      if (active) {
        const remainingMs = new Date(active.endTime).getTime() - now.getTime();
        const remainingMins = Math.ceil(remainingMs / 60000);
        return {
          content: [
            {
              type: 'text',
              text: `Active session: "${active.label || 'Focus'}" - ${remainingMins} mins remaining.`,
            },
          ],
        };
      }

      return {
        content: [{ type: 'text', text: 'No active Pomodoro session.' }],
      };
    },
  );

  // Personal Todo
  server.registerTool(
    'personal_todo',
    {
      description: 'Manage personal to-do list.',
      inputSchema: z.object({
        action: z.enum(['add', 'list', 'complete', 'delete']).describe('Action to perform'),
        text: z.string().optional().describe('Text of the todo item'),
        id: z.string().optional().describe('ID of the todo item (for complete/delete)'),
      }).shape,
    },
    async ({ action, text, id }) => {
      if (action === 'list') {
        const todos = await db.getPersonalTodos();
        const pending = todos.filter((t) => !t.isCompleted);
        const completed = todos.filter((t) => t.isCompleted);

        let output = 'Personal To-Do List:\n';
        if (pending.length === 0 && completed.length === 0)
          return { content: [{ type: 'text', text: 'Your list is empty.' }] };

        if (pending.length > 0) {
          output += '\nPending:\n';
          pending.forEach((t) => (output += `- [ ] ${t.text} (ID: ${t.id})\n`));
        }
        if (completed.length > 0) {
          output += '\nCompleted:\n';
          completed.forEach((t) => (output += `- [x] ${t.text} (ID: ${t.id})\n`));
        }

        return { content: [{ type: 'text', text: output }] };
      }

      if (action === 'add') {
        if (!text)
          return {
            isError: true,
            content: [{ type: 'text', text: 'Text is required to add a todo.' }],
          };
        const newTodo: PersonalTodo = {
          id: randomUUID(),
          text,
          isCompleted: false,
          createdAt: new Date().toISOString(),
        };
        await db.savePersonalTodo(newTodo);
        return { content: [{ type: 'text', text: `Added: "${text}"` }] };
      }

      if (action === 'complete') {
        if (!id)
          return {
            isError: true,
            content: [{ type: 'text', text: 'ID is required to complete a todo.' }],
          };
        const todo = await db.getPersonalTodoById(id);
        if (!todo)
          return {
            isError: true,
            content: [{ type: 'text', text: 'Todo not found.' }],
          };

        todo.isCompleted = true;
        todo.completedAt = new Date().toISOString();
        await db.savePersonalTodo(todo);
        return {
          content: [{ type: 'text', text: `Completed: "${todo.text}"` }],
        };
      }

      if (action === 'delete') {
        if (!id)
          return {
            isError: true,
            content: [{ type: 'text', text: 'ID is required to delete a todo.' }],
          };
        await db.deletePersonalTodo(id);
        return { content: [{ type: 'text', text: 'Deleted todo.' }] };
      }

      return {
        isError: true,
        content: [{ type: 'text', text: 'Invalid action' }],
      };
    },
  );
}
