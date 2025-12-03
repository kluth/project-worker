import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ProviderFactory } from '../services/providerFactory.js';

// Simple ignore list (in addition to .gitignore if we were parsing it, but for now hardcoded common ignores)
const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', '.gemini'];

interface TodoItem {
  file: string;
  line: number;
  text: string;
  hash: string;
  context: string[];
}

function scanFile(filePath: string): TodoItem[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const todos: TodoItem[] = [];

  lines.forEach((line, index) => {
    // Regex for TODO/FIXME: // TODO: ..., # TODO: ..., /* TODO: ... */
    // Simple regex to catch standard patterns
    const match = line.match(/(\/\/|#|\/\*)\s*(TODO|FIXME):\s*(.*?)(\*\/|$)/i);
    if (match) {
      const text = (match[3] || '').trim();
      const context = lines.slice(index + 1, index + 4).map((l) => l.trim());

      // Generate hash to track this specific TODO instance
      const hash = crypto.createHash('md5').update(`${filePath}:${index}:${text}`).digest('hex');

      todos.push({
        file: filePath,
        line: index + 1,
        text,
        hash,
        context,
      });
    }
  });

  return todos;
}

function walkDir(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (IGNORED_DIRS.includes(file)) return;

    if (stat.isDirectory()) {
      walkDir(filePath, fileList);
    } else {
      // Simple extension check
      if (/\.(ts|js|py|java|c|cpp|h|rs|go|md)$/.test(file)) {
        fileList.push(filePath);
      }
    }
  });
  return fileList;
}

export function registerScanTodos(server: McpServer): void {
  server.registerTool(
    'scan_todos',
    {
      description: 'Scan codebase for TODO/FIXME comments and optionally create tasks.',
      inputSchema: z.object({
        path: z.string().optional().default('.').describe('Root path to scan'),
        create: z.boolean().default(false).describe('Auto-create tasks for found items?'),
      }).shape,
    },
    async ({ path: rootPath, create }) => {
      const files = walkDir(rootPath || '.');
      let allTodos: TodoItem[] = [];

      files.forEach((f) => {
        allTodos = allTodos.concat(scanFile(f));
      });

      if (allTodos.length === 0) {
        return { content: [{ type: 'text', text: 'No TODOs found in scanned files.' }] };
      }

      let output = `Found ${allTodos.length} TODOs:\n`;
      let createdCount = 0;

      // If 'create' is requested, we need a provider.
      // We also need to check if we've already created them.
      // For this MVP, we'll check against local DB tasks if title matches?
      // Or just create blindly if requested.
      // Ideally, we store 'hash' in a custom field or tags to avoid duplicates.

      if (create) {
        const provider = await ProviderFactory.getProvider();

        for (const todo of allTodos) {
          // Check if we already tracked this hash?
          // DB tasks check is expensive. Let's check duplicates in current run or skip check for MVP.
          // We'll tag them 'technical-debt' and 'auto-todo'.

          try {
            await provider.createTask({
              title: `Tech Debt: ${todo.text}`,
              description: `Source: \`${todo.file}:${todo.line}\`\n\nContext:\n\`\`\`\n${todo.context.join('\n')}\n\`\`\``,
              type: 'task',
              priority: 'low',
              tags: ['technical-debt', 'auto-todo'],
            });
            createdCount++;
          } catch (e) {
            console.error(`Failed to create task for ${todo.hash}`, e);
          }
        }
        output += `\nSuccessfully created ${createdCount} tasks from TODOs.\n`;
      } else {
        // Just list them
        allTodos.forEach((t) => {
          output += `- [${t.file}:${t.line}] ${t.text}\n`;
        });
        output += `\nRun with 'create=true' to convert these to tasks.`;
      }

      return { content: [{ type: 'text', text: output }] };
    },
  );
}
