/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDefineValueStream } from '../../src/tools/defineValueStream.js';
import { registerTrackWaste } from '../../src/tools/trackWaste.js';
import { registerManagePdcaCycle } from '../../src/tools/managePdcaCycle.js';
import type { AppConfig } from '../../src/config.js';
import { configManager } from '../../src/config.js';
import type { ValueStream, WasteItem, PdcaCycle } from '../../src/types.js';

// Mock configManager
vi.mock('../../src/config.js', () => ({
  configManager: {
    get: vi.fn(),
    save: vi.fn(),
  },
}));

describe('Lean Methodology Management', () => {
  let mockServer: McpServer;
  let mockConfig: AppConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = { registerTool: vi.fn() } as unknown as McpServer;

    mockConfig = {
      activeProvider: 'local',
      providers: [],
      agileMethodology: { type: 'lean', settings: {} },
      sprints: [],
      kanbanBoards: [],
      events: [],
      waterfallPhases: [],
      valueStreams: [],
      wasteLog: [],
      pdcaCycles: [],
    } as AppConfig;

    (configManager.get as vi.Mock).mockResolvedValue(mockConfig);
  });

  describe('define_value_stream', () => {
    it('should register the define_value_stream tool', () => {
      registerDefineValueStream(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'define_value_stream',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should define a new value stream', async () => {
      registerDefineValueStream(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        name: 'Software Delivery',
        description: 'End-to-end software delivery process',
        stages: ['Requirements', 'Development', 'Testing', 'Deployment'],
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Software Delivery');
    });

    it('should require Lean methodology to be active', async () => {
      mockConfig.agileMethodology.type = 'scrum';
      registerDefineValueStream(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        name: 'Test Stream',
        stages: ['Stage1'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Lean methodology must be active');
    });

    it('should prevent duplicate value stream names', async () => {
      mockConfig.valueStreams = [
        {
          id: 'existing-123',
          name: 'Existing Stream',
          description: '',
          stages: ['Stage1'],
          metrics: {},
          createdAt: new Date().toISOString(),
        },
      ];
      registerDefineValueStream(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        name: 'Existing Stream',
        stages: ['Stage1'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('already exists');
    });

    it('should include optional metrics in value stream', async () => {
      registerDefineValueStream(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        name: 'Stream with Metrics',
        stages: ['Stage1', 'Stage2'],
        metrics: {
          leadTime: 5,
          cycleTime: 3,
        },
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Stream with Metrics');
    });
  });

  describe('track_waste', () => {
    it('should register the track_waste tool', () => {
      registerTrackWaste(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'track_waste',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should track a waste item', async () => {
      registerTrackWaste(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        type: 'waiting',
        description: 'Waiting for code review approval',
        location: 'Development Team',
        impact: 'high',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Waste tracked');
    });

    it('should require Lean methodology to be active', async () => {
      mockConfig.agileMethodology.type = 'kanban';
      registerTrackWaste(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        type: 'defects',
        description: 'Test waste',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Lean methodology must be active');
    });

    it('should support all 7 types of waste (Muda)', async () => {
      registerTrackWaste(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const wasteTypes = [
        'defects',
        'overproduction',
        'waiting',
        'non-utilized-talent',
        'transportation',
        'inventory',
        'motion',
        'extra-processing',
      ];

      for (const type of wasteTypes) {
        const result = await handler({
          type,
          description: `Testing ${type} waste`,
        });
        expect(result.isError).toBeUndefined();
      }
    });

    it('should include optional mitigation plan', async () => {
      registerTrackWaste(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        type: 'waiting',
        description: 'Waiting for deployment',
        mitigation: 'Implement automated deployment pipeline',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.content[0].text).toContain('tracked');
    });
  });

  describe('manage_pdca_cycle', () => {
    it('should register the manage_pdca_cycle tool', () => {
      registerManagePdcaCycle(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'manage_pdca_cycle',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should create a new PDCA cycle', async () => {
      registerManagePdcaCycle(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        action: 'create',
        title: 'Improve Code Review Process',
        plan: 'Implement automated code review tools',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.content[0].text).toContain('PDCA cycle created');
    });

    it('should require Lean methodology to be active', async () => {
      mockConfig.agileMethodology.type = 'waterfall';
      registerManagePdcaCycle(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        action: 'create',
        title: 'Test Cycle',
        plan: 'Test plan',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Lean methodology must be active');
    });

    it('should progress a cycle from Plan to Do', async () => {
      mockConfig.pdcaCycles = [
        {
          id: 'cycle-123',
          title: 'Test Cycle',
          currentPhase: 'plan',
          plan: 'Test plan',
          createdAt: new Date().toISOString(),
        },
      ];
      registerManagePdcaCycle(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        action: 'progress',
        cycleId: 'cycle-123',
        doNotes: 'Implemented the changes',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Do');
    });

    it('should progress a cycle from Do to Check', async () => {
      mockConfig.pdcaCycles = [
        {
          id: 'cycle-123',
          title: 'Test Cycle',
          currentPhase: 'do',
          plan: 'Test plan',
          doNotes: 'Did something',
          createdAt: new Date().toISOString(),
        },
      ];
      registerManagePdcaCycle(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        action: 'progress',
        cycleId: 'cycle-123',
        checkNotes: 'Verified results',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Check');
    });

    it('should complete a cycle (Act phase)', async () => {
      mockConfig.pdcaCycles = [
        {
          id: 'cycle-123',
          title: 'Test Cycle',
          currentPhase: 'check',
          plan: 'Test plan',
          doNotes: 'Did something',
          checkNotes: 'Checked results',
          createdAt: new Date().toISOString(),
        },
      ];
      registerManagePdcaCycle(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        action: 'progress',
        cycleId: 'cycle-123',
        actNotes: 'Standardized the improvement',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.content[0].text).toContain('completed');
    });

    it('should list all PDCA cycles', async () => {
      mockConfig.pdcaCycles = [
        {
          id: 'cycle-1',
          title: 'Cycle 1',
          currentPhase: 'plan',
          plan: 'Plan 1',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'cycle-2',
          title: 'Cycle 2',
          currentPhase: 'do',
          plan: 'Plan 2',
          doNotes: 'Doing 2',
          createdAt: new Date().toISOString(),
        },
      ];
      registerManagePdcaCycle(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        action: 'list',
      });

      expect(result.content[0].text).toContain('Cycle 1');
      expect(result.content[0].text).toContain('Cycle 2');
    });
  });
});
