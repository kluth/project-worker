# Provider Configuration Guides

The Gemini Project Worker supports multiple external project management tools. Select your provider below for detailed setup instructions.

## Supported Providers

*   [**GitHub**](./github.md) - Connect to GitHub Issues.
*   [**Jira**](./jira.md) - Connect to Jira Cloud projects.
*   [**Trello**](./trello.md) - Manage Trello Boards.
*   [**Asana**](./asana.md) - Sync with Asana Projects.
*   [**Monday.com**](./monday.md) - Integrate with Monday.com Boards.
*   [**Azure DevOps**](./azure.md) - Work with Azure Boards.

## General Configuration Command

All providers are configured using the `manage_connections` tool.

**Syntax:**
```bash
manage_connections action=configure provider=<PROVIDER_NAME> credentials={<JSON>} settings={<JSON>}
```

**Switching Providers:**
To switch your active provider, use:
```bash
manage_connections action=set_active provider=<PROVIDER_NAME>
```
