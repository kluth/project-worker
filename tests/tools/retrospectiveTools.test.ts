/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerStartRetrospective } from '../../src/tools/startRetrospective.js';
import { registerSubmitFeedback } from '../../src/tools/submitFeedback.js';
import { registerTrackRetroActions } from '../../src/tools/trackRetroActions.js';
import type { AppConfig } from '../../src/config.js';
import { configManager } from '../../src/config.js';

// Mock configManager
vi.mock('../../src/config.js', () => ({
  configManager: {
    get: vi.fn(),
    save: vi.fn(),
  },
}));

describe('Retrospective & Feedback Tools', () => {
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
      kanbanBoards: [],
      events: [],
      waterfallPhases: [],
      valueStreams: [],
      wasteLog: [],
      pdcaCycles: [],
      retrospectives: [],
      retroActions: [],
    } as AppConfig;

    (configManager.get as vi.Mock).mockResolvedValue(mockConfig);
  });

  describe('start_retrospective', () => {
    it('should register the start_retrospective tool', () => {
      registerStartRetrospective(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'start_retrospective',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should start a retrospective session', async () => {
      registerStartRetrospective(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        title: 'Sprint 10 Retrospective',
        format: 'start-stop-continue',
        facilitator: 'Alice',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Retrospective started');
    });

    it('should support different retrospective formats', async () => {
      registerStartRetrospective(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const formats = ['start-stop-continue', 'mad-sad-glad', '4Ls', 'sailboat'];

      for (const format of formats) {
        const result = await handler({
          title: `Retro with ${format}`,
          format,
        });
        expect(result.isError).toBeUndefined();
      }
    });

    it('should include optional participants list', async () => {
      registerStartRetrospective(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        title: 'Team Retro',
        format: 'start-stop-continue',
        facilitator: 'Bob',
        participants: ['Alice', 'Bob', 'Charlie'],
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Retrospective started');
    });
  });

  describe('submit_feedback', () => {
    it('should register the submit_feedback tool', () => {
      registerSubmitFeedback(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'submit_feedback',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should submit positive feedback', async () => {
      mockConfig.retrospectives = [
        {
          id: 'retro-123',
          title: 'Sprint Retro',
          format: 'start-stop-continue',
          status: 'active',
          feedback: [],
          createdAt: new Date().toISOString(),
        },
      ];
      registerSubmitFeedback(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        retroId: 'retro-123',
        type: 'positive',
        content: 'Great teamwork this sprint!',
        author: 'Alice',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Feedback submitted');
    });

    it('should submit negative feedback', async () => {
      mockConfig.retrospectives = [
        {
          id: 'retro-123',
          title: 'Sprint Retro',
          format: 'mad-sad-glad',
          status: 'active',
          feedback: [],
          createdAt: new Date().toISOString(),
        },
      ];
      registerSubmitFeedback(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        retroId: 'retro-123',
        type: 'negative',
        content: 'Too many meetings this sprint',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
    });

    it('should submit suggestions', async () => {
      mockConfig.retrospectives = [
        {
          id: 'retro-123',
          title: 'Sprint Retro',
          format: 'start-stop-continue',
          status: 'active',
          feedback: [],
          createdAt: new Date().toISOString(),
        },
      ];
      registerSubmitFeedback(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        retroId: 'retro-123',
        type: 'suggestion',
        content: "Let's try pair programming next sprint",
        author: 'Charlie',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
    });

    it('should support anonymous feedback', async () => {
      mockConfig.retrospectives = [
        {
          id: 'retro-123',
          title: 'Sprint Retro',
          format: 'start-stop-continue',
          status: 'active',
          feedback: [],
          createdAt: new Date().toISOString(),
        },
      ];
      registerSubmitFeedback(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        retroId: 'retro-123',
        type: 'negative',
        content: 'Communication could be better',
        anonymous: true,
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
    });

    it('should error if retrospective not found', async () => {
      registerSubmitFeedback(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        retroId: 'non-existent',
        type: 'positive',
        content: 'Test',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    it('should error if retrospective is closed', async () => {
      mockConfig.retrospectives = [
        {
          id: 'retro-123',
          title: 'Closed Retro',
          format: 'start-stop-continue',
          status: 'closed',
          feedback: [],
          createdAt: new Date().toISOString(),
        },
      ];
      registerSubmitFeedback(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        retroId: 'retro-123',
        type: 'positive',
        content: 'Test',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('closed');
    });
  });

  describe('track_retro_actions', () => {
    it('should register the track_retro_actions tool', () => {
      registerTrackRetroActions(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'track_retro_actions',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should create a new action item', async () => {
      registerTrackRetroActions(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        action: 'create',
        description: 'Implement automated testing for API',
        assignee: 'Bob',
        retroId: 'retro-123',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Action item created');
    });

    it('should update action item status', async () => {
      mockConfig.retroActions = [
        {
          id: 'action-123',
          description: 'Test action',
          status: 'pending',
          assignee: 'Alice',
          retroId: 'retro-123',
          createdAt: new Date().toISOString(),
        },
      ];
      registerTrackRetroActions(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        action: 'update',
        actionId: 'action-123',
        status: 'completed',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('updated');
    });

    it('should list all action items', async () => {
      mockConfig.retroActions = [
        {
          id: 'action-1',
          description: 'Action 1',
          status: 'pending',
          retroId: 'retro-123',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'action-2',
          description: 'Action 2',
          status: 'completed',
          retroId: 'retro-123',
          createdAt: new Date().toISOString(),
        },
      ];
      registerTrackRetroActions(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        action: 'list',
      });

      expect(result.content[0].text).toContain('Action 1');
      expect(result.content[0].text).toContain('Action 2');
    });

    it('should filter actions by status', async () => {
      mockConfig.retroActions = [
        {
          id: 'action-1',
          description: 'Pending action',
          status: 'pending',
          retroId: 'retro-123',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'action-2',
          description: 'Completed action',
          status: 'completed',
          retroId: 'retro-123',
          createdAt: new Date().toISOString(),
        },
      ];
      registerTrackRetroActions(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        action: 'list',
        status: 'pending',
      });

      expect(result.content[0].text).toContain('Pending action');
      expect(result.content[0].text).not.toContain('Completed action');
    });

    it('should filter actions by retroId', async () => {
      mockConfig.retroActions = [
        {
          id: 'action-1',
          description: 'Action from retro 1',
          status: 'pending',
          retroId: 'retro-1',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'action-2',
          description: 'Action from retro 2',
          status: 'pending',
          retroId: 'retro-2',
          createdAt: new Date().toISOString(),
        },
      ];
      registerTrackRetroActions(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        action: 'list',
        retroId: 'retro-1',
      });

      expect(result.content[0].text).toContain('Action from retro 1');
      expect(result.content[0].text).not.toContain('Action from retro 2');
    });
  });
});
