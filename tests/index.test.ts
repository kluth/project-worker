import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll, // Added beforeAll
  type Mock,
} from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Task, Sprint, AuditLogEntry, WikiPage, Discussion, Release } from '../src/types.js';
import { randomUUID } from 'crypto';

// --- Hoisted Mocks Section ---

// Mock Node's fs/promises for ConfigManager tests
const fsMocks = {
  access: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
};
vi.mock('fs/promises', () => ({
  default: fsMocks,
}));

// Hoist McpServer mocks
const { MockMcpServer, mockRegisterTool, mockRegisterPrompt, mockConnect } = vi.hoisted(() => {
  const mockRegisterTool = vi.fn();
  const mockRegisterPrompt = vi.fn();
  const mockConnect = vi.fn();
  
  const MockMcpServer = vi.fn().mockImplementation(function() {
    return {
      registerTool: mockRegisterTool,
      registerPrompt: mockRegisterPrompt,
      connect: mockConnect,
    };
  });

  return { MockMcpServer, mockRegisterTool, mockRegisterPrompt, mockConnect };
});

// Hoist DB mocks
const { dbMocks } = vi.hoisted(() => {
  const dbMocks = {
    getTasks: vi.fn(),
    addTask: vi.fn(),
    getTaskById: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    getSprints: vi.fn(),
    addSprint: vi.fn(),
    addAuditLog: vi.fn(),
    getAuditLogsForTask: vi.fn(),
    getWikiPages: vi.fn(),
    getWikiPageBySlug: vi.fn(),
    saveWikiPage: vi.fn(),
    getDiscussions: vi.fn(),
    getDiscussionById: vi.fn(),
    saveDiscussion: vi.fn(),
    getReleases: vi.fn(),
    addRelease: vi.fn(),
  };
  return { dbMocks };
});

// Hoist ConfigManager mocks
const { mockConfigManager } = vi.hoisted(() => {
  const mockConfigManager = {
    get: vi.fn(),
    setProviderConfig: vi.fn(),
    setActiveProvider: vi.fn(),
    getProviderConfig: vi.fn(),
    save: vi.fn(), // Ensure save is mocked
  };
  return { mockConfigManager };
});

// Hoist mockProvider for generic task management tests (where ProviderFactory is mocked)
const { mockProvider } = vi.hoisted(() => {
  const mockProvider = {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    getTaskById: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  };
  return { mockProvider };
});


// Mock concrete provider classes globally. These will return mock instances.
import { LocalProvider } from '../src/providers/LocalProvider.js';
import { GitHubProvider } from '../src/providers/GitHubProvider.js'; 
import { JiraProvider } from '../src/providers/JiraProvider.js';     
import { TrelloProvider } from '../src/providers/TrelloProvider.js';   
import { AsanaProvider } from '../src/providers/AsanaProvider.js';   

vi.mock('../src/providers/LocalProvider.js', () => ({
  LocalProvider: vi.fn().mockImplementation(() => ({
    name: 'local',
    getTasks: vi.fn(),
    createTask: vi.fn(),
    getTaskById: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  })),
}));

vi.mock('../src/providers/GitHubProvider.js', () => ({
  GitHubProvider: vi.fn().mockImplementation(() => ({
    name: 'github',
    getTasks: vi.fn(),
    createTask: vi.fn(),
    getTaskById: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  })),
}));

vi.mock('../src/providers/JiraProvider.js', () => ({
  JiraProvider: vi.fn().mockImplementation(() => ({
    name: 'jira',
    getTasks: vi.fn(),
    createTask: vi.fn(),
    getTaskById: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  })),
}));

vi.mock('../src/providers/TrelloProvider.js', () => ({
  TrelloProvider: vi.fn().mockImplementation(() => ({
    name: 'trello',
    getTasks: vi.fn(),
    createTask: vi.fn(),
    getTaskById: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  })),
}));

vi.mock('../src/providers/AsanaProvider.js', () => ({
  AsanaProvider: vi.fn().mockImplementation(() => ({
    name: 'asana',
    getTasks: vi.fn(),
    createTask: vi.fn(),
    getTaskById: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  })),
}));


// Mock the external dependencies that the main index.ts imports
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: MockMcpServer,
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));

vi.mock('child_process', () => ({
  exec: (cmd: string, cb: any) => mockExec(cmd, cb),
}));

vi.mock('../src/db.js', () => ({
  db: dbMocks,
}));

vi.mock('../src/config.js', () => ({
  configManager: mockConfigManager,
}));

// Import ProviderFactory after all concrete providers are mocked
import { ProviderFactory } from '../src/services/providerFactory.js'; 


// Helper to get tool handler
function getToolHandler(toolName: string) {
  const call = mockRegisterTool.mock.calls.find(c => c[0] === toolName);
  if (!call) throw new Error(`Tool ${toolName} not registered`);
  return call[2];
}

// Helper to get prompt handler
function getPromptHandler(promptName: string) {
  const call = mockRegisterPrompt.mock.calls.find(c => c[0] === promptName);
  if (!call) throw new Error(`Prompt ${promptName} not registered`);
  return call[2];
}

describe('Project Worker Server - Local Tools Coverage', () => {
  beforeEach(async () => {
    // Clear all hoisted mocks
    mockRegisterTool.mockClear();
    mockRegisterPrompt.mockClear();
    mockConnect.mockClear();
    mockExec.mockClear();
    Object.values(dbMocks).forEach(mockFn => mockFn.mockReset());
    Object.values(mockConfigManager).forEach(mockFn => mockFn.mockReset()); // Reset all methods on mockConfigManager

    // Reset mock instances of providers
    vi.mocked(LocalProvider).mockClear();
    vi.mocked(GitHubProvider).mockClear();
    vi.mocked(JiraProvider).mockClear();
    vi.mocked(TrelloProvider).mockClear();
    vi.mocked(AsanaProvider).mockClear();

    // Re-configure base mock behavior for configManager for tests that need it
    mockConfigManager.get.mockResolvedValue({ activeProvider: 'local', providers: [] });
    mockConfigManager.getProviderConfig.mockResolvedValue(undefined); // Default to no provider config found
    mockConfigManager.save.mockResolvedValue(undefined); // Default mock for save

    // Reset module cache and re-import main server file
    vi.resetModules(); 
    await import('../src/index.js');
  });

  it('should create an McpServer', () => {
    expect(MockMcpServer).toHaveBeenCalledWith(expect.objectContaining({
      name: 'project-worker',
    }));
  });

  it('should register all 18 tools and 1 prompt', () => {
    const tools = [
      'get_tasks', 'create_task', 'update_task', 'delete_task', 
      'add_comment', 'search_tasks', 'get_project_stats',
      'manage_dependencies', 'manage_sprints', 'git_tools', 'get_task_history',
      'manage_wiki', 'manage_discussions',
      'manage_releases', 'log_work', 'manage_checklists', 'custom_fields',
      'manage_connections'
    ];
    
    tools.forEach(tool => {
      expect(mockRegisterTool).toHaveBeenCalledWith(
        tool,
        expect.any(Object),
        expect.any(Function)
      );
    });
    expect(mockRegisterPrompt).toHaveBeenCalledWith(
      'ticket-generator',
      expect.any(Object),
      expect.any(Function)
    );
  });

  describe('manage_connections tool', () => {
    it('should set active provider', async () => {
      const handler = getToolHandler('manage_connections');
      await handler({ action: 'set_active', provider: 'github' });
      expect(mockConfigManager.setActiveProvider).toHaveBeenCalledWith('github');
    });

    it('should configure a provider', async () => {
      const handler = getToolHandler('manage_connections');
      const credentials = { token: '123' };
      const settings = { repo: 'test/repo' };
      await handler({ action: 'configure', provider: 'github', credentials, settings });
      expect(mockConfigManager.setProviderConfig).toHaveBeenCalledWith({
        provider: 'github',
        enabled: true,
        credentials,
        settings,
      });
    });

    it('should list configured providers and mask credentials', async () => {
      mockConfigManager.get.mockResolvedValueOnce({
        activeProvider: 'local',
        providers: [{
          provider: 'github',
          enabled: true,
          credentials: { token: 'SECRET' },
          settings: { repo: 'test/repo' }
        }]
      });
      const handler = getToolHandler('manage_connections');
      const result = await handler({ action: 'list' });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.configured[0].credentials.token).toBe('***');
    });

    it('should return error for invalid action', async () => {
      const handler = getToolHandler('manage_connections');
      const result = await handler({ action: 'invalid' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid action');
    });
  });

  describe('Task Management (Provider Agnostic)', () => {
    it('create_task should use active provider', async () => {
      // Setup ProviderFactory mock for this specific test
      vi.mocked(ProviderFactory.getProvider).mockResolvedValueOnce(mockProvider);
      const handler = getToolHandler('create_task');
      await handler({ title: 'Test Task' });
      expect(ProviderFactory.getProvider).toHaveBeenCalledWith(undefined); // Uses activeProvider
      expect(mockProvider.createTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Test Task' }));
    });

    it('get_tasks should use active provider', async () => {
      // Setup ProviderFactory mock for this specific test
      vi.mocked(ProviderFactory.getProvider).mockResolvedValueOnce(mockProvider);
      const handler = getToolHandler('get_tasks');
      await handler({});
      expect(ProviderFactory.getProvider).toHaveBeenCalledWith(undefined);
      expect(mockProvider.getTasks).toHaveBeenCalledWith({});
    });
  });

  describe('ProviderFactory', () => {
    beforeEach(() => {
      // Clear mocks for configManager for ProviderFactory specific tests
      mockConfigManager.get.mockReset().mockResolvedValue({ activeProvider: 'local', providers: [] });
      mockConfigManager.getProviderConfig.mockReset().mockResolvedValue(undefined); // Default to no config
      
      // Clear mocks for concrete providers to ensure fresh instances for each test
      vi.mocked(GitHubProvider).mockClear();
      vi.mocked(JiraProvider).mockClear();
      vi.mocked(TrelloProvider).mockClear();
      vi.mocked(AsanaProvider).mockClear();
      vi.mocked(LocalProvider).mockClear();
    });

    it('should return LocalProvider by default if no active provider is configured', async () => {
      mockConfigManager.get.mockResolvedValueOnce({ activeProvider: 'local', providers: [] });
      const { ProviderFactory } = await import('../src/services/providerFactory.js');
      const provider = await ProviderFactory.getProvider();
      expect(provider).toBeInstanceOf(LocalProvider);
      expect(vi.mocked(LocalProvider)).toHaveBeenCalledTimes(1);
    });

    it('should return GitHubProvider if "github" is requested and configured', async () => {
      mockConfigManager.getProviderConfig.mockImplementation(async (providerName: string) => {
        if (providerName === 'github') {
          return {
            provider: 'github',
            enabled: true,
            credentials: { token: 'ghp_token' },
            settings: { repo: 'test/repo' }
          };
        }
        return undefined;
      });
      const { ProviderFactory } = await import('../src/services/providerFactory.js');
      const provider = await ProviderFactory.getProvider('github');
      expect(provider).toBeInstanceOf(GitHubProvider);
      expect(vi.mocked(GitHubProvider)).toHaveBeenCalledTimes(1);
      expect(provider.name).toBe('github');
    });

    it('should return JiraProvider if "jira" is requested and configured', async () => {
      mockConfigManager.getProviderConfig.mockImplementation(async (providerName: string) => {
        if (providerName === 'jira') {
          return {
            provider: 'jira',
            enabled: true,
            credentials: { email: 'user@test.com', token: 'token' },
            settings: { domain: 'test.atlassian.net', projectKey: 'PROJ' }
          };
        }
        return undefined;
      });
      const { ProviderFactory } = await import('../src/services/providerFactory.js');
      const provider = await ProviderFactory.getProvider('jira');
      expect(provider).toBeInstanceOf(JiraProvider);
      expect(vi.mocked(JiraProvider)).toHaveBeenCalledTimes(1);
      expect(provider.name).toBe('jira');
    });

    it('should return TrelloProvider if "trello" is requested and configured', async () => {
      mockConfigManager.getProviderConfig.mockImplementation(async (providerName: string) => {
        if (providerName === 'trello') {
          return {
            provider: 'trello',
            enabled: true,
            credentials: { key: 'key', token: 'token' },
            settings: { boardId: 'board123' }
          };
        }
        return undefined;
      });
      const { ProviderFactory } = await import('../src/services/providerFactory.js');
      const provider = await ProviderFactory.getProvider('trello');
      expect(provider).toBeInstanceOf(TrelloProvider);
      expect(vi.mocked(TrelloProvider)).toHaveBeenCalledTimes(1);
      expect(provider.name).toBe('trello');
    });

    it('should return AsanaProvider if "asana" is requested and configured', async () => {
      mockConfigManager.getProviderConfig.mockImplementation(async (providerName: string) => {
        if (providerName === 'asana') {
          return {
            provider: 'asana',
            enabled: true,
            credentials: { token: 'pat' },
            settings: { projectId: 'proj123' }
          };
        }
        return undefined;
      });
      const { ProviderFactory } = await import('../src/services/providerFactory.js');
      const provider = await ProviderFactory.getProvider('asana');
      expect(provider).toBeInstanceOf(AsanaProvider);
      expect(vi.mocked(AsanaProvider)).toHaveBeenCalledTimes(1);
      expect(provider.name).toBe('asana');
    });

    it('should throw error for unknown provider', async () => {
      const { ProviderFactory } = await import('../src/services/providerFactory.js');
      await expect(ProviderFactory.getProvider('unknown' as any)).rejects.toThrow('Unknown provider: unknown');
    });

    it('should throw error if provider is requested but not configured', async () => {
      mockConfigManager.getProviderConfig.mockResolvedValueOnce(undefined); // Simulate not configured
      const { ProviderFactory } = await import('../src/services/providerFactory.js');
      await expect(ProviderFactory.getProvider('github')).rejects.toThrow('Provider "github" is not configured.');
    });
  });


  // --- Local Tools Coverage ---

  describe('Local Task Management', () => {
    beforeEach(() => {
      dbMocks.getTaskById.mockResolvedValue({
        id: 'TASK-1',
        title: 'Existing Task',
        description: '', status: 'todo', priority: 'medium', type: 'task', tags: [],
        comments: [], checklists: [], customFields: {}, blockedBy: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      });
      dbMocks.getTasks.mockResolvedValue([]);
    });

    it('create_task should add a task to local db (if active provider is local)', async () => {
      // Mock ProviderFactory.getProvider to return a LocalProvider instance for this test
      vi.mocked(ProviderFactory.getProvider).mockResolvedValueOnce(new LocalProvider());
      vi.mocked(LocalProvider.prototype.createTask).mockImplementationOnce(async (input: any) => {
        const { source, ...restInput } = input; 
        const newTask: Task = {
          id: randomUUID(), 
          status: 'todo', 
          priority: 'medium', 
          type: 'task', 
          ...restInput, 
          comments: [], checklists: [], customFields: {}, blockedBy: [],
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        dbMocks.addTask(newTask); 
        return newTask;
      });

      const handler = getToolHandler('create_task');
      await handler({ title: 'New Local Task', source: 'local' });
      
      expect(dbMocks.addTask).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New Local Task',
        type: 'task',
        status: 'todo',
        priority: 'medium',
        blockedBy: [],
        checklists: [],
        customFields: {},
        comments: expect.any(Array),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        id: expect.any(String)
      }));
      expect(vi.mocked(ProviderFactory.getProvider)).toHaveBeenCalledWith('local');
    });

    it('get_tasks should return filtered tasks from local db', async () => {
      // Mock ProviderFactory.getProvider to return a LocalProvider instance for this test
      vi.mocked(ProviderFactory.getProvider).mockResolvedValueOnce(new LocalProvider());
      vi.mocked(LocalProvider.prototype.getTasks).mockResolvedValueOnce([
          { id: '1', status: 'todo', assignee: 'Alice', title: 'Task A', description: '' } as Task,
          { id: '3', status: 'todo', assignee: 'Alice', title: 'Task C', description: '' } as Task,
      ]);

      const handler = getToolHandler('get_tasks');
      const result = await handler({ status: 'todo', assignee: 'Alice', source: 'local' });
      const content = JSON.parse(result.content[0].text);

      expect(vi.mocked(LocalProvider.prototype.getTasks)).toHaveBeenCalledWith(expect.objectContaining({
        status: 'todo',
        assignee: 'Alice'
      }));
      expect(content).toHaveLength(2);
      expect(content[0].id).toBe('1');
      expect(content[1].id).toBe('3');
      expect(vi.mocked(ProviderFactory.getProvider)).toHaveBeenCalledWith('local');
    });

    it('update_task should modify existing task and log audit', async () => {
      const initialTask = { 
        id: 'TASK-1', title: 'Old Title', status: 'todo',
        comments: [], checklists: [], customFields: {}, blockedBy: [], tags: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), priority: 'medium', type: 'task',
      };
      dbMocks.getTaskById.mockResolvedValueOnce(initialTask);
      
      const handler = getToolHandler('update_task');
      await handler({ id: 'TASK-1', title: 'New Title', status: 'done' });

      expect(dbMocks.updateTask).toHaveBeenCalledWith(expect.objectContaining({
        id: 'TASK-1',
        title: 'New Title',
        status: 'done',
      }));
      expect(dbMocks.addAuditLog).toHaveBeenCalledTimes(2); // title and status
      expect(dbMocks.addAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        taskId: 'TASK-1', field: 'title', oldValue: 'Old Title', newValue: 'New Title'
      }));
    });

    it('update_task should return error if task not found', async () => {
      dbMocks.getTaskById.mockResolvedValueOnce(undefined);
      const handler = getToolHandler('update_task');
      const result = await handler({ id: 'non-existent', title: 'New Title' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    it('delete_task should remove task', async () => {
      dbMocks.deleteTask.mockResolvedValueOnce(true);
      const handler = getToolHandler('delete_task');
      const result = await handler({ id: 'TASK-1' });
      
      expect(dbMocks.deleteTask).toHaveBeenCalledWith('TASK-1');
      expect(result.content[0].text).toContain('Successfully deleted');
    });

    it('delete_task should return error if task not found', async () => {
      dbMocks.deleteTask.mockResolvedValueOnce(false);
      const handler = getToolHandler('delete_task');
      const result = await handler({ id: 'non-existent' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });
  });

  describe('Local Collaboration & Insights', () => {
    const mockTaskWithComments = { 
      id: 'TASK-1', title: 'Task with comments', comments: [],
      description: '', status: 'todo', priority: 'medium', type: 'task', tags: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      checklists: [], customFields: {}, blockedBy: [],
    };

    it('add_comment should push comment to task', async () => {
      dbMocks.getTaskById.mockResolvedValueOnce(mockTaskWithComments);
      
      const handler = getToolHandler('add_comment');
      await handler({ taskId: 'TASK-1', content: 'LGTM', author: 'TestUser' });

      expect(dbMocks.updateTask).toHaveBeenCalled();
      expect(mockTaskWithComments.comments).toHaveLength(1);
      expect(mockTaskWithComments.comments[0].content).toBe('LGTM');
    });

    it('add_comment should return error if task not found', async () => {
      dbMocks.getTaskById.mockResolvedValueOnce(undefined);
      const handler = getToolHandler('add_comment');
      const result = await handler({ taskId: 'non-existent', content: '...' });
      expect(result.isError).toBe(true);
    });

    it('search_tasks should find matches in local db', async () => {
      dbMocks.getTasks.mockResolvedValueOnce([
        { id: '1', title: 'Fix bug', description: 'desc', tags: ['bug'], comments: [{ content: 'comment' }] } as Task,
      ]);

      const handler = getToolHandler('search_tasks');
      const result = await handler({ query: 'bug' });
      const content = JSON.parse(result.content[0].text);

      expect(content).toHaveLength(1);
      expect(content[0].title).toBe('Fix bug');
    });

    it('get_project_stats should aggregate data correctly from local db', async () => {
      dbMocks.getTasks.mockResolvedValueOnce([
        { status: 'todo', priority: 'high', assignee: 'Alice', dueDate: '2025-11-01' } as Task,
        { status: 'done', priority: 'low', assignee: 'Bob', dueDate: '2025-11-01' } as Task,
        { status: 'todo', priority: 'medium', assignee: 'Alice', dueDate: '2024-01-01' } as Task, // overdue
      ]);

      const handler = getToolHandler('get_project_stats');
      const result = await handler();
      const stats = JSON.parse(result.content[0].text);

      expect(stats.totalTasks).toBe(3);
      expect(stats.tasksByStatus.todo).toBe(2);
      expect(stats.workloadByAssignee.Alice).toBe(2);
      expect(stats.overdueTasksCount).toBe(2);
    });

    it('get_task_history should retrieve logs for task', async () => {
      const mockLogs = [{ id: 'log1', taskId: 'TASK-1', field: 'status' }] as AuditLogEntry[];
      dbMocks.getAuditLogsForTask.mockResolvedValueOnce(mockLogs);
      
      const handler = getToolHandler('get_task_history');
      const result = await handler({ taskId: 'TASK-1' });
      const logs = JSON.parse(result.content[0].text);

      expect(dbMocks.getAuditLogsForTask).toHaveBeenCalledWith('TASK-1');
      expect(logs).toHaveLength(1);
    });

    it('get_task_history should return empty if no logs found', async () => {
      dbMocks.getAuditLogsForTask.mockResolvedValueOnce([]);
      const handler = getToolHandler('get_task_history');
      const result = await handler({ taskId: 'TASK-NONE' });
      expect(result.content[0].text).toContain('No history found');
    });
  });

  describe('Local Advanced Features', () => {
    const mockTask = { 
      id: 'TASK-1', title: 'Task 1', blockedBy: [],
      description: '', status: 'todo', priority: 'medium', type: 'task', tags: [],
      comments: [], checklists: [], customFields: {},
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    it('manage_dependencies should add blocker', async () => {
      const blockerTask = { id: 'BLOCKER-1', title: 'Blocker Task' } as Task;
      dbMocks.getTaskById.mockImplementation((id: string) => {
        if (id === 'TASK-1') return Promise.resolve(mockTask);
        if (id === 'BLOCKER-1') return Promise.resolve(blockerTask);
        return Promise.resolve(undefined);
      });

      const handler = getToolHandler('manage_dependencies');
      await handler({ taskId: 'TASK-1', blockerId: 'BLOCKER-1', action: 'add' });

      expect(dbMocks.updateTask).toHaveBeenCalled();
      expect(mockTask.blockedBy).toContain('BLOCKER-1');
      expect(dbMocks.addAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        field: 'blockedBy', oldValue: [], newValue: ['BLOCKER-1']
      }));
    });

    it('manage_dependencies should remove blocker', async () => {
      const taskWithBlocker = { ...mockTask, blockedBy: ['BLOCKER-1'] };
      const blockerTask = { id: 'BLOCKER-1', title: 'Blocker Task' } as Task;

      dbMocks.getTaskById.mockImplementation((id: string) => {
        if (id === 'TASK-1') return Promise.resolve(taskWithBlocker);
        if (id === 'BLOCKER-1') return Promise.resolve(blockerTask);
        return Promise.resolve(undefined);
      });

      const handler = getToolHandler('manage_dependencies');
      await handler({ taskId: 'TASK-1', blockerId: 'BLOCKER-1', action: 'remove' });

      expect(dbMocks.updateTask).toHaveBeenCalled();
      expect(taskWithBlocker.blockedBy).not.toContain('BLOCKER-1');
      expect(dbMocks.addAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        field: 'blockedBy', oldValue: ['BLOCKER-1'], newValue: []
      }));
    });

    it('manage_dependencies should return error if task not found', async () => {
      dbMocks.getTaskById.mockResolvedValueOnce(undefined);
      const handler = getToolHandler('manage_dependencies');
      const result = await handler({ taskId: 'non-existent', blockerId: 'any', action: 'add' });
      expect(result.isError).toBe(true);
    });

    it('manage_dependencies should return error if blocker not found', async () => {
      dbMocks.getTaskById.mockResolvedValueOnce(mockTask).mockResolvedValueOnce(undefined);
      const handler = getToolHandler('manage_dependencies');
      await handler({ taskId: 'TASK-1', blockerId: 'non-existent', action: 'add' });
      expect(result.isError).toBe(true);
    });

    it('manage_sprints should create a sprint', async () => {
      const handler = getToolHandler('manage_sprints');
      await handler({ action: 'create', name: 'Sprint 1', startDate: '2024-01-01', endDate: '2024-01-14' });

      expect(dbMocks.addSprint).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Sprint 1',
        status: 'planned'
      }));
    });

    it('manage_sprints should list sprints', async () => {
      dbMocks.getSprints.mockResolvedValueOnce([
        { id: 's1', name: 'Sprint 1', startDate: '', endDate: '', status: 'planned' }
      ]);
      const handler = getToolHandler('manage_sprints');
      const result = await handler({ action: 'list' });
      const sprints = JSON.parse(result.content[0].text);
      expect(sprints).toHaveLength(1);
      expect(sprints[0].name).toBe('Sprint 1');
    });

    it('manage_sprints should return error for invalid action', async () => {
      const handler = getToolHandler('manage_sprints');
      const result = await handler({ action: 'invalid' });
      expect(result.isError).toBe(true);
    });

    it('git_tools should create a branch', async () => {
      dbMocks.getTaskById.mockResolvedValueOnce({ id: 'TASK-123', title: 'Fix Login Bug' } as Task);
      mockExec.mockImplementationOnce((cmd, cb) => cb(null, { stdout: '', stderr: '' })); // Mock successful exec

      const handler = getToolHandler('git_tools');
      await handler({ action: 'create_branch', taskId: 'TASK-123' });

      expect(mockExec).toHaveBeenCalledWith('git checkout -b feature/TASK-123-fix-login-bug', expect.any(Function));
      expect(dbMocks.updateTask).toHaveBeenCalled(); // Should update task with gitBranch
      expect(dbMocks.addAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        field: 'gitBranch', newValue: 'feature/TASK-123-fix-login-bug'
      }));
    });

    it('git_tools should generate commit message', async () => {
      dbMocks.getTaskById.mockResolvedValueOnce({ id: 'TASK-123', title: 'Fix Login Bug' } as Task);
      const handler = getToolHandler('git_tools');
      const result = await handler({ action: 'get_commit_msg', taskId: 'TASK-123' });
      expect(result.content[0].text).toBe('fix: Fix Login Bug (TASK-123)');
    });

    it('git_tools should return error if task not found', async () => {
      dbMocks.getTaskById.mockResolvedValueOnce(undefined);
      const handler = getToolHandler('git_tools');
      const result = await handler({ action: 'create_branch', taskId: 'non-existent' });
      expect(result.isError).toBe(true);
    });
    
    it('git_tools should return error for invalid action', async () => {
      const handler = getToolHandler('git_tools');
      const result = await handler({ action: 'invalid', taskId: 'TASK-1' });
      expect(result.isError).toBe(true);
    });

    it('get_task_history should retrieve logs for task', async () => {
      const mockLogs = [{ id: 'log1', taskId: 'TASK-1', field: 'status' }] as AuditLogEntry[];
      dbMocks.getAuditLogsForTask.mockResolvedValueOnce(mockLogs);
      
      const handler = getToolHandler('get_task_history');
      const result = await handler({ taskId: 'TASK-1' });
      const logs = JSON.parse(result.content[0].text);

      expect(dbMocks.getAuditLogsForTask).toHaveBeenCalledWith('TASK-1');
      expect(logs).toHaveLength(1);
    });

    it('get_task_history should return empty if no logs found', async () => {
      dbMocks.getAuditLogsForTask.mockResolvedValueOnce([]);
      const handler = getToolHandler('get_task_history');
      const result = await handler({ taskId: 'TASK-NONE' });
      expect(result.content[0].text).toContain('No history found');
    });
  });

  describe('Local Knowledge & Communication', () => {
    it('manage_wiki should create page', async () => {
      dbMocks.getWikiPageBySlug.mockResolvedValueOnce(undefined);
      const handler = getToolHandler('manage_wiki');
      await handler({ action: 'create', slug: 'docs', title: 'Docs', content: '...' });
      expect(dbMocks.saveWikiPage).toHaveBeenCalledWith(expect.objectContaining({ slug: 'docs' }));
    });

    it('manage_wiki should read page', async () => {
      const mockPage = { slug: 'docs', title: 'Docs', content: 'C' } as WikiPage;
      dbMocks.getWikiPageBySlug.mockResolvedValueOnce(mockPage);
      const handler = getToolHandler('manage_wiki');
      const result = await handler({ action: 'read', slug: 'docs' });
      const page = JSON.parse(result.content[0].text);
      expect(page.content).toBe('C');
    });

    it('manage_wiki should update page', async () => {
      const mockPage = { slug: 'docs', title: 'Docs', content: 'Old' } as WikiPage;
      dbMocks.getWikiPageBySlug.mockResolvedValueOnce(mockPage);
      const handler = getToolHandler('manage_wiki');
      await handler({ action: 'update', slug: 'docs', content: 'New' });
      expect(dbMocks.saveWikiPage).toHaveBeenCalledWith(expect.objectContaining({ content: 'New' }));
    });

    it('manage_wiki should list pages', async () => {
      dbMocks.getWikiPages.mockResolvedValueOnce([{ slug: 'a', title: 'A' }] as WikiPage[]);
      const handler = getToolHandler('manage_wiki');
      const result = await handler({ action: 'list' });
      const pages = JSON.parse(result.content[0].text);
      expect(pages).toHaveLength(1);
    });

    it('manage_wiki should return error for invalid action', async () => {
      const handler = getToolHandler('manage_wiki');
      const result = await handler({ action: 'invalid' });
      expect(result.isError).toBe(true);
    });


    const mockDiscussion = { 
      id: 'DISC-1', title: 'Discuss', status: 'open', messages: [], tags: [], 
      createdAt: '', updatedAt: ''
    } as Discussion;

    it('manage_discussions should start thread', async () => {
      const handler = getToolHandler('manage_discussions');
      await handler({ action: 'start', title: 'Topic', content: 'Body' });
      expect(dbMocks.saveDiscussion).toHaveBeenCalledWith(expect.objectContaining({ title: 'Topic' }));
    });

    it('manage_discussions should read thread', async () => {
      dbMocks.getDiscussionById.mockResolvedValueOnce(mockDiscussion);
      const handler = getToolHandler('manage_discussions');
      const result = await handler({ action: 'read', discussionId: 'DISC-1' });
      const disc = JSON.parse(result.content[0].text);
      expect(disc.id).toBe('DISC-1');
    });

    it('manage_discussions should reply to thread', async () => {
      const discussionCopy = { ...mockDiscussion }; // Create a copy
      dbMocks.getDiscussionById.mockResolvedValueOnce(discussionCopy);
      const handler = getToolHandler('manage_discussions');
      await handler({ action: 'reply', discussionId: 'DISC-1', content: 'Response' });
      expect(dbMocks.saveDiscussion).toHaveBeenCalled();
      expect(discussionCopy.messages).toHaveLength(1);
    });

    it('manage_discussions should resolve thread', async () => {
      const discussionCopy = { ...mockDiscussion }; // Create a copy
      dbMocks.getDiscussionById.mockResolvedValueOnce(discussionCopy);
      const handler = getToolHandler('manage_discussions');
      await handler({ action: 'resolve', discussionId: 'DISC-1' });
      expect(dbMocks.saveDiscussion).toHaveBeenCalled();
      expect(discussionCopy.status).toBe('resolved');
    });

    it('manage_discussions should list discussions', async () => {
      dbMocks.getDiscussions.mockResolvedValueOnce([mockDiscussion]);
      const handler = getToolHandler('manage_discussions');
      const result = await handler({ action: 'list' });
      const discussions = JSON.parse(result.content[0].text);
      expect(discussions).toHaveLength(1);
    });

    it('manage_discussions should return error for invalid action', async () => {
      const handler = getToolHandler('manage_discussions');
      const result = await handler({ action: 'invalid' });
      expect(result.isError).toBe(true);
    });
  });

  describe('Local Enterprise Features', () => {
    it('manage_releases should create a release', async () => {
      const handler = getToolHandler('manage_releases');
      await handler({ action: 'create', name: 'v1.0', status: 'planned' });
      expect(dbMocks.addRelease).toHaveBeenCalledWith(expect.objectContaining({ name: 'v1.0' }));
    });

    it('manage_releases should list releases', async () => {
      dbMocks.getReleases.mockResolvedValueOnce([{ id: 'r1', name: 'v1.0', status: 'planned' } as Release]);
      const handler = getToolHandler('manage_releases');
      const result = await handler({ action: 'list' });
      const releases = JSON.parse(result.content[0].text);
      expect(releases).toHaveLength(1);
    });

    it('manage_releases should return error for invalid action', async () => {
      const handler = getToolHandler('manage_releases');
      const result = await handler({ action: 'invalid' });
      expect(result.isError).toBe(true);
    });

    it('log_work should update actualHours', async () => {
      const task = { id: 'TASK-1', actualHours: 2, estimatedHours: 10 } as Task;
      dbMocks.getTaskById.mockResolvedValueOnce(task);
      const handler = getToolHandler('log_work');
      await handler({ taskId: 'TASK-1', timeSpent: 3 });
      expect(task.actualHours).toBe(5);
      expect(dbMocks.updateTask).toHaveBeenCalled();
      expect(dbMocks.addAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        field: 'actualHours', oldValue: 2, newValue: 5
      }));
    });

    it('log_work should update estimatedHours', async () => {
      const task = { id: 'TASK-1', actualHours: 2, estimatedHours: 10 } as Task;
      dbMocks.getTaskById.mockResolvedValueOnce(task);
      const handler = getToolHandler('log_work');
      await handler({ taskId: 'TASK-1', estimate: 12 });
      expect(task.estimatedHours).toBe(12);
      expect(dbMocks.updateTask).toHaveBeenCalled();
      expect(dbMocks.addAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        field: 'estimatedHours', oldValue: 10, newValue: 12
      }));
    });

    it('log_work should return error if task not found', async () => {
      dbMocks.getTaskById.mockResolvedValueOnce(undefined);
      const handler = getToolHandler('log_work');
      const result = await handler({ taskId: 'non-existent', timeSpent: 1 });
      expect(result.isError).toBe(true);
    });

    it('manage_checklists should add a list and item', async () => {
      const task = { id: 'TASK-1', checklists: [] } as Task;
      dbMocks.getTaskById.mockResolvedValueOnce(task);
      const handler = getToolHandler('manage_checklists');
      await handler({ action: 'add_list', taskId: 'TASK-1', title: 'QA List' });
      expect(dbMocks.updateTask).toHaveBeenCalledTimes(1);
      expect(task.checklists).toHaveLength(1);
      expect(task.checklists[0].title).toBe('QA List');

      dbMocks.getTaskById.mockResolvedValueOnce(task); // Re-mock for item
      await handler({ action: 'add_item', taskId: 'TASK-1', checklistId: task.checklists[0].id, content: 'Check this' });
      expect(dbMocks.updateTask).toHaveBeenCalledTimes(2);
      expect(task.checklists[0].items).toHaveLength(1);
      expect(task.checklists[0].items[0].text).toBe('Check this');
    });
    
    it('manage_checklists should toggle item completion', async () => {
      const taskId = 'TASK-1';
      const checklistId = randomUUID();
      const itemId = randomUUID();
      const task = { 
        id: taskId, 
        checklists: [{ id: checklistId, title: 'Test', items: [{ id: itemId, text: 'Test Item', completed: false }] }] 
      } as Task;
      dbMocks.getTaskById.mockResolvedValueOnce(task);

      const handler = getToolHandler('manage_checklists');
      await handler({ action: 'toggle_item', taskId, checklistId, itemId });

      expect(dbMocks.updateTask).toHaveBeenCalled();
      expect(task.checklists[0].items[0].completed).toBe(true);
    });

    it('manage_checklists should remove item', async () => {
      const taskId = 'TASK-1';
      const checklistId = randomUUID();
      const itemId = randomUUID();
      const task = { 
        id: taskId, 
        checklists: [{ id: checklistId, title: 'Test', items: [{ id: itemId, text: 'Test Item', completed: false }] }] 
      } as Task;
      dbMocks.getTaskById.mockResolvedValueOnce(task);

      const handler = getToolHandler('manage_checklists');
      await handler({ action: 'remove_item', taskId, checklistId, itemId });

      expect(dbMocks.updateTask).toHaveBeenCalled();
      expect(task.checklists[0].items).toHaveLength(0);
    });

    it('manage_checklists should return error if task not found', async () => {
      dbMocks.getTaskById.mockResolvedValueOnce(undefined);
      const handler = getToolHandler('manage_checklists');
      const result = await handler({ action: 'add_list', taskId: 'non-existent', title: '...' });
      expect(result.isError).toBe(true);
    });

    it('manage_checklists should return error if no checklist found for item action', async () => {
      const task = { id: 'TASK-1', checklists: [] } as Task;
      dbMocks.getTaskById.mockResolvedValueOnce(task);
      const handler = getToolHandler('manage_checklists');
      const result = await handler({ action: 'add_item', taskId: 'TASK-1', content: '...' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No checklist found');
    });

    it('manage_checklists should return error for invalid action', async () => {
      const handler = getToolHandler('manage_checklists');
      const result = await handler({ action: 'invalid' });
      expect(result.isError).toBe(true);
    });


    it('custom_fields should set metadata', async () => {
      const task = { id: 'TASK-1', customFields: {} } as Task;
      dbMocks.getTaskById.mockResolvedValueOnce(task);
      
      const handler = getToolHandler('custom_fields');
      await handler({ taskId: 'TASK-1', key: 'deployed', value: true });
      
      expect(task.customFields['deployed']).toBe(true);
      expect(dbMocks.updateTask).toHaveBeenCalled();
    });

    it('custom_fields should delete metadata', async () => {
      const task = { id: 'TASK-1', customFields: { priority: 'P1' } } as Task;
      dbMocks.getTaskById.mockResolvedValueOnce(task);
      
      const handler = getToolHandler('custom_fields');
      await handler({ taskId: 'TASK-1', key: 'priority' }); // Omit value to delete
      
      expect(task.customFields['priority']).toBeUndefined();
      expect(dbMocks.updateTask).toHaveBeenCalled();
    });

    it('custom_fields should return error if task not found', async () => {
      dbMocks.getTaskById.mockResolvedValueOnce(undefined);
      const handler = getToolHandler('custom_fields');
      const result = await handler({ taskId: 'non-existent', key: 'k', value: 'v' });
      expect(result.isError).toBe(true);
    });
  });

  describe('ConfigManager', () => {
    beforeEach(() => {
      // Reset fs mocks before each test
      fsMocks.access.mockClear().mockRejectedValue(new Error('File not found')); // Default to file not existing
      fsMocks.mkdir.mockClear().mockResolvedValue(undefined);
      fsMocks.readFile.mockClear();
      fsMocks.writeFile.mockClear();
    });

    it('should create default config if not found', async () => {
      const { configManager } = await import('../src/config.js');
      const config = await configManager.get();
      expect(fsMocks.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
      expect(fsMocks.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify({ activeProvider: 'local', providers: [] }, null, 2),
        'utf-8'
      );
      expect(config.activeProvider).toBe('local');
    });

    it('should load existing config', async () => {
      fsMocks.access.mockResolvedValue(undefined); // File exists
      fsMocks.readFile.mockResolvedValueOnce(JSON.stringify({ activeProvider: 'github', providers: [] }));
      
      const { configManager } = await import('../src/config.js');
      const config = await configManager.get();
      expect(config.activeProvider).toBe('github');
    });

    it('should handle corrupted config file by returning default', async () => {
      fsMocks.access.mockResolvedValue(undefined);
      fsMocks.readFile.mockResolvedValueOnce('invalid json'); // Corrupted
      
      const { configManager } = await import('../src/config.js');
      const config = await configManager.get();
      expect(config.activeProvider).toBe('local'); // Should fall back to default
      expect(fsMocks.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify({ activeProvider: 'local', providers: [] }, null, 2),
        'utf-8'
      );
    });

    it('should save config correctly', async () => {
      const { configManager } = await import('../src/config.js');
      const newConfig = { activeProvider: 'jira', providers: [] };
      await configManager.save(newConfig);
      expect(fsMocks.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(newConfig, null, 2),
        'utf-8'
      );
    });

    it('should set provider config', async () => {
      fsMocks.access.mockResolvedValue(undefined);
      fsMocks.readFile.mockResolvedValueOnce(JSON.stringify({ activeProvider: 'local', providers: [] }));

      const { configManager } = await import('../src/config.js');
      await configManager.setProviderConfig({ provider: 'github', enabled: true, credentials: { token: 'abc' } });
      expect(fsMocks.writeFile).toHaveBeenCalled();
      const savedConfig = JSON.parse(fsMocks.writeFile.mock.calls[0][1]);
      expect(savedConfig.providers[0].provider).toBe('github');
    });

    it('should set active provider', async () => {
      fsMocks.access.mockResolvedValue(undefined);
      fsMocks.readFile.mockResolvedValueOnce(JSON.stringify({ activeProvider: 'local', providers: [] }));

      const { configManager } = await import('../src/config.js');
      await configManager.setActiveProvider('github');
      expect(fsMocks.writeFile).toHaveBeenCalled();
      const savedConfig = JSON.parse(fsMocks.writeFile.mock.calls[0][1]);
      expect(savedConfig.activeProvider).toBe('github');
    });
  });

  describe('Ticket Generator Prompt', () => {
    it('should generate correct messages', () => {
      const handler = getPromptHandler('ticket-generator');
      const result = handler({ type: 'bug', context: 'Login fails' });
      
      expect(result.messages[0].content.text).toContain('Login fails');
      expect(result.messages[0].content.text).toContain('bug');
    });
  });
});