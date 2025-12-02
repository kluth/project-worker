import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerManageConnections } from '../../src/tools/manageConnections.js';
import { registerGitTools } from '../../src/tools/gitTools.js';
import { registerGetProjectStats } from '../../src/tools/getProjectStats.js';
import { registerGetTaskHistory } from '../../src/tools/getTaskHistory.js';
import { registerLogWork } from '../../src/tools/logWork.js';
import { configManager } from '../../src/config.js';
import { db } from '../../src/db.js';
import { ProviderFactory } from '../../src/services/providerFactory.js';

// Mock Config
vi.mock('../../src/config.js', () => ({
  configManager: {
    setActiveProvider: vi.fn(),
    setProviderConfig: vi.fn(),
    get: vi.fn(),
  }
}));

// Mock DB
vi.mock('../../src/db.js', () => ({
  db: {
    getTaskById: vi.fn(),
    updateTask: vi.fn(),
    addAuditLog: vi.fn(),
    getAuditLogsForTask: vi.fn(),
    getTasks: vi.fn(), // get_project_stats uses this
  }
}));

// Mock ProviderFactory
vi.mock('../../src/services/providerFactory.js', () => ({
  ProviderFactory: {
    getProvider: vi.fn(),
  }
}));

// Mock Child Process
const mockExec = vi.fn();
vi.mock('child_process', () => ({
  exec: (cmd: string, cb: any) => mockExec(cmd, cb),
}));

// Mock Server
const mockServer = {
  registerTool: vi.fn(),
};

const getHandler = (name: string) => (mockServer.registerTool as any).mock.calls.find((c: any) => c[0] === name)[2];

describe('Meta Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('manage_connections', () => {
    it('should set active provider', async () => {
      registerManageConnections(mockServer as any);
      const handler = getHandler('manage_connections');
      
      await handler({ action: 'set_active', provider: 'github' });
      
      expect(configManager.setActiveProvider).toHaveBeenCalledWith('github');
    });
  });

  describe('git_tools', () => {
    it('should create branch', async () => {
      registerGitTools(mockServer as any);
      const handler = getHandler('git_tools');
      (db.getTaskById as any).mockResolvedValue({ id: '1', title: 'Task' });
      mockExec.mockImplementation((cmd, cb) => cb(null, { stdout: '' }));
      
      await handler({ action: 'create_branch', taskId: '1' });
      
      expect(mockExec).toHaveBeenCalled();
      expect(db.updateTask).toHaveBeenCalled();
    });
  });

  describe('get_project_stats', () => {
    it('should return stats', async () => {
      registerGetProjectStats(mockServer as any);
      const handler = getHandler('get_project_stats');
      
      // get_project_stats uses db.getTasks
      (db.getTasks as any).mockResolvedValue([{ status: 'todo', priority: 'medium' }]);
      
      const result = await handler({});
      
      expect(JSON.parse(result.content[0].text).totalTasks).toBe(1);
    });
  });

  describe('get_task_history', () => {
    it('should return history', async () => {
      registerGetTaskHistory(mockServer as any);
      const handler = getHandler('get_task_history');
      (db.getAuditLogsForTask as any).mockResolvedValue([{ id: '1' }]);
      
      const result = await handler({ taskId: '1' });
      
      expect(JSON.parse(result.content[0].text)).toHaveLength(1);
    });
  });

  describe('log_work', () => {
    it('should log work', async () => {
      registerLogWork(mockServer as any);
      const handler = getHandler('log_work');
      (db.getTaskById as any).mockResolvedValue({ id: '1', actualHours: 0 });
      
      await handler({ taskId: '1', timeSpent: 1 });
      
      expect(db.updateTask).toHaveBeenCalled();
    });
  });
});