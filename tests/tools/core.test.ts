import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCreateTask } from '../../src/tools/createTask.js';
import { registerGetTasks } from '../../src/tools/getTasks.js';
import { registerUpdateTask } from '../../src/tools/updateTask.js';
import { registerDeleteTask } from '../../src/tools/deleteTask.js';
import { registerSearchTasks } from '../../src/tools/searchTasks.js';
import { ProviderFactory } from '../../src/services/providerFactory.js';
import { db } from '../../src/db.js';

// Mock ProviderFactory
vi.mock('../../src/services/providerFactory.js', () => ({
  ProviderFactory: {
    getProvider: vi.fn()
  }
}));

// Mock DB for local tools
vi.mock('../../src/db.js', () => ({
  db: {
    getTasks: vi.fn(),
    getTaskById: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    addAuditLog: vi.fn() // update_task uses this
  }
}));

// Mock Provider
const mockProvider = {
  createTask: vi.fn(),
  getTasks: vi.fn(),
  updateTask: vi.fn(), // Not used by update_task tool (it uses DB directly)
  deleteTask: vi.fn(), // Not used by delete_task tool (it uses DB directly)
};

// Mock Server
const mockServer = {
  registerTool: vi.fn(),
};

describe('Core Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ProviderFactory.getProvider as any).mockResolvedValue(mockProvider);
  });

  describe('create_task', () => {
    it('should register and call create_task', async () => {
      registerCreateTask(mockServer as any);
      const handler = (mockServer.registerTool as any).mock.calls.find((c: any) => c[0] === 'create_task')[2];
      
      mockProvider.createTask.mockResolvedValue({ id: '1', title: 'Task' });
      
      const result = await handler({ title: 'Task', source: 'local' });
      
      expect(ProviderFactory.getProvider).toHaveBeenCalledWith('local');
      expect(mockProvider.createTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Task' }));
      expect(JSON.parse(result.content[0].text)).toEqual({ id: '1', title: 'Task' });
    });
  });

  describe('get_tasks', () => {
    it('should register and call get_tasks', async () => {
      registerGetTasks(mockServer as any);
      const handler = (mockServer.registerTool as any).mock.calls.find((c: any) => c[0] === 'get_tasks')[2];
      
      mockProvider.getTasks.mockResolvedValue([{ id: '1', title: 'Task' }]);
      
      const result = await handler({ status: 'todo' });
      
      expect(mockProvider.getTasks).toHaveBeenCalledWith(expect.objectContaining({ status: 'todo' }));
      expect(JSON.parse(result.content[0].text)).toHaveLength(1);
    });
  });

  describe('update_task', () => {
    it('should register and call update_task', async () => {
      registerUpdateTask(mockServer as any);
      const handler = (mockServer.registerTool as any).mock.calls.find((c: any) => c[0] === 'update_task')[2];
      
      // update_task uses db directly, not provider
      (db.getTaskById as any).mockResolvedValue({ id: '1', title: 'Old', tags: [] });
      
      const result = await handler({ id: '1', title: 'Updated' });
      
      expect(db.updateTask).toHaveBeenCalledWith(expect.objectContaining({ id: '1', title: 'Updated' }));
      expect(JSON.parse(result.content[0].text).title).toBe('Updated');
    });
  });

  describe('delete_task', () => {
    it('should register and call delete_task', async () => {
      registerDeleteTask(mockServer as any);
      const handler = (mockServer.registerTool as any).mock.calls.find((c: any) => c[0] === 'delete_task')[2];
      
      // delete_task uses db directly
      (db.deleteTask as any).mockResolvedValue(true);
      
      const result = await handler({ id: '1' });
      
      expect(db.deleteTask).toHaveBeenCalledWith('1');
      expect(result.content[0].text).toContain('deleted');
    });
  });

  describe('search_tasks', () => {
    it('should register and call search_tasks', async () => {
      registerSearchTasks(mockServer as any);
      const handler = (mockServer.registerTool as any).mock.calls.find((c: any) => c[0] === 'search_tasks')[2];
      
      // search_tasks uses db.getTasks directly
      (db.getTasks as any).mockResolvedValue([{ id: '1', title: 'Search Result', description: '', tags: [], comments: [] }]);
      
      const result = await handler({ query: 'Search' });
      
      expect(db.getTasks).toHaveBeenCalled();
      expect(JSON.parse(result.content[0].text)).toHaveLength(1);
    });
  });
});