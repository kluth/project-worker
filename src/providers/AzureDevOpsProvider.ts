import { ProjectProvider } from './types.js';
import { Task, CreateTaskInput, TaskFilter } from '../types.js';
import { ConfigManager } from '../config.js';

interface AzureConfig {
  organization: string;
  project: string;
  token: string;
}

export class AzureDevOpsProvider implements ProjectProvider {
  name = 'azure-devops';
  private config: AzureConfig | null = null;
  private baseUrl: string = '';

  constructor(private configManager: ConfigManager) {}

  private getHeaders() {
    if (!this.config) throw new Error('Azure DevOps not configured');
    const auth = Buffer.from(`:${this.config.token}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };
  }

  private async init() {
    if (this.config) return;
    const providerConfig = await this.configManager.getProviderConfig('azure-devops');
    if (!providerConfig || !providerConfig.credentials?.token || !providerConfig.settings?.organization || !providerConfig.settings?.project) {
      throw new Error('Azure DevOps not configured. Required: credentials.token, settings.organization, settings.project');
    }
    this.config = {
      token: providerConfig.credentials.token,
      organization: providerConfig.settings.organization,
      project: providerConfig.settings.project,
    };
    this.baseUrl = `https://dev.azure.com/${this.config.organization}/${this.config.project}/_apis/wit`;
  }

  async getTasks(filter: TaskFilter): Promise<Task[]> {
    await this.init();
    // 1. Execute WIQL query to get IDs
    const query = "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.State] <> 'Removed' ORDER BY [System.ChangedDate] DESC";
    
    const wiqlResponse = await fetch(`${this.baseUrl}/wiql?api-version=6.0`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query }),
    });

    if (!wiqlResponse.ok) {
      throw new Error(`Azure DevOps WIQL error: ${wiqlResponse.statusText}`);
    }

    const wiqlData = await wiqlResponse.json();
    const workItems = wiqlData.workItems;

    if (!workItems || workItems.length === 0) {
      return [];
    }

    // 2. Fetch details for IDs (max 200 typically, taking first 50 for now)
    const ids = workItems.slice(0, 50).map((wi: any) => wi.id).join(',');
    
    const detailsResponse = await fetch(`${this.baseUrl}/workitems?ids=${ids}&api-version=6.0`, {
      headers: this.getHeaders(),
    });

    if (!detailsResponse.ok) {
      throw new Error(`Azure DevOps Details error: ${detailsResponse.statusText}`);
    }

    const detailsData = await detailsResponse.json();

    return detailsData.value.map((item: any) => ({
      id: item.id.toString(),
      title: item.fields['System.Title'],
      description: item.fields['System.Description'] || '',
      status: item.fields['System.State'],
      priority: item.fields['Microsoft.VSTS.Common.Priority']?.toString() || 'medium',
      type: item.fields['System.WorkItemType'] || 'task',
      assignee: item.fields['System.AssignedTo']?.displayName,
      url: item._links?.html?.href,
      createdAt: item.fields['System.CreatedDate'],
      updatedAt: item.fields['System.ChangedDate'],
      source: 'azure-devops',
    }));
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    await this.init();
    const type = input.type || 'Task'; // 'User Story', 'Bug', 'Feature'
    
    const patchDocument = [
      { op: 'add', path: '/fields/System.Title', value: input.title },
      { op: 'add', path: '/fields/System.Description', value: input.description || '' },
    ];

    if (input.priority) {
      // Simple mapping, Azure usually uses 1-4
      const p = input.priority === 'high' ? 1 : input.priority === 'low' ? 3 : 2;
      patchDocument.push({ op: 'add', path: '/fields/Microsoft.VSTS.Common.Priority', value: p });
    }

    const response = await fetch(`${this.baseUrl}/workitems/$${type}?api-version=6.0`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json-patch+json',
      },
      body: JSON.stringify(patchDocument),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Azure DevOps Create error: ${response.statusText} - ${err}`);
    }

    const item = await response.json();

    return {
      id: item.id.toString(),
      title: item.fields['System.Title'],
      description: item.fields['System.Description'] || '',
      status: item.fields['System.State'],
      priority: input.priority || 'medium',
      type: item.fields['System.WorkItemType'],
      createdAt: item.fields['System.CreatedDate'],
      updatedAt: item.fields['System.ChangedDate'],
      source: 'azure-devops',
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