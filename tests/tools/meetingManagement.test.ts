/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCreateMeeting } from '../../src/tools/createMeeting.js';
import { registerAddMeetingNote } from '../../src/tools/addMeetingNote.js';
import { registerSummarizeMeeting } from '../../src/tools/summarizeMeeting.js';
import type { AppConfig } from '../../src/config.js';
import { configManager } from '../../src/config.js';

// Mock configManager
vi.mock('../../src/config.js', () => ({
  configManager: {
    get: vi.fn(),
    save: vi.fn(),
  },
}));

describe('Meeting Management Tools', () => {
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
      meetings: [],
    } as AppConfig;

    (configManager.get as vi.Mock).mockResolvedValue(mockConfig);
  });

  describe('create_meeting', () => {
    it('should register the create_meeting tool', () => {
      registerCreateMeeting(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'create_meeting',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should create a new meeting', async () => {
      registerCreateMeeting(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        topic: 'Sprint Planning',
        attendees: ['Alice', 'Bob', 'Charlie'],
        agenda: ['Review backlog', 'Estimate stories', 'Plan sprint goals'],
        scheduledFor: '2025-12-10T10:00:00Z',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Meeting created');
    });

    it('should support meetings without scheduled time', async () => {
      registerCreateMeeting(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        topic: 'Ad-hoc Discussion',
        attendees: ['Alice'],
        agenda: ['Discuss blockers'],
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
    });

    it('should support optional location', async () => {
      registerCreateMeeting(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        topic: 'Team Standup',
        attendees: ['Team'],
        agenda: ['Daily updates'],
        location: 'Conference Room A',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Meeting created');
    });
  });

  describe('add_meeting_note', () => {
    it('should register the add_meeting_note tool', () => {
      registerAddMeetingNote(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'add_meeting_note',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should add a note to an existing meeting', async () => {
      mockConfig.meetings = [
        {
          id: 'meeting-123',
          topic: 'Sprint Review',
          attendees: ['Alice', 'Bob'],
          agenda: ['Demo features'],
          notes: [],
          createdAt: new Date().toISOString(),
        },
      ];
      registerAddMeetingNote(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        meetingId: 'meeting-123',
        content: 'Discussed feature X implementation',
        author: 'Alice',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Note added');
    });

    it('should support notes with timestamps', async () => {
      mockConfig.meetings = [
        {
          id: 'meeting-123',
          topic: 'Daily Standup',
          attendees: ['Team'],
          agenda: [],
          notes: [],
          createdAt: new Date().toISOString(),
        },
      ];
      registerAddMeetingNote(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        meetingId: 'meeting-123',
        content: 'Bob mentioned blocker with API',
        author: 'Alice',
        timestamp: '2025-12-10T10:15:00Z',
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
    });

    it('should error if meeting not found', async () => {
      registerAddMeetingNote(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        meetingId: 'non-existent',
        content: 'Test note',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    it('should support action items in notes', async () => {
      mockConfig.meetings = [
        {
          id: 'meeting-123',
          topic: 'Team Retro',
          attendees: ['Team'],
          agenda: [],
          notes: [],
          createdAt: new Date().toISOString(),
        },
      ];
      registerAddMeetingNote(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        meetingId: 'meeting-123',
        content: 'Need to improve code review process',
        author: 'Bob',
        actionItem: true,
      });

      expect(configManager.save).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
    });
  });

  describe('summarize_meeting', () => {
    it('should register the summarize_meeting tool', () => {
      registerSummarizeMeeting(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'summarize_meeting',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should generate a summary from meeting notes', async () => {
      mockConfig.meetings = [
        {
          id: 'meeting-123',
          topic: 'Sprint Planning',
          attendees: ['Alice', 'Bob', 'Charlie'],
          agenda: ['Review backlog', 'Estimate stories'],
          notes: [
            {
              id: 'note-1',
              content: 'Reviewed 10 backlog items',
              author: 'Alice',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'note-2',
              content: 'Estimated story points for high priority items',
              author: 'Bob',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'note-3',
              content: 'Sprint goal: Complete authentication feature',
              author: 'Charlie',
              createdAt: new Date().toISOString(),
              actionItem: true,
            },
          ],
          createdAt: new Date().toISOString(),
        },
      ];
      registerSummarizeMeeting(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        meetingId: 'meeting-123',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Summary');
      expect(result.content[0].text).toContain('Sprint Planning');
    });

    it('should error if meeting not found', async () => {
      registerSummarizeMeeting(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        meetingId: 'non-existent',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    it('should handle meetings with no notes', async () => {
      mockConfig.meetings = [
        {
          id: 'meeting-123',
          topic: 'Quick Sync',
          attendees: ['Alice'],
          agenda: [],
          notes: [],
          createdAt: new Date().toISOString(),
        },
      ];
      registerSummarizeMeeting(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        meetingId: 'meeting-123',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('No notes');
    });

    it('should highlight action items in summary', async () => {
      mockConfig.meetings = [
        {
          id: 'meeting-123',
          topic: 'Team Meeting',
          attendees: ['Team'],
          agenda: [],
          notes: [
            {
              id: 'note-1',
              content: 'Regular discussion',
              author: 'Alice',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'note-2',
              content: 'ACTION: Update documentation',
              author: 'Bob',
              createdAt: new Date().toISOString(),
              actionItem: true,
            },
          ],
          createdAt: new Date().toISOString(),
        },
      ];
      registerSummarizeMeeting(mockServer);
      const handler = (mockServer.registerTool as vi.Mock).mock.calls[0][2];

      const result = await handler({
        meetingId: 'meeting-123',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Action Items');
    });
  });
});
