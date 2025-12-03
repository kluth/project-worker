import type { ProjectProvider } from './types.js';
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
  TaskType,
  TaskStatus,
} from '../types.js';
import type { ConfigManager } from '../config.js';

interface JiraIssueResponse {
  key: string;
  fields: {
    summary: string;
    description: string | null;
    status: { name: string };
    priority: { name: string }; // Simplified
    issuetype: { name: string };
    assignee: { displayName: string } | null;
    labels: string[];
    created: string;
    updated: string;
  };
  // Add other relevant fields if needed
}

export class JiraProvider implements ProjectProvider {
  name = 'jira';
  private domain: string = '';
  private email: string = '';
  private token: string = '';
  private projectKey: string = '';

  constructor(private configManager: ConfigManager) {}

  private async init() {
    if (this.token) return;
    const config = await this.configManager.getProviderConfig('jira');
    if (
      !config ||
      !config.credentials.token ||
      typeof config.settings?.domain !== 'string' ||
      typeof config.credentials?.email !== 'string'
    ) {
      throw new Error('Jira not configured. Need email (string), token, and domain (string).');
    }
    this.domain = config.settings.domain as string; // e.g., 'myorg.atlassian.net'
    this.email = config.credentials.email as string;
    this.token = config.credentials.token;
    this.projectKey = (config.settings.projectKey as string) || ''; // Optional, but good for default create
  }

  private getHeaders() {
    return {
      Authorization: `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private mapIssueToTask(issue: JiraIssueResponse): Task {
    const fields = issue.fields;
    const typeMap: Record<string, TaskType> = {
      Story: 'story',
      Epic: 'epic',
      Bug: 'bug',
      Task: 'task',
      'Sub-task': 'subtask',
    };
    // Map Jira status name directly to TaskStatus for flexibility
    let mappedStatus: TaskStatus;
    const jiraStatusName = fields.status.name.toLowerCase();

    if (
      jiraStatusName === 'done' ||
      jiraStatusName === 'closed' ||
      jiraStatusName === 'completed'
    ) {
      mappedStatus = 'done';
    } else if (jiraStatusName.includes('in progress')) {
      mappedStatus = 'in-progress';
    } else if (jiraStatusName.includes('to do')) {
      mappedStatus = 'todo';
    } else if (jiraStatusName.includes('backlog')) {
      mappedStatus = 'backlog';
    } else if (jiraStatusName.includes('review')) {
      mappedStatus = 'review';
    } else if (jiraStatusName.includes('qa')) {
      mappedStatus = 'qa';
    } else if (jiraStatusName.includes('ready for dev')) {
      mappedStatus = 'ready for dev';
    } else {
      mappedStatus = jiraStatusName; // Fallback to native Jira status
    }

    return {
      id: issue.key,
      title: fields.summary,
      description: fields.description || '',
      status: mappedStatus,
      priority: 'medium', // Need mapping logic
      type: typeMap[fields.issuetype.name] || 'task',
      assignee: fields.assignee?.displayName,
      tags: fields.labels || [],
      createdAt: fields.created,
      updatedAt: fields.updated,
      comments: [],
      checklists: [],
      customFields: {},
      blockedBy: [],
      gitBranch: undefined,
    };
  }

  async getTasks(filter?: TaskFilter): Promise<Task[]> {
    await this.init();

    let jql = 'order by created DESC';
    if (filter?.search) {
      jql = `text ~ "${filter.search}" ` + jql;
    }
    // ... handle other filters

    const url = `https://${this.domain}/rest/api/3/search?jql=${encodeURIComponent(jql)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) throw new Error(`Jira API error: ${res.statusText}`);

    const data = await res.json();
    return data.issues.map((i: JiraIssueResponse) => this.mapIssueToTask(i)); // Fixed 'any'
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    await this.init();
    const url = `https://${this.domain}/rest/api/3/issue/${id}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) return undefined;
    const data = await res.json();
    return this.mapIssueToTask(data);
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    await this.init();
    if (!this.projectKey) throw new Error('Project Key required in settings to create tasks');

    const body = {
      fields: {
        project: { key: this.projectKey },
        summary: input.title,
        description: input.description, // Note: Jira v3 needs ADF, v2 uses string. Using simplified for now.
        issuetype: { name: 'Task' }, // Default
      },
    };

    // Mapping Types
    if (input.type === 'story') body.fields.issuetype.name = 'Story';
    if (input.type === 'bug') body.fields.issuetype.name = 'Bug';
    if (input.type === 'epic') body.fields.issuetype.name = 'Epic';

    const res = await fetch(`https://${this.domain}/rest/api/3/issue`, {
      method: 'POST',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to create Jira issue: ${err}`);
    }

    const data = await res.json();
    // Fetch full task to return
    const newTask = await this.getTaskById(data.key);
    if (!newTask) throw new Error('Created task but could not fetch it');
    return newTask;
  }

  async updateTask(input: UpdateTaskInput): Promise<Task> {
    await this.init();
    const fields: Record<string, unknown> = {};

    if (input.title) fields.summary = input.title;
    if (input.description !== undefined) {
      fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: input.description || ' ' }],
          },
        ],
      };
    }
    if (input.priority) {
      // Simple mapping - real Jira often needs ID or specific name
      fields.priority = { name: input.priority };
    }

    // Note: Status updates require POST /transitions, not supported in simple update yet.

    const res = await fetch(`https://${this.domain}/rest/api/3/issue/${input.id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to update Jira task: ${err}`);
    }

    // Return updated task
    const task = await this.getTaskById(input.id);
    if (!task) throw new Error('Task not found after update');
    return task;
  }

  async deleteTask(id: string): Promise<boolean> {
    await this.init();
    const res = await fetch(`https://${this.domain}/rest/api/3/issue/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return res.ok;
  }

  async addComment(taskId: string, content: string): Promise<Task> {
    await this.init();
    const body = {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: content }],
          },
        ],
      },
    };

    const res = await fetch(`https://${this.domain}/rest/api/3/issue/${taskId}/comment`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to add comment to Jira task: ${err}`);
    }

    const task = await this.getTaskById(taskId);
    if (!task) throw new Error('Task not found after adding comment');
    return task;
  }
}
