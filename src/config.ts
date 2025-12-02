import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Sprint } from './types.js'; // Import Sprint type

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

export interface AppConfig {
  activeProvider: 'local' | 'github' | 'jira' | 'trello' | 'asana' | 'azure-devops' | 'monday';
  providers: ProviderConfig[];
  agileMethodology: AgileMethodologyConfig; // New field
  sprints: Sprint[]; // New field
}

const DEFAULT_CONFIG: AppConfig = {
  activeProvider: 'local',
  providers: [],
  agileMethodology: { // Default agile methodology configuration
    type: 'scrum',
    settings: {}
  },
  sprints: [] // Default for sprints
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
