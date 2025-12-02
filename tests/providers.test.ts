import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JiraProvider } from '../src/providers/JiraProvider.js';
import { TrelloProvider } from '../src/providers/TrelloProvider.js';
import { AsanaProvider } from '../src/providers/AsanaProvider.js';
import { GitHubProvider } from '../src/providers/GitHubProvider.js';
import { AzureDevOpsProvider } from '../src/providers/AzureDevOpsProvider.js';
import { MondayProvider } from '../src/providers/MondayProvider.js';
import { ConfigManager } from '../src/config.js';
import { Octokit } from '@octokit/rest'; // Add this import

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
const { mockIssues, mockPaginate, MockOctokit } = vi.hoisted(() => {
  const mockIssues = {
    listForRepo: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const mockPaginate = vi.fn();

  // Define the instance that our mocked Octokit constructor will return
  const mockOctokitInstance = {
    rest: { issues: mockIssues },
    paginate: mockPaginate,
  };

  // Mock the Octokit class constructor
  // This is a function that *can* be new'd up, and its constructor will return our instance.
  const MockOctokit = vi.fn(function () { // Use a regular function for a mock constructor
    return mockOctokitInstance;
  });

  return { mockIssues, mockPaginate, MockOctokit };
});

vi.mock('@octokit/rest', () => ({
  Octokit: MockOctokit, // Export the mocked constructor
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
      MockOctokit.mockClear(); // Changed
      mockIssues.listForRepo.mockClear();
      mockIssues.get.mockClear();
      mockIssues.create.mockClear();
      mockIssues.update.mockClear();
      mockPaginate.mockClear();
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

      mockPaginate.mockResolvedValue(mockResponse); // Use mockPaginate directly

      const provider = new GitHubProvider(mockConfig as any);
      const tasks = await provider.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('1');
      expect(tasks[0].title).toBe('GitHub Issue');
      expect(tasks[0].assignee).toBe('octocat');
      expect(tasks[0].tags).toEqual(['bug']);
      expect(mockPaginate).toHaveBeenCalledWith( // Expect paginate to be called
        mockIssues.listForRepo, // Use mockIssues.listForRepo directly
        {
          owner: 'octocat',
          repo: 'hello-world',
          state: 'open',
          per_page: 100 // Add per_page expectation
        }
      );
      expect(MockOctokit).toHaveBeenCalledWith({ auth: 'ghp_token' }); // Changed to MockOctokit
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
          labels: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }
      });

      const provider = new GitHubProvider(mockConfig as any);
      const result = await provider.deleteTask('1'); 

      expect(result).toBe(true);
      expect(mockIssues.update).toHaveBeenCalledWith({
        owner: 'octocat',
        repo: 'hello-world',
        issue_number: 1,
        state: 'closed'
      });
    });
  });

  describe('AzureDevOpsProvider', () => {
    it('should fetch tasks via WIQL and details', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'azure-devops',
        credentials: { token: 'pat' },
        settings: { organization: 'org', project: 'proj' }
      });

      // Mock WIQL response
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ workItems: [{ id: 100 }] })
        })
        // Mock Details response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            value: [{
              id: 100,
              fields: {
                'System.Title': 'Azure Task',
                'System.State': 'To Do',
                'System.Description': 'Desc',
                'System.CreatedDate': '2024-01-01'
              }
            }]
          })
        });

      const provider = new AzureDevOpsProvider(mockConfig as any);
      const tasks = await provider.getTasks({} as any);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('100');
      expect(tasks[0].title).toBe('Azure Task');
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(1, 
        expect.stringContaining('_apis/wit/wiql'), 
        expect.anything()
      );
    });

    it('should create a task', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'azure-devops',
        credentials: { token: 'pat' },
        settings: { organization: 'org', project: 'proj' }
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 101,
          fields: {
            'System.Title': 'New Azure Item',
            'System.State': 'New',
            'System.Description': '',
            'System.WorkItemType': 'Task',
            'System.CreatedDate': '2024-01-01'
          }
        })
      });

      const provider = new AzureDevOpsProvider(mockConfig as any);
      const task = await provider.createTask({ title: 'New Azure Item' });

      expect(task.id).toBe('101');
      expect(task.title).toBe('New Azure Item');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('_apis/wit/workitems/$Task'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('MondayProvider', () => {
    it('should fetch items via GraphQL', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'monday',
        credentials: { token: 'token' },
        settings: { boardId: '123' }
      });

      const mockResponse = {
        data: {
          boards: [{
            items_page: {
              items: [{
                id: 'item-1',
                name: 'Monday Item',
                created_at: '2024-01-01',
                column_values: [{ type: 'status', text: 'Working on it' }]
              }]
            }
          }]
        }
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const provider = new MondayProvider(mockConfig as any);
      const tasks = await provider.getTasks({} as any);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('item-1');
      expect(tasks[0].status).toBe('Working on it');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.monday.com/v2',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should create item via GraphQL', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'monday',
        credentials: { token: 'token' },
        settings: { boardId: '123' }
      });

      const mockResponse = {
        data: {
          create_item: {
            id: 'item-2',
            name: 'New Item',
            created_at: '2024-01-01'
          }
        }
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const provider = new MondayProvider(mockConfig as any);
      const task = await provider.createTask({ title: 'New Item' });

      expect(task.id).toBe('item-2');
      expect(task.title).toBe('New Item');
    });
  });
});