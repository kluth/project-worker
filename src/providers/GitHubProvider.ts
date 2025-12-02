import { ProjectProvider } from './types.js';
import { Task, CreateTaskInput, UpdateTaskInput, TaskFilter } from '../types.js';
import { Octokit } from '@octokit/rest';
import { ConfigManager } from '../config.js';

export class GitHubProvider implements ProjectProvider {
  name = 'github';
  private octokit: Octokit | null = null;
  private owner: string = '';
  private repo: string = '';

  constructor(private configManager: ConfigManager) {}

  private async init() {
    if (this.octokit) return;
    const config = await this.configManager.getProviderConfig('github');
    if (!config || !config.credentials.token || !config.settings?.repo) {
      throw new Error('GitHub not configured. Use manage_connections to set token and repo (owner/repo).');
    }
    this.octokit = new Octokit({ auth: config.credentials.token });
    const [owner, repo] = config.settings.repo.split('/');
    this.owner = owner;
    this.repo = repo;
  }

  // Mapping Helpers
  private toTask(issue: any): Task {
    // Map GitHub Issue to our Task model
    return {
      id: String(issue.number),
      title: issue.title,
      description: issue.body || '',
      status: issue.state === 'open' ? 'todo' : 'done', // Simple mapping
      priority: 'medium', // GitHub doesn't have native priority, could check labels
      type: 'task',
      assignee: issue.assignee?.login,
      tags: issue.labels.map((l: any) => l.name),
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      comments: [],
      checklists: [],
      customFields: {},
      blockedBy: [],
      gitBranch: undefined
    };
  }

  async getTasks(filter?: TaskFilter): Promise<Task[]> {
    await this.init();
    
    const state = filter?.status === 'done' ? 'closed' : 'open';
    
    const issues = await this.octokit!.paginate(this.octokit!.rest.issues.listForRepo, {
      owner: this.owner,
      repo: this.repo,
      state: state as any,
      assignee: filter?.assignee || undefined,
      per_page: 100
    });

    return issues.map(this.toTask);
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    await this.init();
    try {
      const response = await this.octokit!.rest.issues.get({
        owner: this.owner,
        repo: this.repo,
        issue_number: parseInt(id)
      });
      return this.toTask(response.data);
    } catch {
      return undefined;
    }
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    await this.init();
    const response = await this.octokit!.rest.issues.create({
      owner: this.owner,
      repo: this.repo,
      title: input.title,
      body: input.description,
      assignees: input.assignee ? [input.assignee] : undefined,
      labels: input.tags
    });
    return this.toTask(response.data);
  }

  async updateTask(input: UpdateTaskInput): Promise<Task> {
    await this.init();
    const issue_number = parseInt(input.id);
    
    const updateData: any = {};
    if (input.title) updateData.title = input.title;
    if (input.description) updateData.body = input.description;
    if (input.status) updateData.state = input.status === 'done' ? 'closed' : 'open';
    if (input.assignee) updateData.assignees = [input.assignee];
    if (input.tags) updateData.labels = input.tags;

    const response = await this.octokit!.rest.issues.update({
      owner: this.owner,
      repo: this.repo,
      issue_number,
      ...updateData
    });
    return this.toTask(response.data);
  }

  async deleteTask(id: string): Promise<boolean> {
    // GitHub API doesn't allow deleting issues via standard tokens usually, only closing
    // For safety, we'll just close it
    await this.updateTask({ id, status: 'done' });
    return true;
  }

  async addComment(taskId: string, content: string): Promise<Task> {
    await this.init();
    await this.octokit!.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: parseInt(taskId),
      body: content
    });
    
    // Return updated task
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error(`Failed to retrieve task ${taskId} after adding comment`);
    return task;
  }
}
