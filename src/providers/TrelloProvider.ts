import { ProjectProvider } from './types.js';
import { Task, CreateTaskInput, UpdateTaskInput, TaskFilter } from '../types.js';
import { ConfigManager } from '../config.js';

export class TrelloProvider implements ProjectProvider {
  name = 'trello';
  private key: string = '';
  private token: string = '';
  private boardId: string = '';

  constructor(private configManager: ConfigManager) {}

  private async init() {
    if (this.token) return;
    const config = await this.configManager.getProviderConfig('trello');
    if (!config || !config.credentials.token || !config.settings?.boardId) {
      throw new Error('Trello not configured. Need key, token, and boardId.');
    }
    this.key = config.credentials.key;
    this.token = config.credentials.token;
    this.boardId = config.settings.boardId;
  }

  private mapCardToTask(card: any): Task {
    return {
      id: card.id,
      title: card.name,
      description: card.desc,
      status: 'todo', // Trello uses Lists for status, hard to map without list mapping config
      priority: 'medium',
      type: 'task',
      tags: card.labels.map((l: any) => l.name),
      assignee: card.idMembers[0], // Just taking first member ID
      createdAt: new Date().toISOString(), // Trello doesn't give created date on card object easily (encoded in ID)
      updatedAt: new Date().toISOString(),
      comments: [],
      checklists: [], // Could fetch checklists separately
      customFields: {},
      blockedBy: [],
      gitBranch: undefined
    };
  }

  async getTasks(filter?: TaskFilter): Promise<Task[]> {
    await this.init();
    const url = `https://api.trello.com/1/boards/${this.boardId}/cards?key=${this.key}&token=${this.token}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Trello API Error: ${res.statusText}`);
    
    const cards = await res.json();
    return cards.map((c: any) => this.mapCardToTask(c));
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    await this.init();
    const url = `https://api.trello.com/1/cards/${id}?key=${this.key}&token=${this.token}`;
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const card = await res.json();
    return this.mapCardToTask(card);
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    await this.init();
    // Need a list ID to create card. Usually configured or defaulted to first list.
    // For this POC, we assume boardId is actually a List ID? No, settings said boardId.
    // We need to fetch lists to find "To Do".
    
    // 1. Fetch Lists
    const listsRes = await fetch(`https://api.trello.com/1/boards/${this.boardId}/lists?key=${this.key}&token=${this.token}`);
    const lists = await listsRes.json();
    if (lists.length === 0) throw new Error('No lists found on board');
    const listId = lists[0].id; // Pick first list

    // 2. Create Card
    const url = `https://api.trello.com/1/cards?idList=${listId}&key=${this.key}&token=${this.token}&name=${encodeURIComponent(input.title)}&desc=${encodeURIComponent(input.description || '')}`;
    
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to create Trello card');
    
    const card = await res.json();
    return this.mapCardToTask(card);
  }

  async updateTask(input: UpdateTaskInput): Promise<Task> {
    throw new Error('Not implemented');
  }

  async deleteTask(id: string): Promise<boolean> {
    await this.init();
    const url = `https://api.trello.com/1/cards/${id}?key=${this.key}&token=${this.token}`;
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok;
  }

  async addComment(taskId: string, content: string): Promise<Task> {
    throw new Error('Not implemented');
  }
}
