import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerManageWiki } from '../../src/tools/manageWiki.js';
import { db } from '../../src/db.js';
import type { WikiPage } from '../../src/types.js';
import os from 'os';

// Mock DB
vi.mock('../../src/db.js', () => ({
  db: {
    getWikiPages: vi.fn(),
    getWikiPageBySlug: vi.fn(),
    saveWikiPage: vi.fn(),
    searchWikiPages: vi.fn(),
  },
}));

describe('Wiki Management Tools', () => {
  let mockServer: McpServer;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = { registerTool: vi.fn() } as unknown as McpServer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(os, 'userInfo').mockReturnValue({ username: 'wikiuser' } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getHandler = () => {
    return (mockServer.registerTool as vi.Mock).mock.calls.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => c[0] === 'manage_wiki',
    )[2];
  };

  it('should register manage_wiki tool', () => {
    registerManageWiki(mockServer);
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'manage_wiki',
      expect.any(Object),
      expect.any(Function),
    );
  });

  it('should create a page with initialized versions', async () => {
    registerManageWiki(mockServer);
    const handler = getHandler();
    (db.getWikiPageBySlug as vi.Mock).mockResolvedValue(undefined); // No existing page

    await handler({ action: 'create', slug: 'new-page', title: 'New Page', content: 'Content' });

    expect(db.saveWikiPage).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'new-page',
        versions: [],
      }),
    );
  });

  it('should update a page and create a version', async () => {
    registerManageWiki(mockServer);
    const handler = getHandler();
    const existingPage: WikiPage = {
      id: '1',
      slug: 'page',
      title: 'Title',
      content: 'Old Content',
      tags: [],
      lastUpdated: '2023-01-01',
      versions: [],
    };
    (db.getWikiPageBySlug as vi.Mock).mockResolvedValue(existingPage);

    await handler({
      action: 'update',
      slug: 'page',
      content: 'New Content',
      commitMessage: 'Fix typo',
    });

    expect(db.saveWikiPage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'New Content',
        versions: expect.arrayContaining([
          expect.objectContaining({
            version: 1,
            content: 'Old Content',
            updatedBy: 'wikiuser',
            commitMessage: 'Fix typo',
          }),
        ]),
      }),
    );
  });

  it('should search pages', async () => {
    registerManageWiki(mockServer);
    const handler = getHandler();
    (db.searchWikiPages as vi.Mock).mockResolvedValue([{ slug: 'found', title: 'Found Page' }]);

    const result = await handler({ action: 'search', query: 'term' });

    expect(db.searchWikiPages).toHaveBeenCalledWith('term');
    expect(result.content[0].text).toContain('Found Page');
  });

  it('should return history', async () => {
    registerManageWiki(mockServer);
    const handler = getHandler();
    const page: WikiPage = {
      id: '1',
      slug: 'page',
      title: 'Title',
      content: 'Current',
      tags: [],
      lastUpdated: '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      versions: [{ version: 1, content: 'Old', updatedAt: '', updatedBy: 'u' } as any],
    };
    (db.getWikiPageBySlug as vi.Mock).mockResolvedValue(page);

    const result = await handler({ action: 'history', slug: 'page' });

    expect(result.content[0].text).toContain('Old');
  });

  it('should read a specific version', async () => {
    registerManageWiki(mockServer);
    const handler = getHandler();
    const page: WikiPage = {
      id: '1',
      slug: 'page',
      title: 'Title',
      content: 'Current',
      tags: [],
      lastUpdated: '',
      versions: [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { version: 1, content: 'Old Content', updatedAt: '', updatedBy: 'u' } as any,
      ],
    };
    (db.getWikiPageBySlug as vi.Mock).mockResolvedValue(page);

    const result = await handler({ action: 'read', slug: 'page', version: 1 });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.content).toBe('Old Content');
    expect(parsed.version).toBe(1);
  });
});
