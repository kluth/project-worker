import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';
import { randomUUID } from 'crypto';

export function registerManageChecklists(server: McpServer): void {
  server.registerTool(
    'manage_checklists',
    {
      description: 'Manage Trello-style checklists within a task.',
      inputSchema: z.object({
        action: z.enum(['add_list', 'add_item', 'toggle_item', 'remove_item']).describe('Action'),
        taskId: z.string().describe('Task ID'),
        title: z.string().optional().describe('Checklist title (for add_list)'),
        content: z.string().optional().describe('Item text (for add_item)'),
        itemId: z.string().optional().describe('Item ID (for toggle/remove)'),
        checklistId: z
          .string()
          .optional()
          .describe('Checklist ID (optional if task has only one, required for multiple)'),
      }).shape,
    },
    async ({ action, taskId, title, content, itemId, checklistId }) => {
      const task = await db.getTaskById(taskId);
      if (!task)
        return { isError: true, content: [{ type: 'text', text: `Task ${taskId} not found` }] };

      // Ensure checklists array exists
      if (!task.checklists) task.checklists = [];

      if (action === 'add_list') {
        if (!title) return { isError: true, content: [{ type: 'text', text: 'Title required' }] };
        task.checklists.push({
          id: randomUUID(),
          title,
          items: [],
        });
        await db.updateTask(task);
        return { content: [{ type: 'text', text: 'Checklist added' }] };
      }

      // Helper to find list
      let list = checklistId
        ? task.checklists.find((c) => c.id === checklistId)
        : task.checklists[0]; // Default to first list

      if (!list) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'No checklist found on this task' }],
        };
      }

      if (action === 'add_item') {
        if (!content)
          return { isError: true, content: [{ type: 'text', text: 'Content required' }] };
        list.items.push({
          // Removed '!'
          id: randomUUID(),
          text: content,
          completed: false,
        });
        await db.updateTask(task);
        return { content: [{ type: 'text', text: 'Item added' }] };
      }

      if (action === 'toggle_item' || action === 'remove_item') {
        if (!itemId) return { isError: true, content: [{ type: 'text', text: 'ItemId required' }] };

        // We might need to search across all lists if list isn't explicit
        if (!list) {
          // Check again in case it was explicitly undefined.
          // Search all lists
          for (const c of task.checklists) {
            if (c.items.some((i) => i.id === itemId)) {
              list = c;
              break;
            }
          }
        }

        if (!list) return { isError: true, content: [{ type: 'text', text: 'Item not found' }] };

        if (action === 'toggle_item') {
          const item = list.items.find((i) => i.id === itemId);
          if (item) item.completed = !item.completed;
        } else {
          list.items = list.items.filter((i) => i.id !== itemId);
        }

        await db.updateTask(task);
        return { content: [{ type: 'text', text: 'Item updated' }] };
      }

      return { isError: true, content: [{ type: 'text', text: 'Invalid action' }] };
    },
  );
}
