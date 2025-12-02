import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerStartSprint } from '../../src/tools/startSprint.js';
import { registerEndSprint } from '../../src/tools/endSprint.js';
import { registerGetSprintDetails } from '../../src/tools/getSprintDetails.js';
import type { AppConfig } from '../../src/config.js';
import { configManager } from '../../src/config.js';
import type { Sprint } from '../../src/types.js';

// Mock configManager
vi.mock('../../src/config.js', () => ({
  configManager: {
    get: vi.fn(),
    save: vi.fn(),
  },
}));

describe('Sprint Management Tools', () => {
  let mockServer: McpServer;
  let mockConfig: AppConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = { registerTool: vi.fn() } as unknown as McpServer;

    mockConfig = {
      activeProvider: 'local',
      providers: [],
      agileMethodology: { type: 'scrum', settings: {} },
      sprints: [],
    };
    (configManager.get as vi.Mock).mockResolvedValue(mockConfig);
    (configManager.save as vi.Mock).mockImplementation(async (newConfig: AppConfig) => {
      mockConfig = newConfig; // Update mockConfig state
    });
  });

  describe('start_sprint', () => {
    it('should register the start_sprint tool', () => {
      registerStartSprint(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'start_sprint',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should start a new sprint', async () => {
      registerStartSprint(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'start_sprint',
      )[2];

      const sprintName = 'Sprint 1';
      const sprintGoal = 'Deliver Feature X';
      const duration = 1; // 1 week

      const result = await handler({ name: sprintName, duration, goal: sprintGoal });

      expect(configManager.get).toHaveBeenCalled();
      expect(configManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          sprints: expect.arrayContaining([
            expect.objectContaining({
              name: sprintName,
              status: 'active',
              goal: sprintGoal,
            }),
          ]),
        }),
      );
      expect(result.content[0].text).toContain(`Sprint "${sprintName}" started successfully!`);
      expect(mockConfig.sprints).toHaveLength(1);
      expect(mockConfig.sprints[0].status).toBe('active');
    });

    it('should prevent starting a sprint if one is already active', async () => {
      mockConfig.sprints.push({
        id: 'sprint-active-1',
        name: 'Active Sprint',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        goal: 'Active Goal',
      });
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerStartSprint(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'start_sprint',
      )[2];

      const result = await handler({ name: 'Sprint 2', duration: 1 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('An active sprint already exists');
      expect(configManager.save).not.toHaveBeenCalled(); // Should not save if error
    });
  });

  describe('end_sprint', () => {
    it('should register the end_sprint tool', () => {
      registerEndSprint(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'end_sprint',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should end the active sprint', async () => {
      const activeSprint: Sprint = {
        id: 'sprint-active-1',
        name: 'Active Sprint',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        goal: 'Active Goal',
      };
      mockConfig.sprints.push(activeSprint);
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig); // Ensure get returns the config with active sprint

      registerEndSprint(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'end_sprint',
      )[2];

      const result = await handler({});

      expect(configManager.get).toHaveBeenCalled();
      expect(configManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          sprints: expect.arrayContaining([
            expect.objectContaining({
              id: activeSprint.id,
              name: activeSprint.name,
              status: 'completed',
            }),
          ]),
        }),
      );
      expect(result.content[0].text).toContain(`Sprint "${activeSprint.name}" successfully ended.`);
      expect(mockConfig.sprints[0].status).toBe('completed');
    });

    it('should return an error if no active sprint is found', async () => {
      registerEndSprint(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'end_sprint',
      )[2];

      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No active sprint found to end.');
      expect(configManager.save).not.toHaveBeenCalled();
    });
  });

  describe('get_sprint_details', () => {
    it('should register the get_sprint_details tool', () => {
      registerGetSprintDetails(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'get_sprint_details',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should list all sprints if no id is provided', async () => {
      const sprint1: Sprint = {
        id: 's1',
        name: 'S1',
        startDate: 'd1',
        endDate: 'd2',
        status: 'completed',
      };
      const sprint2: Sprint = {
        id: 's2',
        name: 'S2',
        startDate: 'd3',
        endDate: 'd4',
        status: 'active',
      };
      mockConfig.sprints.push(sprint1, sprint2);
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerGetSprintDetails(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'get_sprint_details',
      )[2];

      const result = await handler({});
      expect(result.content[0].text).toEqual(JSON.stringify([sprint1, sprint2], null, 2));
    });

    it('should return details for a specific sprint by id', async () => {
      const sprint1: Sprint = {
        id: 's1',
        name: 'S1',
        startDate: 'd1',
        endDate: 'd2',
        status: 'completed',
      };
      const sprint2: Sprint = {
        id: 's2',
        name: 'S2',
        startDate: 'd3',
        endDate: 'd4',
        status: 'active',
      };
      mockConfig.sprints.push(sprint1, sprint2);
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerGetSprintDetails(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'get_sprint_details',
      )[2];

      const result = await handler({ sprintId: 's2' });
      expect(result.content[0].text).toEqual(JSON.stringify([sprint2], null, 2));
    });

    it('should filter sprints by status', async () => {
      const sprint1: Sprint = {
        id: 's1',
        name: 'S1',
        startDate: 'd1',
        endDate: 'd2',
        status: 'completed',
      };
      const sprint2: Sprint = {
        id: 's2',
        name: 'S2',
        startDate: 'd3',
        endDate: 'd4',
        status: 'active',
      };
      const sprint3: Sprint = {
        id: 's3',
        name: 'S3',
        startDate: 'd5',
        endDate: 'd6',
        status: 'planned',
      };
      mockConfig.sprints.push(sprint1, sprint2, sprint3);
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerGetSprintDetails(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'get_sprint_details',
      )[2];

      const result = await handler({ status: 'active' });
      expect(result.content[0].text).toEqual(JSON.stringify([sprint2], null, 2));
    });

    it('should return an error if sprint not found by id', async () => {
      const sprint1: Sprint = {
        id: 's1',
        name: 'S1',
        startDate: 'd1',
        endDate: 'd2',
        status: 'completed',
      };
      mockConfig.sprints.push(sprint1);
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerGetSprintDetails(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'get_sprint_details',
      )[2];

      const result = await handler({ sprintId: 'non-existent' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Sprint with ID non-existent not found.');
    });

    it('should return message if no sprints found matching criteria', async () => {
      registerGetSprintDetails(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'get_sprint_details',
      )[2];

      const result = await handler({ status: 'active' }); // No sprints in mockConfig
      expect(result.content[0].text).toContain('No sprints found matching the criteria.');
    });
  });
});
