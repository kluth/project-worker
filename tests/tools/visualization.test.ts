import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerVisualizationTools } from '../../src/tools/visualization.js';
import { db } from '../../src/db.js';
import type { Task, Sprint, AuditLogEntry } from '../../src/types.js';

// Mock DB
vi.mock('../../src/db.js', () => ({
  db: {
    getTasks: vi.fn(),
    getSprints: vi.fn(),
    getAuditLogsForTask: vi.fn(),
  },
}));

describe('Visualization Tools', () => {
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

  it('view_burndown_chart should generate chart', async () => {
    registerVisualizationTools(mockServer);
    const handler = getHandler('view_burndown_chart');

    (db.getTasks as vi.Mock).mockResolvedValue([
      { id: '1', estimatedHours: 5, status: 'done' },
      { id: '2', estimatedHours: 3, status: 'todo' },
    ] as Task[]);

    const result = await handler({});
    expect(result.content[0].text).toContain('Burndown Chart');
    expect(result.content[0].text).toContain('Total Points: 8');
    expect(result.content[0].text).toContain('Remaining:    3');
  });

  it('view_kanban_board should group tasks', async () => {
    registerVisualizationTools(mockServer);
    const handler = getHandler('view_kanban_board');

    (db.getTasks as vi.Mock).mockResolvedValue([
      { id: '1', title: 'T1', status: 'done' },
      { id: '2', title: 'T2', status: 'todo' },
    ] as Task[]);

    const result = await handler({});
    expect(result.content[0].text).toContain('TODO');
    expect(result.content[0].text).toContain('DONE');
    expect(result.content[0].text).toContain('T1');
    expect(result.content[0].text).toContain('T2');
  });

  it('view_work_heatmap should aggregate logs', async () => {
    registerVisualizationTools(mockServer);
    const handler = getHandler('view_work_heatmap');

    (db.getTasks as vi.Mock).mockResolvedValue([{ id: '1' }] as Task[]);
    (db.getAuditLogsForTask as vi.Mock).mockResolvedValue([
      {
        field: 'actualHours',
        oldValue: 0,
        newValue: 2,
        timestamp: '2023-01-01T10:00:00Z',
      },
    ] as AuditLogEntry[]);

    const result = await handler({});
    expect(result.content[0].text).toContain('Work Heatmap');
    expect(result.content[0].text).toContain('2023-01-01: ██ (2h)');
  });

  it('get_dashboard should return aggregate view', async () => {
    registerVisualizationTools(mockServer);
    const handler = getHandler('get_dashboard');

    (db.getTasks as vi.Mock).mockResolvedValue([]);
    (db.getSprints as vi.Mock).mockResolvedValue([
      { name: 'Sprint 1', status: 'active' },
    ] as Sprint[]);

    const result = await handler({});
    expect(result.content[0].text).toContain('PROJECT DASHBOARD');
    expect(result.content[0].text).toContain('Active Sprint: Sprint 1');
  });
});
