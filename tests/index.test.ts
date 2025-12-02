import { describe, it, expect, vi, beforeEach } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { McpServer, McpServerTool } from '@modelcontextprotocol/sdk/server/mcp.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type {
  WikiPage,
  Task,
  Sprint,
  AuditLogEntry,
  Discussion,
  Release,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Comment,
} from '../src/types.js';

// --- Hoisted Mocks Section ---

// Use vi.hoisted to ensure these are available during module mocking
const {
  fsMocks,
  MockMcpServer,
  mockRegisterTool,
  mockRegisterPrompt,
  dbMocks,
  mockConfigManager,
  mockExec,
  mockLocalProviderInstanceMethods,
  mockGitHubProviderInstanceMethods,
  mockJiraProviderInstanceMethods,
  mockTrelloProviderInstanceMethods,
  mockAsanaProviderInstanceMethods,
  mockAzureProviderInstanceMethods,
  mockMondayProviderInstanceMethods,
} = vi.hoisted(() => {
  const mockRegisterTool = vi.fn<[string, unknown, (...args: unknown[]) => unknown], unknown>();
  const mockRegisterPrompt = vi.fn<[string, unknown, (...args: unknown[]) => unknown], unknown>();
  const mockConnect = vi.fn();

  const mockLocalProviderInstanceMethods = {
    getTasks: vi.fn<[TaskFilter?], Promise<Task[]>>(),
    createTask: vi.fn<[CreateTaskInput], Promise<Task>>(),
    getTaskById: vi.fn<[string], Promise<Task | undefined>>(),
    updateTask: vi.fn<[UpdateTaskInput], Promise<Task>>(),
    deleteTask: vi.fn<[string], Promise<boolean>>(),
    addComment: vi.fn<[string, string], Promise<Task>>(),
  };

  return {
    fsMocks: {
      access: vi.fn(),
      mkdir: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
    },
    mockRegisterTool,
    mockRegisterPrompt,
    mockConnect,
    MockMcpServer: vi.fn<[unknown], unknown>().mockImplementation(function (this: unknown) {
      Object.assign(this, {
        registerTool: mockRegisterTool,
        registerPrompt: mockRegisterPrompt,
        connect: mockConnect,
      });
    }),
    dbMocks: {
      getTasks: vi.fn<[], Promise<Task[]>>(),
      addTask: vi.fn<[Task], Promise<void>>(),
      getTaskById: vi.fn<[string], Promise<Task | undefined>>(),
      updateTask: vi.fn<[Task], Promise<void>>(),
      deleteTask: vi.fn<[string], Promise<boolean>>(),
      getSprints: vi.fn<[], Promise<Sprint[]>>(),
      addSprint: vi.fn<[Sprint], Promise<void>>(),
      addAuditLog: vi.fn<[AuditLogEntry], Promise<void>>(),
      getAuditLogsForTask: vi.fn<[string], Promise<AuditLogEntry[]>>(),
      getWikiPages: vi.fn<[], Promise<WikiPage[]>>(),
      getWikiPageBySlug: vi.fn<[string], Promise<WikiPage | undefined>>(),
      saveWikiPage: vi.fn<[WikiPage], Promise<void>>(),
      getDiscussions: vi.fn<[], Promise<Discussion[]>>(),
      getDiscussionById: vi.fn<[string], Promise<Discussion | undefined>>(),
      saveDiscussion: vi.fn<[Discussion], Promise<void>>(),
      getReleases: vi.fn<[], Promise<Release[]>>(),
      addRelease: vi.fn<[Release], Promise<void>>(),
    },
    mockConfigManager: {
      get: vi.fn<[], Promise<unknown>>(),
      setProviderConfig: vi.fn<[unknown], Promise<void>>(),
      setActiveProvider: vi.fn<[unknown], Promise<void>>(),
      getProviderConfig: vi.fn<[string], Promise<unknown>>(),
      save: vi.fn<[unknown], Promise<void>>(),
    },
    mockExec: vi.fn(
      (_cmd: string, cb: (error: Error | null, stdout: string, stderr: string) => void) => {
        cb(null, 'mock stdout', '');
      },
    ),
    mockLocalProviderInstanceMethods,
    mockGitHubProviderInstanceMethods: { ...mockLocalProviderInstanceMethods },
    mockJiraProviderInstanceMethods: { ...mockLocalProviderInstanceMethods },
    mockTrelloProviderInstanceMethods: { ...mockLocalProviderInstanceMethods },
    mockAsanaProviderInstanceMethods: { ...mockLocalProviderInstanceMethods },
    mockAzureProviderInstanceMethods: { ...mockLocalProviderInstanceMethods },
    mockMondayProviderInstanceMethods: { ...mockLocalProviderInstanceMethods },
  };
});

// --- Global Mocks for external dependencies ---

vi.mock('fs/promises', () => ({
  default: fsMocks,
}));

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: MockMcpServer,
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn<[], unknown>(),
}));

vi.mock('child_process', () => ({
  exec: mockExec,
}));

vi.mock('../src/db.js', () => ({
  db: dbMocks,
}));

vi.mock('../src/config.js', () => ({
  configManager: mockConfigManager,
}));

// Mock concrete provider classes globally
import { LocalProvider } from '../src/providers/LocalProvider.js';
import { GitHubProvider } from '../src/providers/GitHubProvider.js';
import { JiraProvider } from '../src/providers/JiraProvider.js';
import { TrelloProvider } from '../src/providers/TrelloProvider.js';
import { AsanaProvider } from '../src/providers/AsanaProvider.js';
import { AzureDevOpsProvider } from '../src/providers/AzureDevOpsProvider.js';
import { MondayProvider } from '../src/providers/MondayProvider.js';

vi.mock('../src/providers/LocalProvider.js', () => ({
  LocalProvider: vi.fn<[unknown], LocalProvider>().mockImplementation(function (
    this: LocalProvider,
  ) {
    this.name = 'local';
    Object.assign(this, mockLocalProviderInstanceMethods);
  }),
}));

vi.mock('../src/providers/GitHubProvider.js', () => ({
  GitHubProvider: vi.fn<[unknown], GitHubProvider>().mockImplementation(function (
    this: GitHubProvider,
  ) {
    this.name = 'github';
    Object.assign(this, mockGitHubProviderInstanceMethods);
  }),
}));

vi.mock('../src/providers/JiraProvider.js', () => ({
  JiraProvider: vi.fn<[unknown], JiraProvider>().mockImplementation(function (this: JiraProvider) {
    this.name = 'jira';
    Object.assign(this, mockJiraProviderInstanceMethods);
  }),
}));

vi.mock('../src/providers/TrelloProvider.js', () => ({
  TrelloProvider: vi.fn<[unknown], TrelloProvider>().mockImplementation(function (
    this: TrelloProvider,
  ) {
    this.name = 'trello';
    Object.assign(this, mockTrelloProviderInstanceMethods);
  }),
}));

vi.mock('../src/providers/AsanaProvider.js', () => ({
  AsanaProvider: vi.fn<[unknown], AsanaProvider>().mockImplementation(function (
    this: AsanaProvider,
  ) {
    this.name = 'asana';
    Object.assign(this, mockAsanaProviderInstanceMethods);
  }),
}));

vi.mock('../src/providers/AzureDevOpsProvider.js', () => ({
  AzureDevOpsProvider: vi.fn<[unknown], AzureDevOpsProvider>().mockImplementation(function (
    this: AzureDevOpsProvider,
  ) {
    this.name = 'azure-devops';
    Object.assign(this, mockAzureProviderInstanceMethods);
  }),
}));

vi.mock('../src/providers/MondayProvider.js', () => ({
  MondayProvider: vi.fn<[unknown], MondayProvider>().mockImplementation(function (
    this: MondayProvider,
  ) {
    this.name = 'monday';
    Object.assign(this, mockMondayProviderInstanceMethods);
  }),
}));

// Import ProviderFactory AFTER all concrete providers are mocked
// import { ProviderFactory } from '../src/services/providerFactory.js';
import { AuditService } from '../src/services/auditService.js'; // Import AuditService for testing

// Helper to get tool handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getToolHandler(toolName: string) {
  const call = mockRegisterTool.mock.calls.find((c) => c[0] === toolName);
  if (!call) throw new Error(`Tool ${toolName} not registered`);
  return call[2];
}

// Helper to get prompt handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getPromptHandler(promptName: string) {
  const call = mockRegisterPrompt.mock.calls.find((c) => c[0] === promptName);
  if (!call) throw new Error(`Prompt ${promptName} not registered`);
  return call[2];
}

describe('Project Worker Server - Local Tools Coverage', () => {
  beforeEach(async () => {
    // Clear all hoisted mocks
    vi.clearAllMocks();

    // Reset specific mock implementations or return values if needed
    Object.values(dbMocks).forEach((mockFn: vi.Mock) => mockFn.mockReset());
    Object.values(mockConfigManager).forEach((mockFn: vi.Mock) => mockFn.mockReset());

    // Reset Provider Instance Mocks
    Object.values(mockLocalProviderInstanceMethods).forEach((fn: vi.Mock) => fn.mockReset());
    Object.values(mockGitHubProviderInstanceMethods).forEach((fn: vi.Mock) => fn.mockReset());
    Object.values(mockJiraProviderInstanceMethods).forEach((fn: vi.Mock) => fn.mockReset());
    Object.values(mockTrelloProviderInstanceMethods).forEach((fn: vi.Mock) => fn.mockReset());
    Object.values(mockAsanaProviderInstanceMethods).forEach((fn: vi.Mock) => fn.mockReset());
    Object.values(mockAzureProviderInstanceMethods).forEach((fn: vi.Mock) => fn.mockReset());
    Object.values(mockMondayProviderInstanceMethods).forEach((fn: vi.Mock) => fn.mockReset());

    vi.mocked(LocalProvider).mockClear();
    vi.mocked(GitHubProvider).mockClear();
    vi.mocked(JiraProvider).mockClear();
    vi.mocked(TrelloProvider).mockClear();
    vi.mocked(AsanaProvider).mockClear();
    vi.mocked(AzureDevOpsProvider).mockClear();
    vi.mocked(MondayProvider).mockClear();

    mockConfigManager.get.mockResolvedValue({ activeProvider: 'local', providers: [] });
    mockConfigManager.getProviderConfig.mockResolvedValue(undefined);
    mockConfigManager.save.mockResolvedValue(undefined);

    // Reset module cache and re-import main server file
    vi.resetModules();
    await import('../src/index.js');
  });

  it('should create an McpServer', () => {
    expect(MockMcpServer).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'project-worker',
      }),
    );
  });

  // ... (Existing tests) ...

  describe('Local Knowledge & Communication (Improved Coverage)', () => {
    it('manage_wiki should list pages', async () => {
      dbMocks.getWikiPages.mockResolvedValueOnce([{ slug: 'a', title: 'A' }] as WikiPage[]);
      const handler = getToolHandler('manage_wiki');
      const result = await handler({ action: 'list' });
      const pages = JSON.parse(result.content[0].text);
      expect(pages).toHaveLength(1);
    });

    it('manage_wiki should fail read/create/update if slug missing', async () => {
      const handler = getToolHandler('manage_wiki');
      const result = await handler({ action: 'read' }); // No slug
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Slug is required');
    });

    it('manage_wiki should fail create if page exists', async () => {
      dbMocks.getWikiPageBySlug.mockResolvedValueOnce({} as WikiPage);
      const handler = getToolHandler('manage_wiki');
      const result = await handler({ action: 'create', slug: 'exists' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('already exists');
    });

    it('manage_wiki should fail create if title/content missing', async () => {
      dbMocks.getWikiPageBySlug.mockResolvedValueOnce(undefined);
      const handler = getToolHandler('manage_wiki');
      const result = await handler({ action: 'create', slug: 'new' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Title and content required');
    });

    it('manage_wiki should create successfully', async () => {
      dbMocks.getWikiPageBySlug.mockResolvedValueOnce(undefined);
      const handler = getToolHandler('manage_wiki');
      const result = await handler({
        action: 'create',
        slug: 'new',
        title: 'T',
        content: 'C',
        tags: ['tag'],
      });
      expect(dbMocks.saveWikiPage).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'new', tags: ['tag'] }),
      );
      expect(result.content[0].text).toContain('Created page');
    });

    it('manage_wiki should fail update if page not found', async () => {
      dbMocks.getWikiPageBySlug.mockResolvedValueOnce(undefined);
      const handler = getToolHandler('manage_wiki');
      const result = await handler({ action: 'update', slug: 'missing' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    it('manage_wiki should update successfully', async () => {
      const mockPage = {
        slug: 'slug',
        title: 'Old',
        content: 'Old',
        tags: [],
        lastUpdated: '',
      } as WikiPage;
      dbMocks.getWikiPageBySlug.mockResolvedValueOnce(mockPage);
      const handler = getToolHandler('manage_wiki');
      await handler({ action: 'update', slug: 'slug', title: 'New' });
      expect(mockPage.title).toBe('New');
      expect(dbMocks.saveWikiPage).toHaveBeenCalledWith(mockPage);
    });
  });

  describe('AuditService (Coverage)', () => {
    it('should log change if values differ', async () => {
      await AuditService.logChange('TASK-1', 'status', 'todo', 'done');
      expect(dbMocks.addAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'TASK-1',
          field: 'status',
          oldValue: 'todo',
          newValue: 'done',
        }),
      );
    });

    it('should NOT log change if values are identical', async () => {
      await AuditService.logChange('TASK-1', 'status', 'todo', 'todo');
      expect(dbMocks.addAuditLog).not.toHaveBeenCalled();
    });
  });
});
