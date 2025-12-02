import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSetWipLimit } from '../../src/tools/setWipLimit.js';
import { registerGetBoardStatus } from '../../src/tools/getBoardStatus.js';
import { configManager, AppConfig, KanbanBoardConfig } from '../../src/config.js';
import { ProviderFactory } from '../../src/services/providerFactory.js';
import { Task } from '../../src/types.js';

// Mock configManager
vi.mock('../../src/config.js', () => ({
  configManager: {
    get: vi.fn(),
    save: vi.fn(),
  },
}));

// Mock ProviderFactory and Provider
const mockProvider = {
  getTasks: vi.fn(),
  // Add other provider methods if needed by these tools
};

vi.mock('../../src/services/providerFactory.js', () => ({
  ProviderFactory: {
    getProvider: vi.fn(() => mockProvider),
  },
}));

describe('Kanban Management Tools', () => {
  let mockServer: McpServer;
  let mockConfig: AppConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = { registerTool: vi.fn() } as unknown as McpServer;

    mockConfig = {
      activeProvider: 'local',
      providers: [],
      agileMethodology: { type: 'kanban', settings: {} },
      sprints: [],
      kanbanBoards: [],
    };
    (configManager.get as vi.Mock).mockResolvedValue(mockConfig);
    (configManager.save as vi.Mock).mockImplementation(async (newConfig: AppConfig) => {
      mockConfig = newConfig; // Update mockConfig state
    });
    mockProvider.getTasks.mockResolvedValue([]); // Default empty tasks
  });

  describe('set_wip_limit', () => {
    it('should register the set_wip_limit tool', () => {
      registerSetWipLimit(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'set_wip_limit',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should set a WIP limit for a status on a new board', async () => {
      registerSetWipLimit(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find((c: any) => c[0] === 'set_wip_limit')[2];

      const boardName = 'My Kanban';
      const status = 'in progress';
      const limit = 3;

      const result = await handler({ boardName, status, limit });

      expect(configManager.get).toHaveBeenCalled();
      expect(configManager.save).toHaveBeenCalledWith(expect.objectContaining({
        kanbanBoards: expect.arrayContaining([
          expect.objectContaining({
            boardName: boardName,
            wipLimits: { [status]: limit },
          })
        ])
      }));
      expect(result.content[0].text).toContain(`WIP limit for status "${status}" on board "${boardName}" set to ${limit}.`);
      expect(mockConfig.kanbanBoards).toHaveLength(1);
      expect(mockConfig.kanbanBoards[0].wipLimits[status]).toBe(limit);
    });

    it('should update a WIP limit for an existing status on an existing board', async () => {
      const existingBoard: KanbanBoardConfig = {
        boardName: 'My Kanban',
        wipLimits: { 'in progress': 2, 'todo': 5 },
      };
      mockConfig.kanbanBoards.push(existingBoard);
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerSetWipLimit(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find((c: any) => c[0] === 'set_wip_limit')[2];

      const boardName = 'My Kanban';
      const status = 'in progress';
      const newLimit = 4;

      const result = await handler({ boardName, status, limit: newLimit });

      expect(configManager.get).toHaveBeenCalled();
      expect(configManager.save).toHaveBeenCalledWith(expect.objectContaining({
        kanbanBoards: expect.arrayContaining([
          expect.objectContaining({
            boardName: boardName,
            wipLimits: { 'in progress': newLimit, 'todo': 5 },
          })
        ])
      }));
      expect(result.content[0].text).toContain(`WIP limit for status "${status}" on board "${boardName}" set to ${newLimit}.`);
      expect(mockConfig.kanbanBoards).toHaveLength(1);
      expect(mockConfig.kanbanBoards[0].wipLimits[status]).toBe(newLimit);
    });
  });

  describe('get_board_status', () => {
    it('should register the get_board_status tool', () => {
      registerGetBoardStatus(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'get_board_status',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should return an error if the board is not found', async () => {
      registerGetBoardStatus(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find((c: any) => c[0] === 'get_board_status')[2];

      const result = await handler({ boardName: 'NonExistent' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Kanban board "NonExistent" not found.');
    });

    it('should display board status with tasks grouped by status', async () => {
      const existingBoard: KanbanBoardConfig = {
        boardName: 'Default Board',
        wipLimits: { 'in progress': 2 },
      };
      mockConfig.kanbanBoards.push(existingBoard);
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      const tasks: Task[] = [
        { id: '1', title: 'Task A', status: 'to do', description: '', priority: 'medium', type: 'task', tags: [], comments: [], createdAt: '', updatedAt: '' },
        { id: '2', title: 'Task B', status: 'in progress', description: '', priority: 'medium', type: 'task', tags: [], comments: [], createdAt: '', updatedAt: '' },
        { id: '3', title: 'Task C', status: 'in progress', description: '', priority: 'medium', type: 'task', tags: [], comments: [], createdAt: '', updatedAt: '' },
        { id: '4', title: 'Task D', status: 'done', description: '', priority: 'medium', type: 'task', tags: [], comments: [], createdAt: '', updatedAt: '' },
      ];
      mockProvider.getTasks.mockResolvedValue(tasks);

      registerGetBoardStatus(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find((c: any) => c[0] === 'get_board_status')[2];

      const result = await handler({});

      expect(result.content[0].text).toContain('Kanban Board: Default Board');
      expect(result.content[0].text).toContain('Status: in progress (Tasks: 2, WIP Limit: 2)');
      expect(result.content[0].text).toContain('Status: to do (Tasks: 1)');
      expect(result.content[0].text).toContain('Status: done (Tasks: 1)');
      expect(result.content[0].text).toContain('  - 2: Task B');
      expect(result.content[0].text).not.toContain('***VIOLATION***');
    });

    it('should highlight WIP limit violations', async () => {
      const existingBoard: KanbanBoardConfig = {
        boardName: 'Default Board',
        wipLimits: { 'in progress': 1 },
      };
      mockConfig.kanbanBoards.push(existingBoard);
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      const tasks: Task[] = [
        { id: '1', title: 'Task A', status: 'in progress', description: '', priority: 'medium', type: 'task', tags: [], comments: [], createdAt: '', updatedAt: '' },
        { id: '2', title: 'Task B', status: 'in progress', description: '', priority: 'medium', type: 'task', tags: [], comments: [], createdAt: '', updatedAt: '' },
      ];
      mockProvider.getTasks.mockResolvedValue(tasks);

      registerGetBoardStatus(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find((c: any) => c[0] === 'get_board_status')[2];

      const result = await handler({});

      expect(result.content[0].text).toContain('Status: in progress (Tasks: 2, WIP Limit: 1 - ***VIOLATION***)');
      expect(result.content[0].text).toContain('***WARNING: One or more WIP limits have been violated!***');
    });

    it('should handle statuses with 0 limit (no limit)', async () => {
      const existingBoard: KanbanBoardConfig = {
        boardName: 'Default Board',
        wipLimits: { 'in progress': 0 },
      };
      mockConfig.kanbanBoards.push(existingBoard);
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      const tasks: Task[] = [
        { id: '1', title: 'Task A', status: 'in progress', description: '', priority: 'medium', type: 'task', tags: [], comments: [], createdAt: '', updatedAt: '' },
        { id: '2', title: 'Task B', status: 'in progress', description: '', priority: 'medium', type: 'task', tags: [], comments: [], createdAt: '', updatedAt: '' },
        { id: '3', title: 'Task C', status: 'in progress', description: '', priority: 'medium', type: 'task', tags: [], comments: [], createdAt: '', updatedAt: '' },
      ];
      mockProvider.getTasks.mockResolvedValue(tasks);

      registerGetBoardStatus(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find((c: any) => c[0] === 'get_board_status')[2];

      const result = await handler({});

      expect(result.content[0].text).toContain('Status: in progress (Tasks: 3, WIP Limit: 0)');
      expect(result.content[0].text).not.toContain('***VIOLATION***');
    });
  });
});
