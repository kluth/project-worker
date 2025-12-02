import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.gemini-project-worker');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface ProviderConfig {
  provider: 'github' | 'jira' | 'trello' | 'asana' | 'azure-devops' | 'monday';
  enabled: boolean;
  credentials: Record<string, string>; // e.g., { apiKey: '...', email: '...' }
  settings?: Record<string, unknown>; // Changed 'any' to 'unknown'
}

export interface AgileMethodologyConfig {
  type: 'scrum' | 'kanban' | 'waterfall' | 'lean' | 'prince2' | 'custom';
  settings?: Record<string, unknown>; // Changed 'any' to 'unknown'
}

// ... other interfaces ...

export class ConfigManager {
  private config: AppConfig | null = null;

  // ... ensureConfigExists ...

  private async load(): Promise<AppConfig> {
    if (this.config) return this.config;
    await this.ensureConfigExists();
    const content = await fs.readFile(CONFIG_FILE, 'utf-8');
    try {
      this.config = JSON.parse(content);
      // Ensure new fields are initialized for existing configs
      this.config.agileMethodology =
        this.config.agileMethodology || DEFAULT_CONFIG.agileMethodology;
      this.config.sprints = this.config.sprints || DEFAULT_CONFIG.sprints;
      this.config.kanbanBoards = this.config.kanbanBoards || DEFAULT_CONFIG.kanbanBoards;
      this.config.events = this.config.events || DEFAULT_CONFIG.events;
      return this.config; // Removed non-null assertion as this.config is now guaranteed to be set
    } catch (e: unknown) {
      // Catch as unknown
      console.error('Error loading config, using default:', e); // Added console.error for debugging
      return DEFAULT_CONFIG;
    }
  }

  async save(config: AppConfig): Promise<void> {
    // Added Promise<void>
    this.config = config;
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  }

  async get(): Promise<AppConfig> {
    return this.load();
  }

  async setProviderConfig(config: ProviderConfig): Promise<void> {
    // Added Promise<void>
    const current = await this.load();
    const index = current.providers.findIndex((p) => p.provider === config.provider);
    if (index !== -1) {
      current.providers[index] = config;
    } else {
      current.providers.push(config);
    }
    await this.save(current);
  }

  async setActiveProvider(provider: AppConfig['activeProvider']): Promise<void> {
    // Added Promise<void>
    const current = await this.load();
    current.activeProvider = provider;
    await this.save(current);
  }
}

export const configManager = new ConfigManager();
