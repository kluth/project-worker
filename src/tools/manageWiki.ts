import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';
import type { WikiPage, WikiPageVersion } from '../types.js';
import { randomUUID } from 'crypto';
import os from 'os';

export function registerManageWiki(server: McpServer): void {
  server.registerTool(
    'manage_wiki',
    {
      description: 'Create, read, update, and list wiki pages for project documentation.',
      inputSchema: z.object({
        action: z
          .enum(['create', 'read', 'update', 'list', 'search', 'history'])
          .describe('Action to perform'),
        slug: z
          .string()
          .optional()
          .describe('The unique identifier for the page (e.g., "api-docs")'),
        title: z.string().optional(),
        content: z.string().optional(),
        tags: z.array(z.string()).optional(),
        query: z.string().optional().describe('Search query'),
        version: z.number().optional().describe('Version number to read'),
        commitMessage: z.string().optional().describe('Message describing the change'),
      }).shape,
    },
    async ({ action, slug, title, content, tags, query, version, commitMessage }) => {
      if (action === 'list') {
        const pages = await db.getWikiPages();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                pages.map((p) => ({ slug: p.slug, title: p.title })),
                null,
                2,
              ),
            },
          ],
        };
      }

      if (action === 'search') {
        if (!query)
          return {
            isError: true,
            content: [{ type: 'text', text: 'Query is required for search' }],
          };
        const pages = await db.searchWikiPages(query);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                pages.map((p) => ({ slug: p.slug, title: p.title })),
                null,
                2,
              ),
            },
          ],
        };
      }

      if (!slug) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Slug is required for create/read/update/history' }],
        };
      }

      if (action === 'read') {
        const page = await db.getWikiPageBySlug(slug);
        if (!page)
          return { isError: true, content: [{ type: 'text', text: `Page '${slug}' not found` }] };

        if (version !== undefined) {
          const v = page.versions?.find((ver) => ver.version === version);
          if (!v) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Version ${version} not found for page '${slug}'` }],
            };
          }
          // Return the version content as if it were the page
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ ...page, content: v.content, version: v.version }, null, 2),
              },
            ],
          };
        }
        return { content: [{ type: 'text', text: JSON.stringify(page, null, 2) }] };
      }

      if (action === 'history') {
        const page = await db.getWikiPageBySlug(slug);
        if (!page)
          return { isError: true, content: [{ type: 'text', text: `Page '${slug}' not found` }] };
        return {
          content: [{ type: 'text', text: JSON.stringify(page.versions || [], null, 2) }],
        };
      }

      if (action === 'create') {
        const existing = await db.getWikiPageBySlug(slug);
        if (existing)
          return {
            isError: true,
            content: [{ type: 'text', text: `Page '${slug}' already exists. Use update.` }],
          };
        if (!title || !content)
          return {
            isError: true,
            content: [{ type: 'text', text: 'Title and content required for create' }],
          };

        const newPage: WikiPage = {
          id: randomUUID(),
          slug,
          title,
          content,
          tags: tags || [],
          lastUpdated: new Date().toISOString(),
          versions: [],
        };
        await db.saveWikiPage(newPage);
        return { content: [{ type: 'text', text: `Created page: ${slug}` }] };
      }

      if (action === 'update') {
        const page = await db.getWikiPageBySlug(slug);
        if (!page)
          return { isError: true, content: [{ type: 'text', text: `Page '${slug}' not found` }] };

        // Save current state as a version
        let updatedBy = 'unknown';
        try {
          updatedBy = os.userInfo().username;
        } catch {
          // ignore
        }

        const newVersion: WikiPageVersion = {
          version: (page.versions?.length || 0) + 1,
          content: page.content, // The content BEFORE this update
          updatedAt: page.lastUpdated,
          updatedBy,
          commitMessage: commitMessage || 'Update',
        };

        if (!page.versions) page.versions = [];
        page.versions.push(newVersion);

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
