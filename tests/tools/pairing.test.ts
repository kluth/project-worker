import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerManagePairing } from '../../src/tools/managePairing.js';
import { db } from '../../src/db.js';

// Mock DB
vi.mock('../../src/db.js', () => ({
  db: {
    savePairingSession: vi.fn(),
    getPairingSessionById: vi.fn(),
  },
}));

describe('Pairing Management Tools', () => {
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

  it('should schedule session', async () => {
    registerManagePairing(mockServer);
    const handler = getHandler('schedule_pairing_session');

    await handler({ participants: ['Alice', 'Bob'], topic: 'Fix Bug' });

    expect(db.savePairingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'Fix Bug',
        status: 'scheduled',
        currentDriver: 'Alice',
      }),
    );
  });

  it('should rotate session', async () => {
    registerManagePairing(mockServer);
    const handler = getHandler('manage_pairing_session');
    (db.getPairingSessionById as vi.Mock).mockResolvedValue({
      id: 's1',
      participants: ['Alice', 'Bob'],
      currentDriver: 'Alice',
    });

    const result = await handler({ sessionId: 's1', action: 'rotate' });

    expect(db.savePairingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        currentDriver: 'Bob',
      }),
    );
    expect(result.content[0].text).toContain('Rotated! Driver: Bob');
  });
});
