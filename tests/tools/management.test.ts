import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerManageChecklists } from '../../src/tools/manageChecklists.js';
import { registerManageDependencies } from '../../src/tools/manageDependencies.js';
import { registerManageDiscussions } from '../../src/tools/manageDiscussions.js';
import { registerManageReleases } from '../../src/tools/manageReleases.js';
import { registerManageSprints } from '../../src/tools/manageSprints.js';
import { registerManageWiki } from '../../src/tools/manageWiki.js';
import { registerCustomFields } from '../../src/tools/customFields.js';
import { db } from '../../src/db.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Task, Sprint, Release, WikiPage, Discussion } from '../../src/types.js';

// Mock DB
vi.mock('../../src/db.js', () => ({
  db: {
    getTaskById: vi.fn<[string], Promise<Task | undefined>>(),
    updateTask: vi.fn<[Task], Promise<void>>(),
    addAuditLog: vi.fn(),
    getSprints: vi.fn<[], Promise<Sprint[]>>(),
    addSprint: vi.fn<[Sprint], Promise<void>>(),
    getReleases: vi.fn<[], Promise<Release[]>>(),
    addRelease: vi.fn<[Release], Promise<void>>(),
    getWikiPages: vi.fn<[], Promise<WikiPage[]>>(),
    getWikiPageBySlug: vi.fn<[string], Promise<WikiPage | undefined>>(),
    saveWikiPage: vi.fn<[WikiPage], Promise<void>>(),
    getDiscussions: vi.fn<[], Promise<Discussion[]>>(),
    getDiscussionById: vi.fn<[string], Promise<Discussion | undefined>>(),
    saveDiscussion: vi.fn<[Discussion], Promise<void>>(),
  },
}));

// Mock Server
const mockServer = {
  registerTool: vi.fn<[string, unknown, (...args: unknown[]) => unknown], unknown>(),
};

// Helper to get handler
const getHandler = (name: string) =>
  (mockServer.registerTool as vi.Mock).mock.calls.find(
    (c: [string, unknown, (...args: unknown[]) => unknown]) => c[0] === name,
  )[2];

describe('Management Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('manage_checklists', () => {
    it('should add checklist', async () => {
      registerManageChecklists(mockServer as unknown as McpServer);
      const handler = getHandler('manage_checklists');
      (db.getTaskById as vi.Mock).mockResolvedValue({ id: '1', checklists: [] } as Task);

      await handler({ action: 'add_list', taskId: '1', title: 'List' });

      expect(db.updateTask).toHaveBeenCalled();
    });
  });

  describe('manage_dependencies', () => {
    it('should add dependency', async () => {
      registerManageDependencies(mockServer as unknown as McpServer);
      const handler = getHandler('manage_dependencies');
      (db.getTaskById as vi.Mock).mockImplementation((id: string) => {
        if (id === '1') return { id: '1', blockedBy: [] } as Task;
        if (id === '2') return { id: '2' } as Task;
        return undefined;
      });

      await handler({ action: 'add', taskId: '1', blockerId: '2' });

      expect(db.updateTask).toHaveBeenCalled();
    });
  });

  describe('manage_discussions', () => {
    it('should start discussion', async () => {
      registerManageDiscussions(mockServer as unknown as McpServer);
      const handler = getHandler('manage_discussions');

      await handler({ action: 'start', title: 'Topic', content: 'Body' });

      expect(db.saveDiscussion).toHaveBeenCalled();
    });
  });

  describe('manage_releases', () => {
    it('should create release', async () => {
      registerManageReleases(mockServer as unknown as McpServer);
      const handler = getHandler('manage_releases');

      await handler({ action: 'create', name: 'v1' });

      expect(db.addRelease).toHaveBeenCalled();
    });
  });

  describe('manage_sprints', () => {
    it('should create sprint', async () => {
      registerManageSprints(mockServer as unknown as McpServer);
      const handler = getHandler('manage_sprints');

      await handler({
        action: 'create',
        name: 'S1',
        startDate: '2024-01-01',
        endDate: '2024-01-14',
      });

      expect(db.addSprint).toHaveBeenCalled();
    });
  });

  describe('manage_wiki', () => {
    it('should register manage_wiki', async () => {
      registerManageWiki(mockServer as unknown as McpServer);
      const handler = getHandler('manage_wiki');
      expect(handler).toBeDefined();
    });
  });

  describe('custom_fields', () => {
    it('should set field', async () => {
      registerCustomFields(mockServer as unknown as McpServer);
      const handler = getHandler('custom_fields');
      (db.getTaskById as vi.Mock).mockResolvedValue({ id: '1', customFields: {} } as Task);

      await handler({ taskId: '1', key: 'k', value: 'v' });

      expect(db.updateTask).toHaveBeenCalled();
    });
  });
});
