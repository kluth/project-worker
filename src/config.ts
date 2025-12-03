import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type {
  Sprint,
  TaskStatus,
  Event,
  WaterfallPhase,
  ValueStream,
  WasteItem,
  PdcaCycle,
  ProjectBrief,
  BusinessCase,
  Prince2Organization,
  Retrospective,
  RetroAction,
  Meeting,
} from './types.js'; // Import agile methodology types

const CONFIG_DIR = path.join(os.homedir(), '.gemini-project-worker');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface ProviderConfig {
  provider: 'github' | 'jira' | 'trello' | 'asana' | 'azure-devops' | 'monday' | 'local';
  enabled: boolean;
  credentials: Record<string, string>; // e.g., { apiKey: '...', email: '...' }
  settings?: Record<string, unknown>; // Changed 'any' to 'unknown'
}

export interface AgileMethodologyConfig {
  type: 'scrum' | 'kanban' | 'waterfall' | 'lean' | 'prince2' | 'custom';
  settings?: Record<string, unknown>;
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
  kanbanBoards: KanbanBoardConfig[]; // From Issue #7
  events: Event[]; // From Issue #8
  waterfallPhases: WaterfallPhase[]; // From Issue #11
  valueStreams: ValueStream[]; // From Issue #12
  wasteLog: WasteItem[]; // From Issue #12
  pdcaCycles: PdcaCycle[]; // From Issue #12
  projectBrief?: ProjectBrief; // From Issue #13
  businessCase?: BusinessCase; // From Issue #13
  prince2Organization?: Prince2Organization; // From Issue #13
  retrospectives: Retrospective[]; // From Issue #15
  retroActions: RetroAction[]; // From Issue #15
  meetings: Meeting[]; // From Issue #16
}

const DEFAULT_CONFIG: AppConfig = {
  activeProvider: 'local',
  providers: [],
  agileMethodology: {
    // Default agile methodology configuration
    type: 'scrum',
    settings: {},
  },
  sprints: [], // Default for sprints
  kanbanBoards: [], // Default for kanban boards
  events: [], // Default for events
  waterfallPhases: [], // Default for waterfall phases
  valueStreams: [], // Default for value streams
  wasteLog: [], // Default for waste log
  pdcaCycles: [], // Default for PDCA cycles
  retrospectives: [], // Default for retrospectives
  retroActions: [], // Default for retro actions
  meetings: [], // Default for meetings
};

export class ConfigManager {
  private config: AppConfig | null = null;

  private async ensureConfigExists(): Promise<void> {
    if (!(await fs.readdir(CONFIG_DIR).catch(() => null))) {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
    }
    if (!(await fs.readFile(CONFIG_FILE).catch(() => null))) {
      await fs.writeFile(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
    }
  }

  private async load(): Promise<AppConfig> {
    if (this.config) return this.config;
    await this.ensureConfigExists();
    const content = await fs.readFile(CONFIG_FILE, 'utf-8');
    try {
      const parsedConfig: AppConfig = JSON.parse(content);
      // Ensure new fields are initialized for existing configs
      parsedConfig.agileMethodology =
        parsedConfig.agileMethodology || DEFAULT_CONFIG.agileMethodology;
      parsedConfig.sprints = parsedConfig.sprints || DEFAULT_CONFIG.sprints;
      parsedConfig.kanbanBoards = parsedConfig.kanbanBoards || DEFAULT_CONFIG.kanbanBoards;
      parsedConfig.events = parsedConfig.events || DEFAULT_CONFIG.events;
      parsedConfig.waterfallPhases = parsedConfig.waterfallPhases || DEFAULT_CONFIG.waterfallPhases;
      parsedConfig.valueStreams = parsedConfig.valueStreams || DEFAULT_CONFIG.valueStreams;
      parsedConfig.wasteLog = parsedConfig.wasteLog || DEFAULT_CONFIG.wasteLog;
      parsedConfig.pdcaCycles = parsedConfig.pdcaCycles || DEFAULT_CONFIG.pdcaCycles;
      parsedConfig.retrospectives = parsedConfig.retrospectives || DEFAULT_CONFIG.retrospectives;
      parsedConfig.retroActions = parsedConfig.retroActions || DEFAULT_CONFIG.retroActions;
      parsedConfig.meetings = parsedConfig.meetings || DEFAULT_CONFIG.meetings;
      this.config = parsedConfig; // Assign to this.config after ensuring it's fully initialized
      return parsedConfig;
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

  async getProviderConfig(
    providerName: AppConfig['activeProvider'],
  ): Promise<ProviderConfig | undefined> {
    const config = await this.load();
    return config.providers.find((p) => p.provider === providerName);
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
