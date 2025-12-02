import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Sprint, TaskStatus } from './types.js'; // Import Sprint and TaskStatus types

const CONFIG_DIR = path.join(os.homedir(), '.gemini-project-worker');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface ProviderConfig {
  provider: 'github' | 'jira' | 'trello' | 'asana' | 'azure-devops' | 'monday';
  enabled: boolean;
  credentials: Record<string, string>; // e.g., { apiKey: '...', email: '...' }
  settings?: Record<string, any>; // e.g., { defaultRepo: 'owner/repo', jiraDomain: '...' }
}

export interface AgileMethodologyConfig {
  type: 'scrum' | 'kanban' | 'waterfall' | 'lean' | 'prince2' | 'custom';
  settings?: Record<string, any>; // e.g., { sprintLength: 2, wipLimit: 5 }
}

export interface KanbanBoardConfig {
  boardName: string; // e.g., "Default Kanban Board"
  wipLimits: Record<TaskStatus, number>; // e.g., { 'in progress': 3, 'review': 2 }
}

export interface AppConfig {
  activeProvider: 'local' | 'github' | 'jira' | 'trello' | 'asana' | 'azure-devops' | 'monday';
  providers: ProviderConfig[];
  agileMethodology: AgileMethodologyConfig;
  sprints: Sprint[]; // From Issue #6
  kanbanBoards: KanbanBoardConfig[]; // New for Issue #7
}

const DEFAULT_CONFIG: AppConfig = {
  activeProvider: 'local',
  providers: [],
  agileMethodology: { // Default agile methodology configuration
    type: 'scrum',
    settings: {}
  },
  sprints: [], // Default for sprints
  kanbanBoards: [], // Default for kanban boards
};

export class ConfigManager {
  private config: AppConfig | null = null;

  private async ensureConfigExists() {
    try {
      await fs.access(CONFIG_FILE);
    } catch {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
      await this.save(DEFAULT_CONFIG);
    }
  }

  private async load(): Promise<AppConfig> {
    if (this.config) return this.config;
    await this.ensureConfigExists();
    const content = await fs.readFile(CONFIG_FILE, 'utf-8');
    try {
      this.config = JSON.parse(content);
      // Ensure new fields are initialized for existing configs
      this.config.agileMethodology = this.config.agileMethodology || DEFAULT_CONFIG.agileMethodology;
      this.config.sprints = this.config.sprints || DEFAULT_CONFIG.sprints;
      this.config.kanbanBoards = this.config.kanbanBoards || DEFAULT_CONFIG.kanbanBoards;
      return this.config!;
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  async save(config: AppConfig) {
    this.config = config;
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  }

  async get(): Promise<AppConfig> {
    return this.load();
  }

  async setProviderConfig(config: ProviderConfig) {
    const current = await this.load();
    const index = current.providers.findIndex(p => p.provider === config.provider);
    if (index !== -1) {
      current.providers[index] = config;
    } else {
      current.providers.push(config);
    }
    await this.save(current);
  }

  async setActiveProvider(provider: AppConfig['activeProvider']) {
    const current = await this.load();
    current.activeProvider = provider;
    await this.save(current);
  }

  async getProviderConfig(provider: string): Promise<ProviderConfig | undefined> {
    const current = await this.load();
    return current.providers.find(p => p.provider === provider);
  }
}

export const configManager = new ConfigManager();