import { ProjectProvider } from './types.js';
import { Task, CreateTaskInput, TaskFilter } from '../types.js';
import { ConfigManager } from '../config.js';

interface MondayConfig {
  token: string;
  boardId: string;
}

export class MondayProvider implements ProjectProvider {
  name = 'monday';
  private config: MondayConfig | null = null;
  private apiUrl = 'https://api.monday.com/v2';

  constructor(private configManager: ConfigManager) {}

  private getHeaders() {
    if (!this.config) throw new Error('Monday.com not configured');
    return {
      'Authorization': this.config.token,
      'Content-Type': 'application/json',
    };
  }

  private async init() {
    if (this.config) return;
    const providerConfig = await this.configManager.getProviderConfig('monday');
    if (!providerConfig || !providerConfig.credentials?.token || !providerConfig.settings?.boardId) {
      throw new Error('Monday.com not configured. Required: credentials.token, settings.boardId');
    }
    this.config = {
      token: providerConfig.credentials.token,
      boardId: providerConfig.settings.boardId,
    };
  }

  async getTasks(filter: TaskFilter): Promise<Task[]> {
    await this.init();
    const query = `
      query {
        boards (ids: [${this.config!.boardId}]) {
          items_page {
            items {
              id
              name
              created_at
              updated_at
              column_values {
                id
                text
                type
              }
            }
          }
        }
      }
    `;

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Monday.com error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.errors) {
      throw new Error(`Monday.com GraphQL error: ${JSON.stringify(data.errors)}`);
    }

    const items = data.data.boards[0]?.items_page?.items || [];

    return items.map((item: any) => {
      const statusCol = item.column_values.find((c: any) => c.type === 'status' || c.id.includes('status'));
      const status = statusCol ? statusCol.text : 'unknown';

      return {
        id: item.id,
        title: item.name,
        description: '', // Monday items don't strictly have a "description" field in the basic view, usually it's an "update"
        status: status,
        priority: 'medium', // Hard to map dynamically without config
        type: 'item',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        source: 'monday',
      };
    });
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    await this.init();
    const query = `
      mutation {
        create_item (board_id: ${this.config!.boardId}, item_name: "${input.title}") {
          id
          name
          created_at
          updated_at
        }
      }
    `;

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Monday.com create error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.errors) {
      throw new Error(`Monday.com GraphQL create error: ${JSON.stringify(data.errors)}`);
    }

    const item = data.data.create_item;

    return {
      id: item.id,
      title: item.name,
      description: '',
      status: 'new',
      priority: 'medium',
      type: 'item',
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      source: 'monday',
    };
  }

  async getTaskById(id: string): Promise<Task | null> {
    return null; // TODO
  }
  
  async updateTask(id: string, input: any): Promise<Task> {
    throw new Error('Not implemented');
  }
  
  async deleteTask(id: string): Promise<void> {
    throw new Error('Not implemented');
  }
}