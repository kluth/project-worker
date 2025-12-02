import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';
import { AuditService } from '../services/auditService.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function registerGitTools(server: McpServer): void {
  // Added void return type
  server.registerTool(
    'git_tools',
    {
      description: 'Git integration: create branches for tasks or generate commit messages.',
      inputSchema: z.object({
        action: z.enum(['create_branch', 'get_commit_msg']).describe('Action to perform'),
        taskId: z.string().describe('The associated Task ID'),
      }).shape,
    },
    async ({ action, taskId }) => {
      const task = await db.getTaskById(taskId);
      if (!task)
        return { isError: true, content: [{ type: 'text', text: `Task ${taskId} not found` }] };

      if (action === 'create_branch') {
        // Sanitize title for branch name
        const slug = task.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        const branchName = `feature/${taskId}-${slug}`;

        try {
          // In a real CLI, we might want to verify we are in a git repo
          // For now, we attempt it and report back
          await execAsync(`git checkout -b ${branchName}`);

          // Update task with branch info
          const oldBranch = task.gitBranch;
          task.gitBranch = branchName;
          await db.updateTask(task);
          await AuditService.logChange(taskId, 'gitBranch', oldBranch, branchName);

          return {
            content: [{ type: 'text', text: `Created and checked out branch: ${branchName}` }],
          };
        } catch (error: unknown) {
          // Changed to unknown
          let errorMessage = 'An unknown error occurred.';
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to create branch: ${errorMessage}` }],
          };
        }
      }

      if (action === 'get_commit_msg') {
        const type = task.title.toLowerCase().startsWith('fix') ? 'fix' : 'feat';
        const msg = `${type}: ${task.title} (${taskId})`;
        return { content: [{ type: 'text', text: msg }] };
      }

      return { isError: true, content: [{ type: 'text', text: 'Invalid action' }] };
    },
  );
}
