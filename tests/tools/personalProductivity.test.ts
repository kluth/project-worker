import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerPersonalProductivity } from '../../src/tools/personalProductivity.js';
import { db } from '../../src/db.js';

// Mock DB
vi.mock('../../src/db.js', () => ({
  db: {
    savePomodoroSession: vi.fn(),
    getPomodoroSessions: vi.fn(),
    savePersonalTodo: vi.fn(),
    getPersonalTodos: vi.fn(),
    getPersonalTodoById: vi.fn(),
    deletePersonalTodo: vi.fn(),
  },
}));

describe('Personal Productivity Tools', () => {
  let mockServer: McpServer;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = { registerTool: vi.fn() } as unknown as McpServer;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getHandler = (toolName: string) => {
    return (mockServer.registerTool as vi.Mock).mock.calls.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => c[0] === toolName,
    )[2];
  };

  describe('start_pomodoro', () => {
    it('should start a session', async () => {
      registerPersonalProductivity(mockServer);
      const handler = getHandler('start_pomodoro');

      await handler({ durationMinutes: 25, label: 'Focus' });

      expect(db.savePomodoroSession).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMinutes: 25,
          label: 'Focus',
          status: 'running',
        }),
      );
    });
  });

  describe('check_pomodoro', () => {
    it('should report active session', async () => {
      registerPersonalProductivity(mockServer);
      const handler = getHandler('check_pomodoro');

      const future = new Date(Date.now() + 60000).toISOString();
      (db.getPomodoroSessions as vi.Mock).mockResolvedValue([
        {
          status: 'running',
          endTime: future,
          label: 'Active',
        },
      ]);

      const result = await handler({});
      expect(result.content[0].text).toContain('Active session');
    });
  });

  describe('personal_todo', () => {
    it('should add todo', async () => {
      registerPersonalProductivity(mockServer);
      const handler = getHandler('personal_todo');

      await handler({ action: 'add', text: 'Buy milk' });

      expect(db.savePersonalTodo).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Buy milk',
          isCompleted: false,
        }),
      );
    });

    it('should list todos', async () => {
      registerPersonalProductivity(mockServer);
      const handler = getHandler('personal_todo');

      (db.getPersonalTodos as vi.Mock).mockResolvedValue([
        { id: '1', text: 'Task 1', isCompleted: false },
        { id: '2', text: 'Task 2', isCompleted: true },
      ]);

      const result = await handler({ action: 'list' });
      expect(result.content[0].text).toContain('Task 1');
      expect(result.content[0].text).toContain('Task 2');
    });
  });
});
