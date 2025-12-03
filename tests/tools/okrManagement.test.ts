import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerManageOKRs } from '../../src/tools/manageOKRs.js';
import { db } from '../../src/db.js';

// Mock DB
vi.mock('../../src/db.js', () => ({
  db: {
    saveObjective: vi.fn(),
    getObjectives: vi.fn(),
    getObjectiveById: vi.fn(),
    saveKeyResult: vi.fn(),
    getKeyResultById: vi.fn(),
  },
}));

describe('OKR Management Tools', () => {
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

  describe('define_objective', () => {
    it('should create an objective', async () => {
      registerManageOKRs(mockServer);
      const handler = getHandler('define_objective');

      await handler({ title: 'Grow Revenue', level: 'company' });

      expect(db.saveObjective).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Grow Revenue',
          level: 'company',
          status: 'active',
        }),
      );
    });
  });

  describe('add_key_result', () => {
    it('should add a key result', async () => {
      registerManageOKRs(mockServer);
      const handler = getHandler('add_key_result');
      (db.getObjectiveById as vi.Mock).mockResolvedValue({ id: 'obj1' });

      await handler({
        objectiveId: 'obj1',
        title: 'Reach $1M',
        target: 1000000,
        unit: 'USD',
      });

      expect(db.saveKeyResult).toHaveBeenCalledWith(
        expect.objectContaining({
          objectiveId: 'obj1',
          title: 'Reach $1M',
          target: 1000000,
          status: 'on-track',
        }),
      );
    });
  });

  describe('view_okrs', () => {
    it('should list okrs', async () => {
      registerManageOKRs(mockServer);
      const handler = getHandler('view_okrs');
      (db.getObjectives as vi.Mock).mockResolvedValue([
        {
          id: '1',
          title: 'Obj',
          level: 'company',
          status: 'active',
          keyResults: [
            {
              title: 'KR',
              current: 0,
              target: 10,
              unit: 'x',
              status: 'on-track',
            },
          ],
        },
      ]);

      const result = await handler({});
      expect(result.content[0].text).toContain('Obj');
      expect(result.content[0].text).toContain('KR');
    });
  });
});
