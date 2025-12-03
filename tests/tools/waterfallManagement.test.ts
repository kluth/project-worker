/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDefinePhase } from '../../src/tools/definePhase.js';
import { registerCompletePhase } from '../../src/tools/completePhase.js';
import { registerGetPhaseDetails } from '../../src/tools/getPhaseDetails.js';
import type { AppConfig } from '../../src/config.js';
import { configManager } from '../../src/config.js';
import type { WaterfallPhase } from '../../src/types.js';

// Mock configManager
vi.mock('../../src/config.js', () => ({
  configManager: {
    get: vi.fn(),
    save: vi.fn(),
  },
}));

describe('Waterfall Phase Management', () => {
  let mockServer: McpServer;
  let mockConfig: AppConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = { registerTool: vi.fn() } as unknown as McpServer;

    mockConfig = {
      activeProvider: 'local',
      providers: [],
      agileMethodology: { type: 'waterfall', settings: {} },
      sprints: [],
      kanbanBoards: [],
      events: [],
      waterfallPhases: [],
    } as AppConfig;

    (configManager.get as vi.Mock).mockResolvedValue(mockConfig);
  });

  describe('define_phase', () => {
    it('should register the define_phase tool', () => {
      registerDefinePhase(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'define_phase',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should define a new waterfall phase', async () => {
      registerDefinePhase(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'define_phase',
      )[2];

      const phaseInput = {
        name: 'Requirements',
        description: 'Gather and document requirements',
        order: 1,
        gateChecks: ['Requirements document approved', 'Stakeholders signed off'],
      };

      const result = await handler(phaseInput);

      expect(configManager.get).toHaveBeenCalled();
      expect(configManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          waterfallPhases: expect.arrayContaining([
            expect.objectContaining({
              name: phaseInput.name,
              description: phaseInput.description,
              order: phaseInput.order,
              status: 'not-started',
              gateChecks: phaseInput.gateChecks,
            }),
          ]),
        }),
      );
      expect(result.content[0].text).toContain(
        `Phase "${phaseInput.name}" defined successfully`,
      );
      expect(mockConfig.waterfallPhases).toHaveLength(1);
      expect(mockConfig.waterfallPhases[0].status).toBe('not-started');
    });

    it('should prevent duplicate phase names', async () => {
      const existingPhase: WaterfallPhase = {
        id: 'phase-1',
        name: 'Requirements',
        description: 'Requirements phase',
        order: 1,
        status: 'not-started',
        gateChecks: [],
        startDate: undefined,
        endDate: undefined,
      };
      mockConfig.waterfallPhases.push(existingPhase);
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerDefinePhase(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'define_phase',
      )[2];

      const result = await handler({ name: 'Requirements', order: 2 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Phase with name "Requirements" already exists');
      expect(configManager.save).not.toHaveBeenCalled();
    });

    it('should require waterfall methodology to be active', async () => {
      mockConfig.agileMethodology.type = 'scrum';
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerDefinePhase(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'define_phase',
      )[2];

      const result = await handler({ name: 'Design', order: 2 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Waterfall methodology must be active');
      expect(configManager.save).not.toHaveBeenCalled();
    });
  });

  describe('complete_phase', () => {
    it('should register the complete_phase tool', () => {
      registerCompletePhase(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'complete_phase',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should complete an in-progress phase', async () => {
      const activePhase: WaterfallPhase = {
        id: 'phase-1',
        name: 'Requirements',
        description: 'Requirements phase',
        order: 1,
        status: 'in-progress',
        gateChecks: ['Requirement docs approved'],
        startDate: new Date().toISOString(),
        endDate: undefined,
      };
      mockConfig.waterfallPhases.push(activePhase);
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerCompletePhase(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'complete_phase',
      )[2];

      const result = await handler({ phaseId: 'phase-1' });

      expect(configManager.get).toHaveBeenCalled();
      expect(configManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          waterfallPhases: expect.arrayContaining([
            expect.objectContaining({
              id: 'phase-1',
              status: 'completed',
            }),
          ]),
        }),
      );
      expect(result.content[0].text).toContain(`Phase "${activePhase.name}" completed`);
      expect(mockConfig.waterfallPhases[0].status).toBe('completed');
      expect(mockConfig.waterfallPhases[0].endDate).toBeDefined();
    });

    it('should prevent completing a phase that is not in progress', async () => {
      const notStartedPhase: WaterfallPhase = {
        id: 'phase-1',
        name: 'Requirements',
        description: 'Requirements phase',
        order: 1,
        status: 'not-started',
        gateChecks: [],
        startDate: undefined,
        endDate: undefined,
      };
      mockConfig.waterfallPhases.push(notStartedPhase);
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerCompletePhase(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'complete_phase',
      )[2];

      const result = await handler({ phaseId: 'phase-1' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Phase must be in-progress to be completed');
      expect(configManager.save).not.toHaveBeenCalled();
    });

    it('should auto-start next phase when current completes', async () => {
      const phase1: WaterfallPhase = {
        id: 'phase-1',
        name: 'Requirements',
        description: 'Requirements phase',
        order: 1,
        status: 'in-progress',
        gateChecks: [],
        startDate: new Date().toISOString(),
        endDate: undefined,
      };
      const phase2: WaterfallPhase = {
        id: 'phase-2',
        name: 'Design',
        description: 'Design phase',
        order: 2,
        status: 'not-started',
        gateChecks: [],
        startDate: undefined,
        endDate: undefined,
      };
      mockConfig.waterfallPhases.push(phase1, phase2);
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerCompletePhase(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'complete_phase',
      )[2];

      const result = await handler({ phaseId: 'phase-1' });

      expect(mockConfig.waterfallPhases[0].status).toBe('completed');
      expect(mockConfig.waterfallPhases[1].status).toBe('in-progress');
      expect(mockConfig.waterfallPhases[1].startDate).toBeDefined();
      expect(result.content[0].text).toContain('Next phase "Design" has been automatically started');
    });
  });

  describe('get_phase_details', () => {
    it('should register the get_phase_details tool', () => {
      registerGetPhaseDetails(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'get_phase_details',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should list all phases', async () => {
      const phase1: WaterfallPhase = {
        id: 'p1',
        name: 'Requirements',
        description: 'Req phase',
        order: 1,
        status: 'completed',
        gateChecks: [],
        startDate: '2025-01-01',
        endDate: '2025-01-15',
      };
      const phase2: WaterfallPhase = {
        id: 'p2',
        name: 'Design',
        description: 'Design phase',
        order: 2,
        status: 'in-progress',
        gateChecks: [],
        startDate: '2025-01-16',
        endDate: undefined,
      };
      mockConfig.waterfallPhases.push(phase1, phase2);
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerGetPhaseDetails(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'get_phase_details',
      )[2];

      const result = await handler({});
      const phases = JSON.parse(result.content[0].text);
      expect(phases).toHaveLength(2);
      expect(phases[0].id).toBe('p1');
      expect(phases[1].id).toBe('p2');
    });

    it('should return a specific phase by ID', async () => {
      const phase1: WaterfallPhase = {
        id: 'p1',
        name: 'Requirements',
        description: 'Req phase',
        order: 1,
        status: 'completed',
        gateChecks: [],
        startDate: '2025-01-01',
        endDate: '2025-01-15',
      };
      mockConfig.waterfallPhases.push(phase1);
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerGetPhaseDetails(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'get_phase_details',
      )[2];

      const result = await handler({ phaseId: 'p1' });
      const phase = JSON.parse(result.content[0].text);
      expect(phase.id).toBe('p1');
      expect(phase.name).toBe('Requirements');
    });

    it('should filter phases by status', async () => {
      const phase1: WaterfallPhase = {
        id: 'p1',
        name: 'Requirements',
        description: '',
        order: 1,
        status: 'completed',
        gateChecks: [],
        startDate: '2025-01-01',
        endDate: '2025-01-15',
      };
      const phase2: WaterfallPhase = {
        id: 'p2',
        name: 'Design',
        description: '',
        order: 2,
        status: 'in-progress',
        gateChecks: [],
        startDate: '2025-01-16',
        endDate: undefined,
      };
      const phase3: WaterfallPhase = {
        id: 'p3',
        name: 'Implementation',
        description: '',
        order: 3,
        status: 'not-started',
        gateChecks: [],
        startDate: undefined,
        endDate: undefined,
      };
      mockConfig.waterfallPhases.push(phase1, phase2, phase3);
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerGetPhaseDetails(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'get_phase_details',
      )[2];

      const result = await handler({ status: 'in-progress' });
      const phases = JSON.parse(result.content[0].text);
      expect(phases).toHaveLength(1);
      expect(phases[0].id).toBe('p2');
    });

    it('should return error if phase not found', async () => {
      registerGetPhaseDetails(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'get_phase_details',
      )[2];

      const result = await handler({ phaseId: 'non-existent' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Phase with ID non-existent not found');
    });
  });
});
