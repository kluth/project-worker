import type { ProjectProvider } from '../providers/types.js';
import { LocalProvider } from '../providers/LocalProvider.js';
import { GitHubProvider } from '../providers/GitHubProvider.js';
import { JiraProvider } from '../providers/JiraProvider.js';
import { TrelloProvider } from '../providers/TrelloProvider.js';
import { AsanaProvider } from '../providers/AsanaProvider.js';
import { AzureDevOpsProvider } from '../providers/AzureDevOpsProvider.js';
import { MondayProvider } from '../providers/MondayProvider.js';
import { configManager } from '../config.js';

export class ProviderFactory {
  private static instances: Map<string, ProjectProvider> = new Map();

  static async getProvider(name?: string): Promise<ProjectProvider> {
    const config = await configManager.get();
    const target = name || config.activeProvider;

    if (this.instances.has(target)) {
      const provider = this.instances.get(target);
      if (provider) {
        return provider;
      }
      // Should ideally not happen if .has(target) is true
      throw new Error(`Internal error: Provider ${target} found in cache but is undefined.`);
    }

    // Validate that the provider is configured before trying to instantiate it,
    // except for local which is always valid.
    if (target !== 'local') {
      const providerConfig = await configManager.getProviderConfig(target);
      if (!providerConfig) {
        throw new Error(`Provider "${target}" is not configured.`);
      }
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
      case 'azure-devops':
        provider = new AzureDevOpsProvider(configManager);
        break;
      case 'monday':
        provider = new MondayProvider(configManager);
        break;
      case 'local':
        provider = new LocalProvider();
        break;
      default:
        throw new Error(`Unknown provider: ${target}`);
    }

    this.instances.set(target, provider);
    return provider;
  }
}
