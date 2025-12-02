import { ProjectProvider } from './types.js';
import { Task, CreateTaskInput, UpdateTaskInput, TaskFilter, TaskType } from '../types.js';
import { ConfigManager } from '../config.js';

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
    if (!config || !config.credentials.token || !config.settings?.domain) {
      throw new Error('Jira not configured. Need email, token, domain, and projectKey.');
    }
    this.domain = config.settings.domain; // e.g., 'myorg.atlassian.net'
    this.email = config.credentials.email;
    this.token = config.credentials.token;
    this.projectKey = config.settings.projectKey || ''; // Optional, but good for default create
  }

  private getHeaders() {
    return {
      'Authorization': `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  private mapIssueToTask(issue: any): Task {
    const fields = issue.fields;
    const typeMap: Record<string, TaskType> = {
      'Story': 'story',
      'Epic': 'epic',
      'Bug': 'bug',
      'Task': 'task',
      'Sub-task': 'subtask'
    };
    
    return {
      id: issue.key,
      title: fields.summary,
      description: fields.description || '', // Jira description can be complex ADF, simplified here
      status: fields.status.name === 'Done' ? 'done' : 'todo', // Simplified
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
      gitBranch: undefined
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
      headers: this.getHeaders()
    });

    if (!res.ok) throw new Error(`Jira API error: ${res.statusText}`);
    
    const data = await res.json();
    return data.issues.map((i: any) => this.mapIssueToTask(i));
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
      }
    };

    // Mapping Types
    if (input.type === 'story') body.fields.issuetype.name = 'Story';
    if (input.type === 'bug') body.fields.issuetype.name = 'Bug';
    if (input.type === 'epic') body.fields.issuetype.name = 'Epic';

    const res = await fetch(`https://${this.domain}/rest/api/3/issue`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
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
    throw new Error('Jira update not implemented yet'); 
  }

  async deleteTask(id: string): Promise<boolean> {
    await this.init();
    const res = await fetch(`https://${this.domain}/rest/api/3/issue/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return res.ok;
  }
}
