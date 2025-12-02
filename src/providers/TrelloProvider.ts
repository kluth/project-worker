import type { ProjectProvider } from './types.js';
import type { Task, CreateTaskInput, UpdateTaskInput, TaskFilter } from '../types.js';
import type { ConfigManager } from '../config.js';

interface TrelloCardResponse {
  id: string;
  name: string;
  desc: string | null;
  idList: string; // ID of the list the card is in
  labels: { id: string; name: string; color: string }[];
  idMembers: string[];
  // Trello cards don't have a direct 'created_at' on the card object, it's encoded in the ID.
  // Need to rely on default new Date().toISOString() for now or fetch more details if needed.
}

export class TrelloProvider implements ProjectProvider {
  name = 'trello';
  private key: string = '';
  private token: string = '';
  private boardId: string = '';

  constructor(private configManager: ConfigManager) {}

  private async init() {
    if (this.token) return;
    const config = await this.configManager.getProviderConfig('trello');
    if (
      !config ||
      typeof config.credentials?.token !== 'string' ||
      typeof config.credentials?.key !== 'string' ||
      typeof config.settings?.boardId !== 'string'
    ) {
      throw new Error(
        'Trello not configured. Need key (string), token (string), and boardId (string).',
      );
    }
    this.key = config.credentials.key as string;
    this.token = config.credentials.token;
    this.boardId = config.settings.boardId as string;
  }

  private mapCardToTask(card: TrelloCardResponse): Task {
    // Use TrelloCardResponse
    return {
      id: card.id,
      title: card.name,
      description: card.desc || '', // Handle null desc
      status: 'todo', // Trello uses Lists for status, hard to map without list mapping config
      priority: 'medium',
      type: 'task',
      tags: card.labels.map((l) => l.name), // Type the map callback
      assignee: card.idMembers[0] || undefined, // Just taking first member ID, handle empty
      createdAt: new Date().toISOString(), // Trello doesn't give created date on card object easily (encoded in ID)
      updatedAt: new Date().toISOString(),
      comments: [],
      checklists: [], // Could fetch checklists separately
      customFields: {},
      blockedBy: [],
      gitBranch: undefined,
    };
  }

  async getTasks(_filter?: TaskFilter): Promise<Task[]> {
    // Renamed to _filter
    await this.init();
    const url = `https://api.trello.com/1/boards/${this.boardId}/cards?key=${this.key}&token=${this.token}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Trello API Error: ${res.statusText}`);

    const cards: TrelloCardResponse[] = await res.json(); // Type cast
    return cards.map((c) => this.mapCardToTask(c)); // Fixed 'any'
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    await this.init();
    const url = `https://api.trello.com/1/cards/${id}?key=${this.key}&token=${this.token}`;
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const card: TrelloCardResponse = await res.json(); // Type cast
    return this.mapCardToTask(card);
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    await this.init();
    // Need a list ID to create card. Usually configured or defaulted to first list.
    // For this POC, we assume boardId is actually a List ID? No, settings said boardId.
    // We need to fetch lists to find "To Do".

    // 1. Fetch Lists
    const listsRes = await fetch(
      `https://api.trello.com/1/boards/${this.boardId}/lists?key=${this.key}&token=${this.token}`,
    );
    const lists = await listsRes.json();
    if (lists.length === 0) throw new Error('No lists found on board');
    const listId = lists[0].id; // Pick first list

    // 2. Create Card
    const url = `https://api.trello.com/1/cards?idList=${listId}&key=${this.key}&token=${this.token}&name=${encodeURIComponent(input.title)}&desc=${encodeURIComponent(input.description || '')}`;

    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to create Trello card');

    const card: TrelloCardResponse = await res.json(); // Type cast
    return this.mapCardToTask(card);
  }

  async updateTask(_input: UpdateTaskInput): Promise<Task> {
    // Renamed to _input
    throw new Error('Not implemented');
  }

  async deleteTask(id: string): Promise<boolean> {
    await this.init();
    const url = `https://api.trello.com/1/cards/${id}?key=${this.key}&token=${this.token}`;
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok;
  }

  async addComment(_taskId: string, _content: string): Promise<Task> {
    // Renamed taskId, content
    throw new Error('Not implemented');
  }
}
