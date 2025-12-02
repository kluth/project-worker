import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerManageChecklists } from '../../src/tools/manageChecklists.js';
import { registerManageDependencies } from '../../src/tools/manageDependencies.js';
import { registerManageDiscussions } from '../../src/tools/manageDiscussions.js';
import { registerManageReleases } from '../../src/tools/manageReleases.js';
import { registerManageSprints } from '../../src/tools/manageSprints.js';
import { registerManageWiki } from '../../src/tools/manageWiki.js';
import { registerCustomFields } from '../../src/tools/customFields.js';
import { db } from '../../src/db.js';

// Mock DB
vi.mock('../../src/db.js', () => ({
  db: {
    getTaskById: vi.fn(),
    updateTask: vi.fn(),
    addAuditLog: vi.fn(),
    getSprints: vi.fn(),
    addSprint: vi.fn(),
    getReleases: vi.fn(),
    addRelease: vi.fn(),
    getWikiPages: vi.fn(),
    getWikiPageBySlug: vi.fn(),
    saveWikiPage: vi.fn(),
    getDiscussions: vi.fn(),
    getDiscussionById: vi.fn(),
    saveDiscussion: vi.fn(),
  }
}));

// Mock Server
const mockServer = {
  registerTool: vi.fn(),
};

// Helper to get handler
const getHandler = (name: string) => (mockServer.registerTool as any).mock.calls.find((c: any) => c[0] === name)[2];

describe('Management Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('manage_checklists', () => {
    it('should add checklist', async () => {
      registerManageChecklists(mockServer as any);
      const handler = getHandler('manage_checklists');
      (db.getTaskById as any).mockResolvedValue({ id: '1', checklists: [] });
      
      await handler({ action: 'add_list', taskId: '1', title: 'List' });
      
      expect(db.updateTask).toHaveBeenCalled();
    });
  });

  describe('manage_dependencies', () => {
    it('should add dependency', async () => {
      registerManageDependencies(mockServer as any);
      const handler = getHandler('manage_dependencies');
      (db.getTaskById as any).mockImplementation((id: string) => {
          if (id === '1') return { id: '1', blockedBy: [] };
          if (id === '2') return { id: '2' };
      });
      
      await handler({ action: 'add', taskId: '1', blockerId: '2' });
      
      expect(db.updateTask).toHaveBeenCalled();
    });
  });

  describe('manage_discussions', () => {
    it('should start discussion', async () => {
      registerManageDiscussions(mockServer as any);
      const handler = getHandler('manage_discussions');
      
      await handler({ action: 'start', title: 'Topic', content: 'Body' });
      
      expect(db.saveDiscussion).toHaveBeenCalled();
    });
  });

  describe('manage_releases', () => {
    it('should create release', async () => {
      registerManageReleases(mockServer as any);
      const handler = getHandler('manage_releases');
      
      await handler({ action: 'create', name: 'v1' });
      
      expect(db.addRelease).toHaveBeenCalled();
    });
  });

  describe('manage_sprints', () => {
    it('should create sprint', async () => {
      registerManageSprints(mockServer as any);
      const handler = getHandler('manage_sprints');
      
      await handler({ action: 'create', name: 'S1', startDate: '2024-01-01', endDate: '2024-01-14' });
      
      expect(db.addSprint).toHaveBeenCalled();
    });
  });

  describe('custom_fields', () => {
    it('should set field', async () => {
      registerCustomFields(mockServer as any);
      const handler = getHandler('custom_fields');
      (db.getTaskById as any).mockResolvedValue({ id: '1', customFields: {} });
      
      await handler({ taskId: '1', key: 'k', value: 'v' });
      
      expect(db.updateTask).toHaveBeenCalled();
    });
  });
});