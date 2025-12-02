import type { ProjectProvider } from './types.js';
import type { Task, CreateTaskInput, TaskFilter } from '../types.js';
import type { ConfigManager } from '../config.js';

interface MondayConfig {
  token: string;
  boardId: string;
}

interface MondayItemResponse {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  column_values: {
    id: string;
    text: string;
    type: string;
  }[];
}

export class MondayProvider implements ProjectProvider {
  name = 'monday';
  private config: MondayConfig | null = null;
  private apiUrl = 'https://api.monday.com/v2';

  constructor(private configManager: ConfigManager) {}

  private getHeaders() {
    if (!this.config) throw new Error('Monday.com not configured');
    return {
      Authorization: this.config.token,
      'Content-Type': 'application/json',
    };
  }

  private async init() {
    if (this.config) return;
    const providerConfig = await this.configManager.getProviderConfig('monday');
    if (
      !providerConfig ||
      !providerConfig.credentials?.token ||
      !providerConfig.settings?.boardId
    ) {
      throw new Error('Monday.com not configured. Required: credentials.token, settings.boardId');
    }
    this.config = {
      token: providerConfig.credentials.token,
      boardId: providerConfig.settings.boardId,
    };
  }

  async getTasks(_filter: TaskFilter): Promise<Task[]> {
    // Renamed filter to _filter
    await this.init();
    const query = `
      query {
        boards (ids: [${this.config.boardId}]) { // Removed !
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
      throw new Error(`Monday.com GraphQL error: ${JSON.stringify(data.errors as unknown)}`); // Cast to unknown
    }

    const items: MondayItemResponse[] = data.data.boards[0]?.items_page?.items || []; // Typed items

    return items.map((item: MondayItemResponse) => {
      // Fixed 'any'
      const statusCol = item.column_values.find(
        (c) => c.type === 'status' || c.id.includes('status'),
      );
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
        tags: [],
        comments: [],
        checklists: [],
        customFields: {},
        blockedBy: [],
      };
    });
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    await this.init();
    const query = `
      mutation {
        create_item (board_id: ${this.config.boardId}, item_name: "${input.title}") { // Removed !
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
      throw new Error(`Monday.com GraphQL create error: ${JSON.stringify(data.errors as unknown)}`); // Cast to unknown
    }

    const item: MondayItemResponse = data.data.create_item; // Typed item

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
      tags: [],
      comments: [],
      checklists: [],
      customFields: {},
      blockedBy: [],
    };
  }

  async getTaskById(_id: string): Promise<Task | undefined> {
    // Renamed id to _id
    return undefined; // TODO
  }

  async updateTask(_input: UpdateTaskInput): Promise<Task> {
    // Renamed input to _input
    throw new Error('Not implemented');
  }

  async deleteTask(_id: string): Promise<boolean> {
    // Renamed id to _id
    throw new Error('Not implemented');
  }

  async addComment(_taskId: string, _content: string): Promise<Task> {
    // Renamed taskId, content
    throw new Error('Not implemented');
  }
}
