/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDefineProjectBrief } from '../../src/tools/defineProjectBrief.js';
import { registerManageBusinessCase } from '../../src/tools/manageBusinessCase.js';
import { registerDefinePrince2Organization } from '../../src/tools/definePrince2Organization.js';
import type { AppConfig } from '../../src/config.js';
import { configManager } from '../../src/config.js';

// Mock configManager
vi.mock('../../src/config.js', () => ({
  configManager: {
    get: vi.fn(),
    save: vi.fn(),
  },
}));

describe('PRINCE2 Methodology Management', () => {
  let mockServer: McpServer;
  let mockConfig: AppConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = { registerTool: vi.fn() } as unknown as McpServer;

    mockConfig = {
      activeProvider: 'local',
      providers: [],
      agileMethodology: { type: 'prince2', settings: {} },
      sprints: [],
      kanbanBoards: [],
      events: [],
      waterfallPhases: [],
      valueStreams: [],
      wasteLog: [],
      pdcaCycles: [],
      projectBrief: undefined,
      businessCase: undefined,
      prince2Organization: undefined,
    } as AppConfig;

    (configManager.get as vi.Mock).mockResolvedValue(mockConfig);
  });

  describe('define_project_brief', () => {
    it('should register the define_project_brief tool', () => {
      registerDefineProjectBrief(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'define_project_brief',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should define a project brief', async () => {
      registerDefineProjectBrief(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        background: 'Project to modernize legacy system',
        objectives: ['Reduce technical debt', 'Improve performance'],
        deliverables: ['New architecture design', 'Migration plan'],
        scope: 'Backend services only',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Project brief defined');
    });

    it('should require PRINCE2 methodology to be active', async () => {
      mockConfig.agileMethodology.type = 'scrum';
      registerDefineProjectBrief(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        background: 'Test',
        objectives: ['Objective 1'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('PRINCE2 methodology must be active');
    });

    it('should update existing project brief', async () => {
      mockConfig.projectBrief = {
        background: 'Old background',
        objectives: ['Old objective'],
        deliverables: [],
        createdAt: new Date().toISOString(),
      };
      registerDefineProjectBrief(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        background: 'Updated background',
        objectives: ['Updated objective'],
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.content[0].text).toContain('updated');
    });
  });

  describe('manage_business_case', () => {
    it('should register the manage_business_case tool', () => {
      registerManageBusinessCase(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'manage_business_case',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should create a business case', async () => {
      registerManageBusinessCase(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        action: 'create',
        executiveSummary: 'This project will deliver value',
        reasons: ['Reason 1', 'Reason 2'],
        benefits: ['Benefit 1', 'Benefit 2'],
        costs: 100000,
        timescale: '6 months',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Business case created');
    });

    it('should require PRINCE2 methodology to be active', async () => {
      mockConfig.agileMethodology.type = 'kanban';
      registerManageBusinessCase(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        action: 'create',
        executiveSummary: 'Test',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('PRINCE2 methodology must be active');
    });

    it('should get business case details', async () => {
      mockConfig.businessCase = {
        executiveSummary: 'Summary',
        reasons: ['Reason'],
        benefits: ['Benefit'],
        costs: 50000,
        timescale: '3 months',
        risks: [],
        createdAt: new Date().toISOString(),
      };
      registerManageBusinessCase(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        action: 'get',
      });

      expect(result.content[0].text).toContain('Summary');
    });

    it('should update business case', async () => {
      mockConfig.businessCase = {
        executiveSummary: 'Original summary',
        reasons: [],
        benefits: [],
        costs: 0,
        timescale: '',
        risks: [],
        createdAt: new Date().toISOString(),
      };
      registerManageBusinessCase(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        action: 'update',
        executiveSummary: 'Updated summary',
        costs: 75000,
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.content[0].text).toContain('updated');
    });
  });

  describe('define_prince2_organization', () => {
    it('should register the define_prince2_organization tool', () => {
      registerDefinePrince2Organization(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'define_prince2_organization',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should define PRINCE2 organization structure', async () => {
      registerDefinePrince2Organization(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        executiveBoardMember: 'John Doe',
        projectManager: 'Jane Smith',
        teamManager: 'Bob Johnson',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Organization structure defined');
    });

    it('should require PRINCE2 methodology to be active', async () => {
      mockConfig.agileMethodology.type = 'lean';
      registerDefinePrince2Organization(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        executiveBoardMember: 'John',
        projectManager: 'Jane',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('PRINCE2 methodology must be active');
    });

    it('should include optional roles', async () => {
      registerDefinePrince2Organization(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        executiveBoardMember: 'John Doe',
        projectManager: 'Jane Smith',
        teamManager: 'Bob Johnson',
        seniorSupplier: 'Alice Brown',
        seniorUser: 'Charlie White',
        projectAssurance: 'Diana Green',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Organization structure defined');
    });

    it('should update existing organization structure', async () => {
      mockConfig.prince2Organization = {
        executiveBoardMember: 'Old Executive',
        projectManager: 'Old PM',
        teamManager: 'Old TM',
        createdAt: new Date().toISOString(),
      };
      registerDefinePrince2Organization(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        executiveBoardMember: 'New Executive',
        projectManager: 'New PM',
        teamManager: 'New TM',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.content[0].text).toContain('updated');
    });
  });
});
