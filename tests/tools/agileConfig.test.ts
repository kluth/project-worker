import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerManageAgileConfig } from '../../src/tools/manageAgileConfig.js';
import type { AppConfig } from '../../src/config.js';
import { configManager } from '../../src/config.js';

// Mock configManager
vi.mock('../../src/config.js', () => ({
  configManager: {
    get: vi.fn(),
    save: vi.fn(),
  },
}));

describe('manage_agile_config', () => {
  let mockServer: McpServer;
  let handler: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = { registerTool: vi.fn() } as unknown as McpServer;
    registerManageAgileConfig(mockServer);
    handler = (mockServer.registerTool as any).mock.calls.find(
      (c: any) => c[0] === 'manage_agile_config',
    )[2];

    // Default mock for configManager.get
    (configManager.get as vi.Mock).mockResolvedValue({
      activeProvider: 'local',
      providers: [],
      agileMethodology: {
        type: 'scrum',
        settings: { sprintLength: 2 },
      },
    } as AppConfig);
  });

  it('should register the manage_agile_config tool', () => {
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'manage_agile_config',
      expect.any(Object),
      expect.any(Function),
    );
  });

  it('should get the current agile methodology config', async () => {
    const result = await handler({ action: 'get' });
    expect(result.content[0].text).toEqual(
      JSON.stringify({ type: 'scrum', settings: { sprintLength: 2 } }, null, 2),
    );
  });

  it('should set a new agile methodology config', async () => {
    const newConfig = { type: 'kanban', settings: { wipLimit: 5 } };
    (configManager.get as vi.Mock).mockResolvedValueOnce({
      activeProvider: 'local',
      providers: [],
      agileMethodology: { type: 'scrum', settings: {} }, // Initial state
    });

    const result = await handler({
      action: 'set',
      type: newConfig.type,
      settings: newConfig.settings,
    });

    expect(configManager.get).toHaveBeenCalled();
    expect(configManager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        agileMethodology: newConfig,
      }),
    );
    expect(result.content[0].text).toContain(
      'Agile methodology set to kanban with settings: {"wipLimit":5}',
    );
  });

  it('should return an error if type is missing for set action', async () => {
    const result = await handler({ action: 'set', settings: { wipLimit: 5 } });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Methodology type is required for "set" action.');
  });
});
