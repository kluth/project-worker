import type { ProjectProvider } from './types.js';
import type { Task, CreateTaskInput, UpdateTaskInput, TaskFilter } from '../types.js';
import type { ConfigManager } from '../config.js';

interface AsanaTaskResponse {
  gid: string;
  name: string;
  notes: string | null;
  completed: boolean;
  created_at: string;
  // Add other relevant fields if needed
}

export class AsanaProvider implements ProjectProvider {
  name = 'asana';
  private token: string = '';
  private projectId: string = '';

  constructor(private configManager: ConfigManager) {}

  private async init() {
    if (this.token) return;
    const config = await this.configManager.getProviderConfig('asana');
    if (!config || !config.credentials.token || typeof config.settings?.projectId !== 'string') {
      throw new Error(
        'Asana not configured. Token and projectId (string) are required in settings.',
      );
    }
    this.token = config.credentials.token;
    this.projectId = config.settings.projectId as string;
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
    };
  }

  private mapToTask(t: AsanaTaskResponse): Task {
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
      gitBranch: undefined,
    };
  }

  async getTasks(_filter?: TaskFilter): Promise<Task[]> {
    // Renamed to _filter
    await this.init();
    const url = `https://app.asana.com/api/1.0/tasks?project=${this.projectId}&opt_fields=name,notes,completed,created_at`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Asana API Error: ${res.statusText}`);
    const data = await res.json();
    return data.data.map((t: AsanaTaskResponse) => this.mapToTask(t)); // Fixed 'any'
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
        projects: [this.projectId],
      },
    };

    const res = await fetch('https://app.asana.com/api/1.0/tasks', {
      method: 'POST',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error('Failed to create Asana task');
    const data = await res.json();
    return this.mapToTask(data.data);
  }

  async updateTask(input: UpdateTaskInput): Promise<Task> {
    await this.init();
    const data: Record<string, unknown> = {};
    if (input.title) data.name = input.title;
    if (input.description !== undefined) data.notes = input.description;
    if (input.status) {
      data.completed = input.status === 'done' || input.status === 'completed';
    }

    const res = await fetch(`https://app.asana.com/api/1.0/tasks/${input.id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ data }),
    });

    if (!res.ok) throw new Error(`Failed to update Asana task: ${res.statusText}`);

    const responseData = await res.json();
    return this.mapToTask(responseData.data);
  }

  async deleteTask(id: string): Promise<boolean> {
    await this.init();
    const res = await fetch(`https://app.asana.com/api/1.0/tasks/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return res.ok;
  }

  async addComment(taskId: string, content: string): Promise<Task> {
    await this.init();
    const res = await fetch(`https://app.asana.com/api/1.0/tasks/${taskId}/stories`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ data: { text: content } }),
    });

    if (!res.ok) throw new Error(`Failed to add comment to Asana task: ${res.statusText}`);

    // Return updated task
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error('Task not found after adding comment');
    return task;
  }
}
