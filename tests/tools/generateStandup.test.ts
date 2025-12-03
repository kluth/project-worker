import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGenerateStandup } from '../../src/tools/generateStandup.js';
import { ProviderFactory } from '../../src/services/providerFactory.js';

// Mock ProviderFactory
vi.mock('../../src/services/providerFactory.js', () => ({
  ProviderFactory: {
    getProvider: vi.fn(),
  },
}));

describe('Generate Standup Tool', () => {
  let mockServer: McpServer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockProvider: any;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockServer = { registerTool: vi.fn() } as unknown as McpServer;
    mockProvider = {
      getTasks: vi.fn(),
    };
    (ProviderFactory.getProvider as vi.Mock).mockResolvedValue(mockProvider);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getHandler = () => {
    return (mockServer.registerTool as vi.Mock).mock.calls.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => c[0] === 'generate_standup',
    )[2];
  };

  it('should generate a report with tasks from yesterday and today', async () => {
    registerGenerateStandup(mockServer);
    const handler = getHandler();

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0); // Midday yesterday

    const mockTasks = [
      {
        id: '1',
        title: 'Finished Task',
        status: 'Done',
        assignee: 'matthias',
        updatedAt: yesterday.toISOString(),
      },
      {
        id: '2',
        title: 'Current Task',
        status: 'In Progress',
        assignee: 'matthias',
        updatedAt: now.toISOString(),
      },
      {
        id: '3',
        title: 'Future Task',
        status: 'Todo',
        assignee: 'matthias',
      },
      {
        id: '4',
        title: 'Old Task',
        status: 'Done',
        assignee: 'matthias',
        updatedAt: '2020-01-01T00:00:00.000Z', // Very old
      },
    ];

    mockProvider.getTasks.mockResolvedValue(mockTasks);

    const result = await handler({ username: 'matthias' });
    const text = result.content[0].text;

    expect(text).toContain('Daily Standup');
    expect(text).toContain('**Yesterday**');
    expect(text).toContain('Finished Task');
    expect(text).not.toContain('Old Task'); // Should be excluded

    expect(text).toContain('**Today**');
    expect(text).toContain('Current Task');
    expect(text).toContain('Future Task');
  });

  it('should look back to Friday if today is Monday', async () => {
    registerGenerateStandup(mockServer);
    const handler = getHandler();

    // Mock date to be Monday, Dec 4th 2023
    const monday = new Date('2023-12-04T10:00:00Z');
    vi.setSystemTime(monday);

    const friday = new Date('2023-12-01T15:00:00Z'); // Previous Friday

    const mockTasks = [
      {
        id: '10',
        title: 'Friday Task',
        status: 'Done',
        assignee: 'matthias',
        updatedAt: friday.toISOString(),
      },
      {
        id: '11',
        title: 'Saturday Task',
        status: 'Done',
        assignee: 'matthias',
        updatedAt: '2023-12-02T10:00:00Z', // Saturday Work
      },
    ];

    mockProvider.getTasks.mockResolvedValue(mockTasks);

    const result = await handler({ username: 'matthias' });
    const text = result.content[0].text;

    expect(text).toContain('Friday Task');
    expect(text).toContain('Saturday Task');
  });

  it('should handle blockers', async () => {
    registerGenerateStandup(mockServer);
    const handler = getHandler();

    const mockTasks = [
      {
        id: '99',
        title: 'Blocked Item',
        status: 'Blocked',
        assignee: 'matthias',
      },
    ];

    mockProvider.getTasks.mockResolvedValue(mockTasks);

    const result = await handler({ username: 'matthias' });
    const text = result.content[0].text;

    expect(text).toContain('**Blockers**');
    expect(text).toContain('⛔ Blocked Item');
  });
});
