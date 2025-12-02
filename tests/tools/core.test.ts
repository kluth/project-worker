import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCreateTask } from '../../src/tools/createTask.js';
import { registerGetTasks } from '../../src/tools/getTasks.js';
import { registerUpdateTask } from '../../src/tools/updateTask.js';
import { registerDeleteTask } from '../../src/tools/deleteTask.js';
import { registerSearchTasks } from '../../src/tools/searchTasks.js';
import { registerAddComment } from '../../src/tools/addComment.js';
import { ProviderFactory } from '../../src/services/providerFactory.js';
import { db } from '../../src/db.js';
import type { Task, CreateTaskInput, UpdateTaskInput, TaskFilter } from '../../src/types.js';
import type { ProjectProvider } from '../../src/providers/types.js';

// Mock ProviderFactory
vi.mock('../../src/services/providerFactory.js', () => ({
  ProviderFactory: {
    getProvider: vi.fn<[string?], Promise<ProjectProvider>>(),
  },
}));

// Mock DB for local tools (search_tasks still uses db directly)
vi.mock('../../src/db.js', () => ({
  db: {
    getTasks: vi.fn<[], Promise<Task[]>>(),
    addAuditLog: vi.fn(),
  },
}));

// Mock Provider
const mockProvider: ProjectProvider = {
  name: 'mock',
  createTask: vi.fn<[CreateTaskInput], Promise<Task>>(),
  getTasks: vi.fn<[TaskFilter?], Promise<Task[]>>(),
  getTaskById: vi.fn<[string], Promise<Task | undefined>>(),
  updateTask: vi.fn<[UpdateTaskInput], Promise<Task>>(),
  deleteTask: vi.fn<[string], Promise<boolean>>(),
  addComment: vi.fn<[string, string], Promise<Task>>(),
};

// Mock Server
const mockServer = {
  registerTool: vi.fn<[string, unknown, (...args: unknown[]) => unknown], unknown>(),
};

describe('Core Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ProviderFactory.getProvider as vi.Mock).mockResolvedValue(mockProvider);
    // Default mock for getTaskById so it doesn't break updateTask
    mockProvider.getTaskById.mockResolvedValue({
      id: '1',
      title: 'Original',
      description: 'Original description',
      status: 'todo',
      priority: 'medium',
      type: 'task',
      assignee: 'someone',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
      checklists: [],
      customFields: {},
      blockedBy: [],
      gitBranch: undefined
    });
  });

  describe('create_task', () => {
    it('should register and call create_task', async () => {
      registerCreateTask(mockServer as unknown as McpServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls.find(
        (c: [string, unknown, (...args: unknown[]) => unknown]) => c[0] === 'create_task',
      )[2];

      mockProvider.createTask.mockResolvedValue({ id: '1', title: 'Task' } as Task);

      const result = await handler({ title: 'Task', source: 'local' });

      expect(ProviderFactory.getProvider).toHaveBeenCalledWith('local');
      expect(mockProvider.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Task' }),
      );
      expect(JSON.parse(result.content[0].text)).toEqual({ id: '1', title: 'Task' });
    });
  });

  describe('get_tasks', () => {
    it('should register and call get_tasks', async () => {
      registerGetTasks(mockServer as unknown as McpServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls.find(
        (c: [string, unknown, (...args: unknown[]) => unknown]) => c[0] === 'get_tasks',
      )[2];

      mockProvider.getTasks.mockResolvedValue([{ id: '1', title: 'Task' }] as Task[]);

      const result = await handler({ status: 'todo' });

      expect(mockProvider.getTasks).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'todo' }),
      );
      expect(JSON.parse(result.content[0].text)).toHaveLength(1);
    });
  });

  describe('add_comment', () => {
    it('should register and call add_comment via provider', async () => {
      registerAddComment(mockServer as unknown as McpServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls.find(
        (c: [string, unknown, (...args: unknown[]) => unknown]) => c[0] === 'add_comment',
      )[2];

      mockProvider.addComment.mockResolvedValue({
        id: '1',
        comments: [{ content: 'New Comment' }],
      } as Task);

      const result = await handler({ taskId: '1', content: 'New Comment', source: 'github' });

      expect(ProviderFactory.getProvider).toHaveBeenCalledWith('github');
      expect(mockProvider.addComment).toHaveBeenCalledWith('1', 'New Comment');
      expect(result.content[0].text).toContain('New Comment');
    });
  });

  describe('update_task', () => {
    it('should register and call update_task via provider', async () => {
      registerUpdateTask(mockServer as unknown as McpServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls.find(
        (c: [string, unknown, (...args: unknown[]) => unknown]) => c[0] === 'update_task',
      )[2];

      mockProvider.updateTask.mockResolvedValue({ id: '1', title: 'Updated' } as Task);

      const result = await handler({ id: '1', title: 'Updated', source: 'local' });

      expect(ProviderFactory.getProvider).toHaveBeenCalledWith('local');
      expect(mockProvider.updateTask).toHaveBeenCalledWith(expect.objectContaining({ id: '1', title: 'Updated' }));
      expect(JSON.parse(result.content[0].text).title).toBe('Updated');
    });
  });

  describe('delete_task', () => {
    it('should register and call delete_task via provider', async () => {
      registerDeleteTask(mockServer as unknown as McpServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls.find(
        (c: [string, unknown, (...args: unknown[]) => unknown]) => c[0] === 'delete_task',
      )[2];

      mockProvider.deleteTask.mockResolvedValue(true);

      const result = await handler({ id: '1', source: 'local' });

      expect(ProviderFactory.getProvider).toHaveBeenCalledWith('local');
      expect(mockProvider.deleteTask).toHaveBeenCalledWith('1');
      expect(result.content[0].text).toContain('deleted');
    });
  });

  describe('search_tasks', () => {
    it('should register and call search_tasks', async () => {
      registerSearchTasks(mockServer as unknown as McpServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls.find(
        (c: [string, unknown, (...args: unknown[]) => unknown]) => c[0] === 'search_tasks',
      )[2];

      // search_tasks still uses db.getTasks directly because it's a local-only capability currently
      (db.getTasks as vi.Mock).mockResolvedValue([{ id: '1', title: 'Search Result', description: '', tags: [], comments: [] } as Task]);

      const result = await handler({ query: 'Search' });

      expect(db.getTasks).toHaveBeenCalled();
      expect(JSON.parse(result.content[0].text)).toHaveLength(1);
    });
  });
});
