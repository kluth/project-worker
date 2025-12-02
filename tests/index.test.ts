import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  type Mock,
} from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Task, Sprint, AuditLogEntry, WikiPage, Discussion, Release } from '../src/types.js';
import { randomUUID } from 'crypto';

// --- Hoisted Mocks Section ---

const { 
  fsMocks,
  MockMcpServer,
  mockRegisterTool,
  mockRegisterPrompt,
  mockConnect,
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
  mockProvider
} = vi.hoisted(() => {
  const fsMocks = {
    access: vi.fn(),
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  };

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

  const mockConfigManager = {
    get: vi.fn(),
    setProviderConfig: vi.fn(),
    setActiveProvider: vi.fn(),
    getProviderConfig: vi.fn(),
    save: vi.fn(),
  };

  const mockExec = vi.fn();

  // Provider Instance Method Mocks - explicitly defined to be accessible in mock factories
  const mockLocalProviderInstanceMethods = {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    getTaskById: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  };
  const mockGitHubProviderInstanceMethods = { ...mockLocalProviderInstanceMethods };
  const mockJiraProviderInstanceMethods = { ...mockLocalProviderInstanceMethods };
  const mockTrelloProviderInstanceMethods = { ...mockLocalProviderInstanceMethods };
  const mockAsanaProviderInstanceMethods = { ...mockLocalProviderInstanceMethods };
  const mockAzureProviderInstanceMethods = { ...mockLocalProviderInstanceMethods };
  const mockMondayProviderInstanceMethods = { ...mockLocalProviderInstanceMethods };

  const mockProvider = { ...mockLocalProviderInstanceMethods };

  return { 
    fsMocks,
    MockMcpServer,
    mockRegisterTool,
    mockRegisterPrompt,
    mockConnect,
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
    mockProvider
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

// Mock concrete provider classes globally
import { LocalProvider } from '../src/providers/LocalProvider.js';
import { GitHubProvider } from '../src/providers/GitHubProvider.js'; 
import { JiraProvider } from '../src/providers/JiraProvider.js';     
import { TrelloProvider } from '../src/providers/TrelloProvider.js';   
import { AsanaProvider } from '../src/providers/AsanaProvider.js';   
import { AzureDevOpsProvider } from '../src/providers/AzureDevOpsProvider.js';
import { MondayProvider } from '../src/providers/MondayProvider.js';

vi.mock('../src/providers/LocalProvider.js', () => ({
  LocalProvider: vi.fn(function(this: any) { 
    this.name = 'local'; 
    Object.assign(this, mockLocalProviderInstanceMethods);
  }),
}));

vi.mock('../src/providers/GitHubProvider.js', () => ({
  GitHubProvider: vi.fn(function(this: any) { 
    this.name = 'github'; 
    Object.assign(this, mockGitHubProviderInstanceMethods);
  }),
}));

vi.mock('../src/providers/JiraProvider.js', () => ({
  JiraProvider: vi.fn(function(this: any) { 
    this.name = 'jira'; 
    Object.assign(this, mockJiraProviderInstanceMethods);
  }),
}));

vi.mock('../src/providers/TrelloProvider.js', () => ({
  TrelloProvider: vi.fn(function(this: any) { 
    this.name = 'trello'; 
    Object.assign(this, mockTrelloProviderInstanceMethods);
  }),
}));

vi.mock('../src/providers/AsanaProvider.js', () => ({
  AsanaProvider: vi.fn(function(this: any) { 
    this.name = 'asana'; 
    Object.assign(this, mockAsanaProviderInstanceMethods);
  }),
}));

vi.mock('../src/providers/AzureDevOpsProvider.js', () => ({
  AzureDevOpsProvider: vi.fn(function(this: any) { 
    this.name = 'azure-devops'; 
    Object.assign(this, mockAzureProviderInstanceMethods);
  }),
}));

vi.mock('../src/providers/MondayProvider.js', () => ({
  MondayProvider: vi.fn(function(this: any) { 
    this.name = 'monday'; 
    Object.assign(this, mockMondayProviderInstanceMethods);
  }),
}));


// Import ProviderFactory AFTER all concrete providers are mocked
import { ProviderFactory } from '../src/services/providerFactory.js';
import { AuditService } from '../src/services/auditService.js'; // Import AuditService for testing


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
    vi.clearAllMocks(); 
    
    // Reset specific mock implementations or return values if needed
    Object.values(dbMocks).forEach(mockFn => mockFn.mockReset());
    Object.values(mockConfigManager).forEach(mockFn => mockFn.mockReset());

    // Reset Provider Instance Mocks
    [
        mockLocalProviderInstanceMethods, 
        mockGitHubProviderInstanceMethods, 
        mockJiraProviderInstanceMethods, 
        mockTrelloProviderInstanceMethods, 
        mockAsanaProviderInstanceMethods,
        mockAzureProviderInstanceMethods,
        mockMondayProviderInstanceMethods
    ].forEach(methods => Object.values(methods).forEach(fn => fn.mockReset()));

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
    expect(MockMcpServer).toHaveBeenCalledWith(expect.objectContaining({
      name: 'project-worker',
    }));
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
        const result = await handler({ action: 'create', slug: 'new', title: 'T', content: 'C', tags: ['tag'] });
        expect(dbMocks.saveWikiPage).toHaveBeenCalledWith(expect.objectContaining({ slug: 'new', tags: ['tag'] }));
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
        const mockPage = { slug: 'slug', title: 'Old', content: 'Old', tags: [], lastUpdated: '' } as WikiPage;
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
          expect(dbMocks.addAuditLog).toHaveBeenCalledWith(expect.objectContaining({
              taskId: 'TASK-1',
              field: 'status',
              oldValue: 'todo',
              newValue: 'done'
          }));
      });

      it('should NOT log change if values are identical', async () => {
          await AuditService.logChange('TASK-1', 'status', 'todo', 'todo');
          expect(dbMocks.addAuditLog).not.toHaveBeenCalled();
      });
  });

});