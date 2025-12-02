import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';
import { Release } from '../types.js';
import { randomUUID } from 'crypto';

export function registerManageReleases(server: McpServer) {
  server.registerTool(
    'manage_releases',
    {
      description: 'Manage software releases/versions (Jira-style).',
      inputSchema: z.object({
        action: z.enum(['create', 'list', 'update']).describe('Action to perform'),
        name: z.string().optional().describe('Release name (e.g., v1.0)'),
        status: z.enum(['planned', 'released', 'archived']).optional(),
        releaseDate: z.string().optional(),
        description: z.string().optional(),
      }).shape,
    },
    async (input) => {
      if (input.action === 'create') {
        if (!input.name) return { isError: true, content: [{ type: 'text', text: 'Name required' }] };
        
        const newRelease: Release = {
          id: randomUUID(),
          name: input.name,
          status: input.status || 'planned',
          releaseDate: input.releaseDate,
          description: input.description
        };
        
        await db.addRelease(newRelease);
        return { content: [{ type: 'text', text: JSON.stringify(newRelease, null, 2) }] };
      }

      if (input.action === 'list') {
        const releases = await db.getReleases();
        return { content: [{ type: 'text', text: JSON.stringify(releases, null, 2) }] };
      }

      return { isError: true, content: [{ type: 'text', text: 'Invalid action' }] };
    },
  );
}
