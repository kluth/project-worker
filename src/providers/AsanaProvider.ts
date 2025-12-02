import { ProjectProvider } from './types.js';
import { Task, CreateTaskInput, UpdateTaskInput, TaskFilter } from '../types.js';
import { ConfigManager } from '../config.js';

export class AsanaProvider implements ProjectProvider {
  name = 'asana';
  private token: string = '';
  private projectId: string = '';

  constructor(private configManager: ConfigManager) {}

  private async init() {
    if (this.token) return;
    const config = await this.configManager.getProviderConfig('asana');
    if (!config || !config.credentials.token || !config.settings?.projectId) {
      throw new Error('Asana not configured.');
    }
    this.token = config.credentials.token;
    this.projectId = config.settings.projectId;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/json'
    };
  }

  private mapToTask(t: any): Task {
    return {
      id: t.gid,
      title: t.name,
      description: t.notes || '',
      status: t.completed ? 'done' : 'todo',
      priority: 'medium',
      type: 'task',
      tags: [],
      createdAt: t.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
      checklists: [],
      customFields: {},
      blockedBy: [],
      gitBranch: undefined
    };
  }

  async getTasks(filter?: TaskFilter): Promise<Task[]> {
    await this.init();
    const url = `https://app.asana.com/api/1.0/tasks?project=${this.projectId}&opt_fields=name,notes,completed,created_at`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Asana API Error: ${res.statusText}`);
    const data = await res.json();
    return data.data.map((t: any) => this.mapToTask(t));
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    await this.init();
    const url = `https://app.asana.com/api/1.0/tasks/${id}?opt_fields=name,notes,completed,created_at`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) return undefined;
    const data = await res.json();
    return this.mapToTask(data.data);
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    await this.init();
    const body = {
      data: {
        name: input.title,
        notes: input.description,
        projects: [this.projectId]
      }
    };
    
    const res = await fetch('https://app.asana.com/api/1.0/tasks', {
      method: 'POST',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!res.ok) throw new Error('Failed to create Asana task');
    const data = await res.json();
    return this.mapToTask(data.data);
  }

  async updateTask(input: UpdateTaskInput): Promise<Task> {
    throw new Error('Not implemented');
  }

  async deleteTask(id: string): Promise<boolean> {
    await this.init();
    const res = await fetch(`https://app.asana.com/api/1.0/tasks/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return res.ok;
  }

  async addComment(taskId: string, content: string): Promise<Task> {
    throw new Error('Not implemented');
  }
}
