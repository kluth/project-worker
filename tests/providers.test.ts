import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JiraProvider } from '../src/providers/JiraProvider.js';
import { TrelloProvider } from '../src/providers/TrelloProvider.js';
import { AsanaProvider } from '../src/providers/AsanaProvider.js';
import { GitHubProvider } from '../src/providers/GitHubProvider.js';
import { AzureDevOpsProvider } from '../src/providers/AzureDevOpsProvider.js';
import { MondayProvider } from '../src/providers/MondayProvider.js';
import { LocalProvider } from '../src/providers/LocalProvider.js';
import type { ConfigManager } from '../src/config.js';
import type { TaskFilter, Task } from '../src/types.js';
import type { Octokit } from '@octokit/rest';
import os from 'os';

// Mock ConfigManager
const mockConfig: ConfigManager = {
  getProviderConfig: vi.fn(),
  get: vi.fn(),
  save: vi.fn(),
  setActiveProvider: vi.fn(),
};

// Mock global fetch
const { mockFetch } = vi.hoisted(() => {
  const mockFetch = vi.fn<[RequestInfo | URL, RequestInit?], Promise<Response>>();
  return { mockFetch };
});
global.fetch = mockFetch;

const { mockIssues, mockPaginate, MockOctokit } = vi.hoisted(() => {
  const mockIssues: Partial<Octokit['rest']['issues']> = {
    listForRepo: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    createComment: vi.fn(),
  };

  const mockPaginate = vi.fn();

  // Define the instance that our mocked Octokit constructor will return
  const mockOctokitInstance = {
    rest: { issues: mockIssues },
    paginate: mockPaginate,
  };

  // Mock the Octokit class constructor
  const MockOctokit = vi.fn(function () {
    // Use a regular function for a mock constructor
    return mockOctokitInstance;
  });

  return { mockIssues, mockPaginate, MockOctokit };
});

vi.mock('@octokit/rest', () => ({
  Octokit: MockOctokit,
}));

// Mock DB
vi.mock('../src/db.js', () => ({
  db: {
    getTasks: vi.fn(),
    getTaskById: vi.fn(),
    addTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  },
}));

import { db } from '../src/db.js';

describe('Providers (TDD)', () => {
  beforeEach(() => {
    vi.restoreAllMocks(); // Restore spies
    vi.clearAllMocks();
    mockFetch.mockClear();
    // Clear Octokit mocks
    MockOctokit.mockClear();
    mockIssues.listForRepo.mockClear();
    mockIssues.get.mockClear();
    mockIssues.create.mockClear();
    mockIssues.update.mockClear();
    mockIssues.createComment.mockClear(); // Keep this clear from earlier merges
    mockPaginate.mockClear(); // Clear paginate mock
  });

  describe('LocalProvider', () => {
    it('should add a comment with correct author (OS user)', async () => {
      // Spy on os.userInfo
      vi.spyOn(os, 'userInfo').mockReturnValue({
        username: 'testuser',
        uid: 1000,
        gid: 1000,
        homedir: '/home/testuser',
        shell: '/bin/bash',
      });

      const task: Task = {
        id: '1',
        title: 'Test Task',
        description: '',
        status: 'todo',
        priority: 'medium',
        type: 'task',
        tags: [],
        comments: [],
        createdAt: '',
        updatedAt: '',
        checklists: [],
        customFields: {},
        blockedBy: [],
      };
      (db.getTaskById as vi.Mock).mockResolvedValue(task);

      const provider = new LocalProvider();
      await provider.addComment('1', 'Test Comment');

      expect(db.updateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          comments: expect.arrayContaining([
            expect.objectContaining({
              author: 'testuser',
              content: 'Test Comment',
            }),
          ]),
        }),
      );
    });
  });

  describe('JiraProvider', () => {
    it('should fetch and map tasks correctly', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'jira',
        credentials: { email: 'user@test.com', token: 'token' },
        settings: { domain: 'test.atlassian.net' },
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
              updated: '2024-01-01T00:00:00.000Z',
            },
          },
        ],
      };

      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const provider = new JiraProvider(mockConfig);
      const tasks = await provider.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('PROJ-1');
      expect(tasks[0].title).toBe('Jira Task');
      expect(tasks[0].type).toBe('story');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.atlassian.net/rest/api/3/search?jql=order%20by%20created%20DESC',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
          }),
        }),
      );
    });

    it('should create a task', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'jira',
        credentials: { email: 'user@test.com', token: 'token' },
        settings: { domain: 'test.atlassian.net', projectKey: 'PROJ' },
      });

      const mockCreatedIssue = {
        key: 'PROJ-2',
        self: 'http://...',
      };

      (global.fetch as vi.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockCreatedIssue })
        .mockResolvedValueOnce({
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
              updated: '',
            },
          }),
        });

      const provider = new JiraProvider(mockConfig);
      const task = await provider.createTask({ title: 'New Task', description: 'Desc' });

      expect(task.id).toBe('PROJ-2');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.atlassian.net/rest/api/3/issue',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should update a task', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'jira',
        credentials: { email: 'user@test.com', token: 'token' },
        settings: { domain: 'test.atlassian.net' },
      });

      (global.fetch as vi.Mock).mockResolvedValue({ ok: true, status: 204 }); // Jira update returns 204 No Content on success

      const provider = new JiraProvider(mockConfig);
      // We don't expect a return value for updateTask as per interface (Promise<Task>),
      // but often we re-fetch. However, for this test, let's just verify the call.
      // Wait, the interface says Promise<Task>. So we must re-fetch.
      // Mock the re-fetch.
      (global.fetch as vi.Mock)
        .mockResolvedValueOnce({ ok: true, status: 204 }) // PUT
        .mockResolvedValueOnce({
          // GET
          ok: true,
          json: async () => ({
            key: 'PROJ-1',
            fields: {
              summary: 'Updated Summary',
              description: 'Updated Desc',
              status: { name: 'To Do' },
              priority: { name: 'Medium' },
              issuetype: { name: 'Task' },
              assignee: null,
              labels: [],
              created: '',
              updated: '',
            },
          }),
        });

      const updatedTask = await provider.updateTask({
        id: 'PROJ-1',
        title: 'Updated Summary',
        description: 'Updated Desc',
      });

      expect(updatedTask.title).toBe('Updated Summary');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.atlassian.net/rest/api/3/issue/PROJ-1',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"summary":"Updated Summary"'),
        }),
      );
    });

    it('should add a comment', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'jira',
        credentials: { email: 'user@test.com', token: 'token' },
        settings: { domain: 'test.atlassian.net' },
      });

      (global.fetch as vi.Mock)
        .mockResolvedValueOnce({ ok: true, status: 201 }) // POST comment
        .mockResolvedValueOnce({
          // GET task
          ok: true,
          json: async () => ({
            key: 'PROJ-1',
            fields: {
              summary: 'Task',
              description: '',
              status: { name: 'To Do' },
              priority: { name: 'Medium' },
              issuetype: { name: 'Task' },
              assignee: null,
              labels: [],
              created: '',
              updated: '',
            },
          }),
        });

      const provider = new JiraProvider(mockConfig);
      await provider.addComment('PROJ-1', 'New Comment');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.atlassian.net/rest/api/3/issue/PROJ-1/comment',
        expect.objectContaining({
          method: 'POST',
          // Verify ADF structure
          body: expect.stringMatching(/"type":"doc"/),
        }),
      );
    });
  });

  describe('TrelloProvider', () => {
    it('should fetch cards from board', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'trello',
        credentials: { key: 'key', token: 'token' },
        settings: { boardId: 'board123' },
      });

      const mockCards = [
        { id: 'card1', name: 'Trello Card', desc: 'Desc', labels: [], idMembers: [] },
      ];

      (global.fetch as vi.Mock).mockResolvedValue({ ok: true, json: async () => mockCards });

      const provider = new TrelloProvider(mockConfig);
      const tasks = await provider.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('card1');
      expect(tasks[0].title).toBe('Trello Card');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.trello.com/1/boards/board123/cards'),
      );
    });

    it('should update a card', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'trello',
        credentials: { key: 'key', token: 'token' },
        settings: { boardId: 'board123' },
      });

      const mockUpdatedCard = {
        id: 'card1',
        name: 'Updated Name',
        desc: 'Updated Desc',
        labels: [],
        idMembers: [],
      };

      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUpdatedCard,
      });

      const provider = new TrelloProvider(mockConfig);
      const task = await provider.updateTask({
        id: 'card1',
        title: 'Updated Name',
        description: 'Updated Desc',
      });

      expect(task.title).toBe('Updated Name');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.trello.com/1/cards/card1'),
        expect.objectContaining({ method: 'PUT' }),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('name=Updated%20Name'),
        expect.anything(),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('desc=Updated%20Desc'),
        expect.anything(),
      );
    });

    it('should add a comment to a card', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'trello',
        credentials: { key: 'key', token: 'token' },
        settings: { boardId: 'board123' },
      });

      const mockCardWithComment = {
        id: 'card1',
        name: 'Card Name',
        desc: 'Desc',
        labels: [],
        idMembers: [],
      };

      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockCardWithComment,
      });

      const provider = new TrelloProvider(mockConfig);
      await provider.addComment('card1', 'New Comment');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.trello.com/1/cards/card1/actions/comments'),
        expect.objectContaining({ method: 'POST' }),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('text=New%20Comment'),
        expect.anything(),
      );
    });
  });

  describe('AsanaProvider', () => {
    it('should fetch tasks from project', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'asana',
        credentials: { token: 'pat' },
        settings: { projectId: 'proj123' },
      });

      const mockResponse = {
        data: [{ gid: 'task1', name: 'Asana Task', notes: 'Desc', completed: false }],
      };

      (global.fetch as vi.Mock).mockResolvedValue({ ok: true, json: async () => mockResponse });

      const provider = new AsanaProvider(mockConfig);
      const tasks = await provider.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('task1');
      expect(tasks[0].title).toBe('Asana Task');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('app.asana.com/api/1.0/tasks'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer pat' }),
        }),
      );
    });

    it('should update a task', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'asana',
        credentials: { token: 'pat' },
        settings: { projectId: 'proj123' },
      });

      (global.fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            gid: 'task1',
            name: 'Updated Task',
            notes: 'Updated Notes',
            completed: true,
            created_at: '',
          },
        }),
      });

      const provider = new AsanaProvider(mockConfig);
      const task = await provider.updateTask({
        id: 'task1',
        title: 'Updated Task',
        description: 'Updated Notes',
        status: 'done',
      });

      expect(task.title).toBe('Updated Task');
      expect(task.status).toBe('done');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://app.asana.com/api/1.0/tasks/task1',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"completed":true'),
        }),
      );
    });

    it('should add a comment', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'asana',
        credentials: { token: 'pat' },
        settings: { projectId: 'proj123' },
      });

      (global.fetch as vi.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {} }) }) // POST story
        .mockResolvedValueOnce({
          // GET task
          ok: true,
          json: async () => ({
            data: {
              gid: 'task1',
              name: 'Task',
              notes: '',
              completed: false,
              created_at: '',
            },
          }),
        });

      const provider = new AsanaProvider(mockConfig);
      await provider.addComment('task1', 'Nice work');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://app.asana.com/api/1.0/tasks/task1/stories',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"text":"Nice work"'),
        }),
      );
    });
  });

  describe('GitHubProvider', () => {
    // Temporarily disabled due to persistent Vitest mocking issues with Octokit.paginate.
    // This should be re-enabled and fixed in a dedicated issue (e.g., #GH_MOCK_FIX).
    beforeEach(() => {
      MockOctokit.mockClear(); // Clear the mocked constructor
      mockIssues.listForRepo.mockClear();
      mockIssues.get.mockClear();
      mockIssues.create.mockClear();
      mockIssues.update.mockClear();
      mockIssues.createComment.mockClear();
      mockPaginate.mockClear(); // Clear paginate mock
    });

    it('should fetch and map tasks correctly', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'github',
        credentials: { token: 'ghp_token' },
        settings: { repo: 'octocat/hello-world' },
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
        },
      ];

      mockPaginate.mockResolvedValue(mockResponse); // Use mockPaginate directly

      const provider = new GitHubProvider(mockConfig);
      const tasks = await provider.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('1');
      expect(tasks[0].title).toBe('GitHub Issue');
      expect(tasks[0].assignee).toBe('octocat');
      expect(mockPaginate).toHaveBeenCalledWith(
        // Expect paginate to be called
        mockIssues.listForRepo, // Use mockIssues.listForRepo directly
        {
          owner: 'octocat',
          repo: 'hello-world',
          state: 'open',
          per_page: 100, // Add per_page expectation
        },
      );
      expect(MockOctokit).toHaveBeenCalledWith({ auth: 'ghp_token' }); // Expect the constructor to be called
    });

    it('should create a task', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'github',
        credentials: { token: 'ghp_token' },
        settings: { repo: 'octocat/hello-world' },
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

      const provider = new GitHubProvider(mockConfig);
      const task = await provider.createTask({
        title: 'New GitHub Issue',
        description: 'New Body',
      });

      expect(task.id).toBe('2');
      expect(task.title).toBe('New GitHub Issue');
      expect(mockIssues.create).toHaveBeenCalledWith({
        owner: 'octocat',
        repo: 'hello-world',
        title: 'New GitHub Issue',
        body: 'New Body',
      });
    });

    it('should delete (close) a task', async () => {
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'github',
        credentials: { token: 'ghp_token' },
        settings: { repo: 'octocat/hello-world' },
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
        },
      });

      const provider = new GitHubProvider(mockConfig);
      const result = await provider.deleteTask('1');

      expect(result).toBe(true);
      expect(mockIssues.update).toHaveBeenCalledWith({
        owner: 'octocat',
        repo: 'hello-world',
        issue_number: 1,
        state: 'closed',
      });
    });
  });

  describe('AzureDevOpsProvider', () => {
    it('should fetch tasks via WIQL and details', async () => {
      mockFetch.mockClear(); // Ensure clear state
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'azure-devops',
        credentials: { token: 'pat' },
        settings: { organization: 'org', project: 'proj' },
      });

      // Mock WIQL response
      (global.fetch as vi.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ workItems: [{ id: 100 }] }),
        })
        // Mock Details response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            value: [
              {
                id: 100,
                fields: {
                  'System.Title': 'Azure Task',
                  'System.State': 'To Do',
                  'System.Description': 'Desc',
                  'System.CreatedDate': '2024-01-01',
                  'System.ChangedDate': '2024-01-01',
                },
              },
            ],
          }),
        });

      const provider = new AzureDevOpsProvider(mockConfig);
      const tasks = await provider.getTasks({} as TaskFilter);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('100');
      expect(tasks[0].title).toBe('Azure Task');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should create a task', async () => {
      mockFetch.mockClear();
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'azure-devops',
        credentials: { token: 'pat' },
        settings: { organization: 'org', project: 'proj' },
      });

      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 101,
          fields: {
            'System.Title': 'New Azure Item',
            'System.State': 'New',
            'System.Description': '',
            'System.WorkItemType': 'Task',
            'System.CreatedDate': '2024-01-01',
            'System.ChangedDate': '2024-01-01',
          },
        }),
      });

      const provider = new AzureDevOpsProvider(mockConfig);
      const task = await provider.createTask({ title: 'New Azure Item' });

      expect(task.id).toBe('101');
      expect(task.title).toBe('New Azure Item');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('_apis/wit/workitems/$Task'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should get task by id', async () => {
      mockFetch.mockClear();
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'azure-devops',
        credentials: { token: 'pat' },
        settings: { organization: 'org', project: 'proj' },
      });

      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 100,
          fields: {
            'System.Title': 'Azure Task',
            'System.State': 'To Do',
            'System.Description': 'Desc',
            'System.CreatedDate': '2024-01-01',
            'System.ChangedDate': '2024-01-01',
          },
        }),
      });

      const provider = new AzureDevOpsProvider(mockConfig);
      const task = await provider.getTaskById('100');

      expect(task?.title).toBe('Azure Task');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('_apis/wit/workitems/100'),
        expect.anything(),
      );
    });

    it('should update a task', async () => {
      mockFetch.mockClear();
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'azure-devops',
        credentials: { token: 'pat' },
        settings: { organization: 'org', project: 'proj' },
      });

      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 100,
          fields: {
            'System.Title': 'Updated Task',
            'System.State': 'To Do',
            'System.Description': 'Desc',
            'System.CreatedDate': '2024-01-01',
            'System.ChangedDate': '2024-01-01',
          },
        }),
      });

      const provider = new AzureDevOpsProvider(mockConfig);
      const task = await provider.updateTask({ id: '100', title: 'Updated Task' });

      expect(task.title).toBe('Updated Task');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('_apis/wit/workitems/100'),
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({ 'Content-Type': 'application/json-patch+json' }),
        }),
      );
    });

    it('should delete a task', async () => {
      mockFetch.mockClear();
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'azure-devops',
        credentials: { token: 'pat' },
        settings: { organization: 'org', project: 'proj' },
      });

      (global.fetch as vi.Mock).mockResolvedValue({ ok: true, status: 204 });

      const provider = new AzureDevOpsProvider(mockConfig);
      const result = await provider.deleteTask('100');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('_apis/wit/workitems/100'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('should add a comment', async () => {
      mockFetch.mockClear();
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'azure-devops',
        credentials: { token: 'pat' },
        settings: { organization: 'org', project: 'proj' },
      });

      // POST comment
      (global.fetch as vi.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        // GET task (re-fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 100,
            fields: { 'System.Title': 'Task' },
          }),
        });

      const provider = new AzureDevOpsProvider(mockConfig);
      await provider.addComment('100', 'New Comment');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('_apis/wit/workItems/100/comments'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"text":"New Comment"'),
        }),
      );
    });
  });

  describe('MondayProvider', () => {
    it('should fetch items via GraphQL', async () => {
      mockFetch.mockClear();
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'monday',
        credentials: { token: 'token' },
        settings: { boardId: '123' },
      });

      const mockResponse = {
        data: {
          boards: [
            {
              items_page: {
                items: [
                  {
                    id: 'item-1',
                    name: 'Monday Item',
                    created_at: '2024-01-01',
                    updated_at: '2024-01-01',
                    column_values: [{ type: 'status', text: 'Working on it', id: 'status' }],
                  },
                ],
              },
            },
          ],
        },
      };

      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const provider = new MondayProvider(mockConfig);
      const tasks = await provider.getTasks({} as TaskFilter);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('item-1');
      expect(tasks[0].status).toBe('Working on it');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.monday.com/v2',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should create item via GraphQL', async () => {
      mockFetch.mockClear();
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'monday',
        credentials: { token: 'token' },
        settings: { boardId: '123' },
      });

      const mockResponse = {
        data: {
          create_item: {
            id: 'item-2',
            name: 'New Item',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
        },
      };

      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const provider = new MondayProvider(mockConfig);
      const task = await provider.createTask({ title: 'New Item' });

      expect(task.id).toBe('item-2');
      expect(task.title).toBe('New Item');
    });

    it('should get item by id', async () => {
      mockFetch.mockClear();
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'monday',
        credentials: { token: 'token' },
        settings: { boardId: '123' },
      });

      const mockResponse = {
        data: {
          items: [
            {
              id: 'item-1',
              name: 'Monday Item',
              created_at: '2024-01-01',
              updated_at: '2024-01-01',
              column_values: [],
            },
          ],
        },
      };

      (global.fetch as vi.Mock).mockResolvedValue({ ok: true, json: async () => mockResponse });

      const provider = new MondayProvider(mockConfig);
      const task = await provider.getTaskById('item-1');

      expect(task?.id).toBe('item-1');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.monday.com/v2',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should update an item', async () => {
      mockFetch.mockClear();
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'monday',
        credentials: { token: 'token' },
        settings: { boardId: '123' },
      });

      // 1. Mutation response
      (global.fetch as vi.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              change_multiple_column_values: {
                id: 'item-1',
              },
            },
          }),
        })
        // 2. Re-fetch (getTaskById) response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              items: [
                {
                  id: 'item-1',
                  name: 'Updated', // Refetched name
                  created_at: '',
                  updated_at: '',
                  column_values: [],
                },
              ],
            },
          }),
        });

      const provider = new MondayProvider(mockConfig);
      const task = await provider.updateTask({ id: 'item-1', title: 'Updated', status: 'Done' });

      expect(task.title).toBe('Updated');
    });

    it('should delete an item', async () => {
      mockFetch.mockClear();
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'monday',
        credentials: { token: 'token' },
        settings: { boardId: '123' },
      });

      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: { delete_item: { id: 'item-1' } } }),
      });

      const provider = new MondayProvider(mockConfig);
      const result = await provider.deleteTask('item-1');

      expect(result).toBe(true);
    });

    it('should add an update (comment)', async () => {
      mockFetch.mockClear();
      mockConfig.getProviderConfig.mockResolvedValue({
        provider: 'monday',
        credentials: { token: 'token' },
        settings: { boardId: '123' },
      });

      (global.fetch as vi.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { create_update: { id: 'u1' } } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              items: [
                {
                  id: 'item-1',
                  name: 'Item',
                  created_at: '',
                  updated_at: '',
                  column_values: [],
                },
              ],
            },
          }),
        });

      const provider = new MondayProvider(mockConfig);
      await provider.addComment('item-1', 'Update text');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.monday.com/v2',
        expect.objectContaining({
          body: expect.stringContaining('create_update'),
        }),
      );
    });
  });
});
