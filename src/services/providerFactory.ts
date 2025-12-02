import { ProjectProvider } from '../providers/types.js';
import { LocalProvider } from '../providers/LocalProvider.js';
import { GitHubProvider } from '../providers/GitHubProvider.js';
import { JiraProvider } from '../providers/JiraProvider.js';
import { TrelloProvider } from '../providers/TrelloProvider.js';
import { AsanaProvider } from '../providers/AsanaProvider.js';
import { configManager } from '../config.js';

export class ProviderFactory {
  private static instances: Map<string, ProjectProvider> = new Map();

  static async getProvider(name?: string): Promise<ProjectProvider> {
    const config = await configManager.get();
    const target = name || config.activeProvider;

    if (this.instances.has(target)) {
      return this.instances.get(target)!;
    }

    let provider: ProjectProvider;

    switch (target) {
      case 'github':
        provider = new GitHubProvider(configManager);
        break;
      case 'jira':
        provider = new JiraProvider(configManager);
        break;
      case 'trello':
        provider = new TrelloProvider(configManager);
        break;
      case 'asana':
        provider = new AsanaProvider(configManager);
        break;
      case 'local':
      default:
        provider = new LocalProvider();
        break;
    }

    this.instances.set(target, provider);
    return provider;
  }
}
