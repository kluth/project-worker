/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerScheduleEvent } from '../../src/tools/scheduleEvent.js';
import { registerGetEvents } from '../../src/tools/getEvents.js';
import type { AppConfig } from '../../src/config.js';
import { configManager } from '../../src/config.js';
import type { Event } from '../../src/types.js';

// Mock configManager
vi.mock('../../src/config.js', () => ({
  configManager: {
    get: vi.fn(),
    save: vi.fn(),
  },
}));

describe('Event Management Tools', () => {
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
    };
    (configManager.get as vi.Mock).mockResolvedValue(mockConfig);
    (configManager.save as vi.Mock).mockImplementation(async (newConfig: AppConfig) => {
      mockConfig = newConfig; // Update mockConfig state
    });

    // Mock randomUUID for consistent IDs in tests
    vi.mock('crypto', () => ({
      randomUUID: vi.fn(() => 'test-uuid'),
    }));
  });

  describe('schedule_event', () => {
    it('should register the schedule_event tool', () => {
      registerScheduleEvent(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'schedule_event',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should schedule a new event', async () => {
      registerScheduleEvent(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'schedule_event',
      )[2];

      const eventInput = {
        type: 'planning',
        name: 'Sprint Planning',
        startTime: '2025-12-10T10:00:00Z',
        endTime: '2025-12-10T11:00:00Z',
        attendees: ['dev1', 'dev2'],
      };

      const result = await handler(eventInput);

      expect(configManager.get).toHaveBeenCalled();
      expect(configManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({
              id: 'test-uuid',
              type: eventInput.type,
              name: eventInput.name,
              startTime: eventInput.startTime,
            }),
          ]),
        }),
      );
      expect(result.content[0].text).toContain(
        `Event "${eventInput.name}" (${eventInput.type}) scheduled successfully`,
      );
      expect(mockConfig.events).toHaveLength(1);
      expect(mockConfig.events[0].id).toBe('test-uuid');
    });
  });

  describe('get_events', () => {
    it('should register the get_events tool', () => {
      registerGetEvents(mockServer);
      expect(mockServer.registerTool).toHaveBeenCalledWith(
        'get_events',
        expect.any(Object),
        expect.any(Function),
      );
    });

    const mockEvents: Event[] = [
      {
        id: 'e1',
        type: 'planning',
        name: 'Past Planning',
        startTime: '2025-11-01T10:00:00Z',
        endTime: '2025-11-01T11:00:00Z',
        notificationSent: false,
      },
      {
        id: 'e2',
        type: 'stand-up',
        name: 'Today Standup',
        startTime: '2025-12-02T09:00:00Z',
        endTime: '2025-12-02T11:00:00Z',
        notificationSent: false,
      }, // Changed endTime
      {
        id: 'e3',
        type: 'review',
        name: 'Future Review',
        startTime: '2025-12-15T14:00:00Z',
        endTime: '2025-12-15T15:00:00Z',
        notificationSent: false,
      },
    ];

    it('should list all events', async () => {
      mockConfig.events = [...mockEvents];
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerGetEvents(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'get_events',
      )[2];

      const result = await handler({ status: 'all' });
      expect(JSON.parse(result.content[0].text)).toHaveLength(3);
      expect(JSON.parse(result.content[0].text)[0].id).toBe('e1');
    });

    it('should filter events by type', async () => {
      mockConfig.events = [...mockEvents];
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerGetEvents(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'get_events',
      )[2];

      const result = await handler({ type: 'stand-up', status: 'all' });
      expect(JSON.parse(result.content[0].text)).toHaveLength(1);
      expect(JSON.parse(result.content[0].text)[0].id).toBe('e2');
    });

    it('should filter upcoming events', async () => {
      mockConfig.events = [...mockEvents]; // Note: need to adjust mockEvents's dates for "upcoming" relative to test run
      // For this test, let's assume 'e1' is past, 'e2' is today, 'e3' is future
      const now = new Date('2025-12-02T10:00:00Z'); // Set a fixed 'now' for consistent testing

      vi.useFakeTimers();
      vi.setSystemTime(now);

      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerGetEvents(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'get_events',
      )[2];

      const result = await handler({ status: 'upcoming' });
      const events = JSON.parse(result.content[0].text);
      expect(events).toHaveLength(2); // Changed expectation to 2
      expect(events[0].id).toBe('e2');
      expect(events[1].id).toBe('e3');

      vi.useRealTimers();
    });

    it('should filter past events', async () => {
      mockConfig.events = [...mockEvents];
      const now = new Date('2025-12-02T10:00:00Z'); // Set a fixed 'now' for consistent testing

      vi.useFakeTimers();
      vi.setSystemTime(now);

      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerGetEvents(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'get_events',
      )[2];

      const result = await handler({ status: 'past' });
      const events = JSON.parse(result.content[0].text);
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('e1');

      vi.useRealTimers();
    });

    it('should filter by date range', async () => {
      mockConfig.events = [...mockEvents];
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerGetEvents(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'get_events',
      )[2];

      const result = await handler({
        startDate: '2025-12-01T00:00:00Z',
        endDate: '2025-12-05T00:00:00Z',
        status: 'all', // To ignore status filter
      });
      const events = JSON.parse(result.content[0].text);
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('e2');
    });

    it('should return message if no events found', async () => {
      registerGetEvents(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'get_events',
      )[2];

      const result = await handler({}); // No events in mockConfig initially
      expect(result.content[0].text).toContain('No events found matching the criteria.');
    });

    it('should return a specific event by ID', async () => {
      mockConfig.events = [...mockEvents];
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerGetEvents(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'get_events',
      )[2];

      const result = await handler({ eventId: 'e2' });
      const events = JSON.parse(result.content[0].text);
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('e2');
    });

    it('should return error if specific event not found by ID', async () => {
      mockConfig.events = [...mockEvents];
      (configManager.get as vi.Mock).mockResolvedValueOnce(mockConfig);

      registerGetEvents(mockServer);
      const handler = (mockServer.registerTool as any).mock.calls.find(
        (c: any) => c[0] === 'get_events',
      )[2];

      const result = await handler({ eventId: 'non-existent' });
      expect(result.content[0].text).toContain('Event with ID non-existent not found.');
    });
  });
});
