import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerScanTodos } from '../../src/tools/scanTodos.js';
import fs from 'fs';
import { ProviderFactory } from '../../src/services/providerFactory.js';

// Mock fs
vi.mock('fs', () => ({
  default: {
    readdirSync: vi.fn(),
    readFileSync: vi.fn(),
    statSync: vi.fn(),
  },
}));

// Mock ProviderFactory
vi.mock('../../src/services/providerFactory.js', () => ({
  ProviderFactory: {
    getProvider: vi.fn(),
  },
}));

describe('Scan Todos Tool', () => {
  let mockServer: McpServer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockProvider: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = { registerTool: vi.fn() } as unknown as McpServer;
    mockProvider = {
      createTask: vi.fn(),
    };
    (ProviderFactory.getProvider as vi.Mock).mockResolvedValue(mockProvider);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getHandler = () => {
    return (mockServer.registerTool as vi.Mock).mock.calls.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => c[0] === 'scan_todos',
    )[2];
  };

  it('should list TODOs found in files', async () => {
    registerScanTodos(mockServer);
    const handler = getHandler();

    // Mock file system structure
    (fs.readdirSync as vi.Mock).mockReturnValue(['test.ts']);
    (fs.statSync as vi.Mock).mockReturnValue({ isDirectory: () => false });
    (fs.readFileSync as vi.Mock).mockReturnValue(`
      // TODO: Fix this later
      const x = 1;
    `);

    const result = await handler({});

    expect(result.content[0].text).toContain('Found 1 TODOs');
    expect(result.content[0].text).toContain('Fix this later');
  });

  it('should create tasks if requested', async () => {
    registerScanTodos(mockServer);
    const handler = getHandler();

    (fs.readdirSync as vi.Mock).mockReturnValue(['test.ts']);
    (fs.statSync as vi.Mock).mockReturnValue({ isDirectory: () => false });
    (fs.readFileSync as vi.Mock).mockReturnValue('// TODO: Important item');

    await handler({ create: true });

    expect(mockProvider.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Tech Debt: Important item',
        tags: expect.arrayContaining(['auto-todo']),
      }),
    );
  });
});
