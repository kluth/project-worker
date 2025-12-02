import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JiraProvider } from '../src/providers/JiraProvider.js';
import { TrelloProvider } from '../src/providers/TrelloProvider.js';
import { AsanaProvider } from '../src/providers/AsanaProvider.js';
import { GitHubProvider } from '../src/providers/GitHubProvider.js'; // Added
import { ConfigManager } from '../src/config.js';

// Mock ConfigManager
const mockConfig = {
  getProviderConfig: vi.fn(),
};

// Mock global fetch
const { mockFetch } = vi.hoisted(() => {
  const mockFetch = vi.fn();
  return { mockFetch };
});
global.fetch = mockFetch;

// Mock Octokit
const { mockOctokit, mockIssues } = vi.hoisted(() => {
  const mockIssues = {
    listForRepo: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const mockOctokit = vi.fn(function() {
    // This is the actual instance that GitHubProvider will get
    return {
      rest: {
        issues: mockIssues,
      },
      // Potentially other Octokit internals could be mocked here if needed
    };
  });
  return { mockOctokit, mockIssues };
});

vi.mock('@octokit/rest', () => ({
  Octokit: mockOctokit,
}));

describe('Providers (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('JiraProvider', () => {
    it('should fetch and map tasks correctly', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'jira',
        credentials: { email: 'user@test.com', token: 'token' },
        settings: { domain: 'test.atlassian.net' }
      });

      const mockResponse = {
        issues: [
          {
            key: 'PROJ-1',
            fields: {
              summary: 'Jira Task',
              description: 'Desc',
              status: { name: 'To Do' },
              priority: { name: 'High' },
              issuetype: { name: 'Story' },
              assignee: { displayName: 'Alice' },
              labels: ['frontend'],
              created: '2024-01-01T00:00:00.000Z',
              updated: '2024-01-01T00:00:00.000Z'
            }
          }
        ]
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const provider = new JiraProvider(mockConfig as any);
      const tasks = await provider.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('PROJ-1');
      expect(tasks[0].title).toBe('Jira Task');
      expect(tasks[0].type).toBe('story');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.atlassian.net/rest/api/3/search?jql=order%20by%20created%20DESC',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic ')
          })
        })
      );
    });

    it('should create a task', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'jira',
        credentials: { email: 'user@test.com', token: 'token' },
        settings: { domain: 'test.atlassian.net', projectKey: 'PROJ' }
      });

      const mockCreatedIssue = {
        key: 'PROJ-2',
        self: 'http://...'
      };
      
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => mockCreatedIssue }) // Create
        .mockResolvedValueOnce({ // Get
          ok: true, 
          json: async () => ({ 
            key: 'PROJ-2', 
            fields: { 
              summary: 'New Task', 
              description: '', 
              status: { name: 'To Do' }, 
              issuetype: { name: 'Task' }, 
              labels: [], 
              created: '', 
              updated: '' 
            } 
          }) 
        });

      const provider = new JiraProvider(mockConfig as any);
      const task = await provider.createTask({ title: 'New Task', description: 'Desc' });

      expect(task.id).toBe('PROJ-2');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.atlassian.net/rest/api/3/issue',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('TrelloProvider', () => {
    it('should fetch cards from board', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'trello',
        credentials: { key: 'key', token: 'token' },
        settings: { boardId: 'board123' }
      });

      const mockCards = [
        { id: 'card1', name: 'Trello Card', desc: 'Desc', labels: [], idMembers: [] }
      ];

      (global.fetch as any).mockResolvedValue({ ok: true, json: async () => mockCards });

      const provider = new TrelloProvider(mockConfig as any);
      const tasks = await provider.getTasks();

      expect(tasks[0].id).toBe('card1');
      expect(tasks[0].title).toBe('Trello Card');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.trello.com/1/boards/board123/cards')
      );
    });
  });

  describe('AsanaProvider', () => {
    it('should fetch tasks from project', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'asana',
        credentials: { token: 'pat' },
        settings: { projectId: 'proj123' }
      });

      const mockResponse = {
        data: [
          { gid: 'task1', name: 'Asana Task', notes: 'Desc', completed: false }
        ]
      };

      (global.fetch as any).mockResolvedValue({ ok: true, json: async () => mockResponse });

      const provider = new AsanaProvider(mockConfig as any);
      const tasks = await provider.getTasks();

      expect(tasks[0].id).toBe('task1');
      expect(tasks[0].title).toBe('Asana Task');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('app.asana.com/api/1.0/tasks'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer pat' })
        })
      );
    });
  });

  describe('GitHubProvider', () => {
    beforeEach(() => {
      mockOctokit.mockClear();
      mockIssues.listForRepo.mockClear();
      mockIssues.get.mockClear();
      mockIssues.create.mockClear();
      mockIssues.update.mockClear();
    });

    it('should fetch and map tasks correctly', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'github',
        credentials: { token: 'ghp_token' },
        settings: { repo: 'octocat/hello-world' }
      });

      const mockResponse = [
        {
          number: 1,
          title: 'GitHub Issue',
          body: 'Issue Body',
          state: 'open',
          assignee: { login: 'octocat' },
          labels: [{ name: 'bug' }],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }
      ];

      mockIssues.listForRepo.mockResolvedValue({ data: mockResponse });

      const provider = new GitHubProvider(mockConfig as any);
      const tasks = await provider.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('1');
      expect(tasks[0].title).toBe('GitHub Issue');
      expect(tasks[0].assignee).toBe('octocat');
      expect(tasks[0].tags).toEqual(['bug']);
      expect(mockIssues.listForRepo).toHaveBeenCalledWith({
        owner: 'octocat',
        repo: 'hello-world',
        state: 'open'
      });
      expect(mockOctokit).toHaveBeenCalledWith({ auth: 'ghp_token' });
    });

    it('should create a task', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'github',
        credentials: { token: 'ghp_token' },
        settings: { repo: 'octocat/hello-world' }
      });

      const mockCreatedIssue = {
        number: 2,
        title: 'New GitHub Issue',
        body: 'New Body',
        state: 'open',
        assignee: { login: 'octocat' },
        labels: [],
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockIssues.create.mockResolvedValue({ data: mockCreatedIssue });

      const provider = new GitHubProvider(mockConfig as any);
      const task = await provider.createTask({ title: 'New GitHub Issue', description: 'New Body' });

      expect(task.id).toBe('2');
      expect(task.title).toBe('New GitHub Issue');
      expect(mockIssues.create).toHaveBeenCalledWith({
        owner: 'octocat',
        repo: 'hello-world',
        title: 'New GitHub Issue',
        body: 'New Body'
      });
    });

    it('should delete (close) a task', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'github',
        credentials: { token: 'ghp_token' },
        settings: { repo: 'octocat/hello-world' }
      });

            mockIssues.update.mockResolvedValue({

              data: {

                number: 1,

                title: 'Closed Issue',

                body: '',

                state: 'closed',

                assignee: null,

                labels: [], // Provide an empty array for labels

                created_at: '2024-01-01T00:00:00Z',

                updated_at: '2024-01-01T00:00:00Z',

              }

            });

      const provider = new GitHubProvider(mockConfig as any);
      const result = await provider.deleteTask('1'); // issue number

      expect(result).toBe(true);
      expect(mockIssues.update).toHaveBeenCalledWith({
        owner: 'octocat',
        repo: 'hello-world',
        issue_number: 1,
        state: 'closed'
      });
    });
  });
});