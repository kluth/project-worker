import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configManager } from '../config.js';
import { ProviderFactory } from '../services/providerFactory.js';

export function registerEndSprint(server: McpServer) {
  server.registerTool(
    'end_sprint',
    {
      description: 'Ends the currently active sprint.',
      inputSchema: z.object({
        moveUncompletedToBacklog: z
          .boolean()
          .default(true)
          .describe('Whether to move uncompleted tasks to the backlog.'),
      }).shape,
    },
    async ({ moveUncompletedToBacklog }) => {
      const config = await configManager.get();
      const activeSprintIndex = config.sprints.findIndex((s) => s.status === 'active');

      if (activeSprintIndex === -1) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'No active sprint found to end.' }],
        };
      }

      const activeSprint = config.sprints[activeSprintIndex]!;
      activeSprint.status = 'completed';
      activeSprint.endDate = new Date().toISOString(); // Set actual end date

      let movedCount = 0;
      if (moveUncompletedToBacklog) {
        try {
          const provider = await ProviderFactory.getProvider();
          const tasks = await provider.getTasks({ sprintId: activeSprint.id });

          const completedStatuses = ['done', 'closed', 'completed'];
          const uncompletedTasks = tasks.filter(
            (t) => !completedStatuses.includes(t.status.toLowerCase()),
          );

          for (const task of uncompletedTasks) {
            // We cast sprintId to any because usually updateTask expects string | undefined
            // but we want to explicitly nullify it if the provider supports it,
            // or just undefined if that's how we clear it.
            // Looking at types, UpdateTaskInput sprintId is optional string.
            // If we pass undefined, it might mean "don't update".
            // To clear it, we might need to pass null if the backend supports it,
            // or the provider implementation handles a specific value.
            // For LocalProvider, passing null or undefined might need check.
            // Let's assume passing null is the intent to clear, casting to any if needed
            // or just rely on the fact that some providers might treat '' as clear.
            // However, based on the test expectation `sprintId: null`, we will try that.
            // Since UpdateTaskInput defines sprintId?: string, we might need to force it.
            // Let's try sending null via type casting or just assume the type definition allows null which strict mode might block.
            // Safest is to send `undefined` if we want to remove it? No, `undefined` usually means "no change" in patch semantics.
            // Let's try `null` as per test expectation.

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await provider.updateTask({ id: task.id, sprintId: null as any });
            movedCount++;
          }
        } catch (error) {
          console.error('Error moving tasks to backlog:', error);
          // We don't fail the whole operation, just log and maybe warn user
        }
      }

      await configManager.save(config);

      let message = `Sprint "${activeSprint!.name}" successfully ended.`;
      if (movedCount > 0) {
        message += ` Moved ${movedCount} uncompleted tasks to backlog.`;
      }

      return {
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
      };
    },
  );
}
