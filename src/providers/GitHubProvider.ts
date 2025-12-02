import type { ProjectProvider } from './types.js';
import type { Task, CreateTaskInput, UpdateTaskInput, TaskFilter } from '../types.js';
import { Octokit } from '@octokit/rest';
import type { ConfigManager } from '../config.js';

interface GitHubIssueResponse {
  number: number;
  title: string;
  body?: string | null;
  state: 'open' | 'closed';
  assignee: { login: string } | null;
  labels: { name: string }[];
  created_at: string;
  updated_at: string;
}

export class GitHubProvider implements ProjectProvider {
  name = 'github';
  private octokit: Octokit | null = null;
  private owner: string = '';
  private repo: string = '';

  constructor(private configManager: ConfigManager) {}

  private async init() {
    if (this.octokit) return;
    const config = await this.configManager.getProviderConfig('github');
    if (!config || !config.credentials.token || typeof config.settings?.repo !== 'string') {
      throw new Error(
        'GitHub not configured. Use manage_connections to set token and repo (owner/repo).',
      );
    }
    this.octokit = new Octokit({ auth: config.credentials.token });
    const repoParts = (config.settings.repo as string).split('/');
    if (repoParts.length !== 2 || !repoParts[0] || !repoParts[1]) {
      throw new Error('Invalid GitHub repository format. Expected "owner/repo".');
    }
    this.owner = repoParts[0];
    this.repo = repoParts[1];
  }

  // Mapping Helpers
  private toTask(issue: GitHubIssueResponse): Task {
    // Use GitHubIssueResponse
    // Map GitHub Issue to our Task model
    return {
      id: String(issue.number),
      title: issue.title,
      description: issue.body || '',
      status: issue.state === 'open' ? 'todo' : 'done', // Simple mapping
      priority: 'medium', // GitHub doesn't have native priority, could check labels
      type: 'task',
      assignee: issue.assignee?.login || undefined, // Handle null
      tags: issue.labels.map((l: { name: string }) => l.name), // Type the map callback
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      comments: [],
      checklists: [],
      customFields: {},
      blockedBy: [],
      gitBranch: undefined,
    };
  }

  async getTasks(filter?: TaskFilter): Promise<Task[]> {
    await this.init();

    const state = filter?.status === 'done' ? 'closed' : 'open';

    const issues = await this.octokit!.paginate(this.octokit!.rest.issues.listForRepo, {
      owner: this.owner,
      repo: this.repo,
      state: state,
      assignee: filter?.assignee || undefined,
      per_page: 100,
    });

    return issues.map((issue) => this.toTask(issue as unknown as GitHubIssueResponse));
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    await this.init();
    try {
      const response = await this.octokit!.rest.issues.get({
        owner: this.owner,
        repo: this.repo,
        issue_number: parseInt(id),
      });
      return this.toTask(response.data as GitHubIssueResponse);
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
      labels: input.tags,
    });
    return this.toTask(response.data as GitHubIssueResponse);
  }

  async updateTask(input: UpdateTaskInput): Promise<Task> {
    await this.init();
    const issue_number = parseInt(input.id);

    const updateData: {
      owner: string;
      repo: string;
      issue_number: number;
      title?: string;
      body?: string;
      state?: 'open' | 'closed';
      assignees?: string[];
      labels?: string[];
    } = {
      owner: this.owner,
      repo: this.repo,
      issue_number: issue_number,
    };
    if (input.title) updateData.title = input.title;
    if (input.description) updateData.body = input.description;
    if (input.status) updateData.state = input.status === 'done' ? 'closed' : 'open';
    if (input.assignee) updateData.assignees = [input.assignee];
    if (input.tags) updateData.labels = input.tags;

    const response = await this.octokit!.rest.issues.update(updateData);
    return this.toTask(response.data as GitHubIssueResponse);
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
      body: content,
    });

    // Return updated task
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error(`Failed to retrieve task ${taskId} after adding comment`);
    return task;
  }
}
