import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerManageConnections } from '../../src/tools/manageConnections.js';
import { registerGitTools } from '../../src/tools/gitTools.js';
import { registerGetProjectStats } from '../../src/tools/getProjectStats.js';
import { registerGetTaskHistory } from '../../src/tools/getTaskHistory.js';
import { registerLogWork } from '../../src/tools/logWork.js';
import { configManager } from '../../src/config.js';
import { db } from '../../src/db.js';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Task, AuditLogEntry } from '../../src/types.js';

// Mock Config
vi.mock('../../src/config.js', () => ({
  configManager: {
    setActiveProvider: vi.fn(),
    setProviderConfig: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock DB
vi.mock('../../src/db.js', () => ({
  db: {
    getTaskById: vi.fn<[string], Promise<Task | undefined>>(), // Typed
    updateTask: vi.fn<[Task], Promise<void>>(), // Typed
    addAuditLog: vi.fn<[AuditLogEntry], Promise<void>>(), // Typed
    getAuditLogsForTask: vi.fn<[string], Promise<AuditLogEntry[]>>(), // Typed
    getTasks: vi.fn<[], Promise<Task[]>>(), // get_project_stats uses this // Typed
  },
}));

// Mock ProviderFactory
vi.mock('../../src/services/providerFactory.js', async (importOriginal) => {
  const mod = await importOriginal(); // Removed type annotation here
  return {
    ...mod,
    ProviderFactory: {
      getProvider: vi.fn(),
    },
  };
});

// Mock Child Process
const mockExec = vi.fn(
  (cmd: string, cb: (error: Error | null, stdout: string, stderr: string) => void) =>
    mockExec(cmd, cb),
);
vi.mock('child_process', () => ({
  exec: mockExec,
}));

// Mock Server
const mockServer = {
  registerTool: vi.fn<[string, unknown, (...args: unknown[]) => unknown], unknown>(), // Typed registerTool
};

const getHandler = (name: string) =>
  (mockServer.registerTool as vi.Mock).mock.calls.find(
    (c: [string, unknown, (...args: unknown[]) => unknown]) => c[0] === name,
  )[2];

describe('Meta Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('manage_connections', () => {
    it('should set active provider', async () => {
      registerManageConnections(mockServer as unknown as McpServer); // Cast to McpServer
      const handler = getHandler('manage_connections');

      await handler({ action: 'set_active', provider: 'github' });

      expect(configManager.setActiveProvider).toHaveBeenCalledWith('github');
    });
  });

  describe('git_tools', () => {
    it('should create branch', async () => {
      registerGitTools(mockServer as unknown as McpServer); // Cast to McpServer
      const handler = getHandler('git_tools');
      (db.getTaskById as vi.Mock).mockResolvedValue({ id: '1', title: 'Task' } as Task); // Typed mock and cast
      mockExec.mockImplementation((cmd, cb) => cb(null, { stdout: '' }));

      await handler({ action: 'create_branch', taskId: '1' });

      expect(mockExec).toHaveBeenCalled();
      expect(db.updateTask).toHaveBeenCalled();
    });
  });

  describe('get_project_stats', () => {
    it('should return stats', async () => {
      registerGetProjectStats(mockServer as unknown as McpServer); // Cast to McpServer
      const handler = getHandler('get_project_stats');

      // get_project_stats uses db.getTasks
      (db.getTasks as vi.Mock).mockResolvedValue([
        { status: 'todo', priority: 'medium' },
      ] as Task[]); // Typed mock and cast

      const result = await handler({});

      expect(JSON.parse(result.content[0].text).totalTasks).toBe(1);
    });
  });

  describe('get_task_history', () => {
    it('should return history', async () => {
      registerGetTaskHistory(mockServer as unknown as McpServer); // Cast to McpServer
      const handler = getHandler('get_task_history');
      (db.getAuditLogsForTask as vi.Mock).mockResolvedValue([{ id: '1' }] as AuditLogEntry[]); // Typed mock and cast

      const result = await handler({ taskId: '1' });

      expect(JSON.parse(result.content[0].text)).toHaveLength(1);
    });
  });

  describe('log_work', () => {
    it('should log work', async () => {
      registerLogWork(mockServer as unknown as McpServer); // Cast to McpServer
      const handler = getHandler('log_work');
      (db.getTaskById as vi.Mock).mockResolvedValue({ id: '1', actualHours: 0 } as Task); // Typed mock and cast

      await handler({ taskId: '1', timeSpent: 1 });

      expect(db.updateTask).toHaveBeenCalled();
    });
  });
});
