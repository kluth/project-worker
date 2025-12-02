import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';
import { WikiPage } from '../types.js';
import { randomUUID } from 'crypto';

export function registerManageWiki(server: McpServer) {
  server.registerTool(
    'manage_wiki',
    {
      description: 'Create, read, update, and list wiki pages for project documentation.',
      inputSchema: z.object({
        action: z.enum(['create', 'read', 'update', 'list']).describe('Action to perform'),
        slug: z.string().optional().describe('The unique identifier for the page (e.g., "api-docs")'),
        title: z.string().optional(),
        content: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }).shape,
    },
    async ({ action, slug, title, content, tags }) => {
      
      if (action === 'list') {
        const pages = await db.getWikiPages();
        return { content: [{ type: 'text', text: JSON.stringify(pages.map(p => ({ slug: p.slug, title: p.title })), null, 2) }] };
      }

      if (!slug) {
        return { isError: true, content: [{ type: 'text', text: 'Slug is required for create/read/update' }] };
      }

      if (action === 'read') {
        const page = await db.getWikiPageBySlug(slug);
        if (!page) return { isError: true, content: [{ type: 'text', text: `Page '${slug}' not found` }] };
        return { content: [{ type: 'text', text: JSON.stringify(page, null, 2) }] };
      }

      if (action === 'create') {
        const existing = await db.getWikiPageBySlug(slug);
        if (existing) return { isError: true, content: [{ type: 'text', text: `Page '${slug}' already exists. Use update.` }] };
        if (!title || !content) return { isError: true, content: [{ type: 'text', text: 'Title and content required for create' }] };

        const newPage: WikiPage = {
          id: randomUUID(),
          slug,
          title,
          content,
          tags: tags || [],
          lastUpdated: new Date().toISOString()
        };
        await db.saveWikiPage(newPage);
        return { content: [{ type: 'text', text: `Created page: ${slug}` }] };
      }

      if (action === 'update') {
        const page = await db.getWikiPageBySlug(slug);
        if (!page) return { isError: true, content: [{ type: 'text', text: `Page '${slug}' not found` }] };

        if (title) page.title = title;
        if (content) page.content = content;
        if (tags) page.tags = tags;
        page.lastUpdated = new Date().toISOString();

        await db.saveWikiPage(page);
        return { content: [{ type: 'text', text: `Updated page: ${slug}` }] };
      }

      return { isError: true, content: [{ type: 'text', text: 'Invalid action' }] };
    },
  );
}
