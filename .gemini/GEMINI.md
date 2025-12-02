# Project Worker Extension

## Overview
`project-worker` is a **Universal Project Gateway** for Gemini CLI. It integrates with external tools like **GitHub**, **Jira**, **Trello**, and **Asana** while maintaining a robust local project management system.

**Config Location**: `~/.gemini-project-worker/config.json`

## 🔌 Integrations

### Manage Connections
Use the `manage_connections` tool to authenticate with external providers.

**GitHub Setup:**
```bash
manage_connections action=configure provider=github credentials={"token":"YOUR_PAT"} settings={"repo":"owner/repo"}
```

**Jira Setup:**
```bash
manage_connections action=configure provider=jira credentials={"email":"me@org.com","token":"JIRA_API_TOKEN"} settings={"domain":"myorg.atlassian.net","projectKey":"PROJ"}
```

**Trello Setup:**
```bash
manage_connections action=configure provider=trello credentials={"key":"API_KEY","token":"API_TOKEN"} settings={"boardId":"BOARD_ID"}
```

**Asana Setup:**
```bash
manage_connections action=configure provider=asana credentials={"token":"PAT_TOKEN"} settings={"projectId":"PROJECT_ID"}
```

### Provider-Aware Tools
The following tools adapt based on your active provider (set via `manage_connections action=set_active` or override via `source=...`):

- **`get_tasks`**: Fetches tasks/cards/issues from the provider.
- **`create_task`**: Creates new items in the external system.
  - *Example*: `create_task title="Server Crash" type="bug" source=jira`

## 🌟 Local Ecosystem (Default)
When using the `local` provider, you get the full suite of Enterprise features:
- **Enterprise**: Epics, Sprints (`manage_sprints`), Releases (`manage_releases`).
- **Knowledge**: Wiki (`manage_wiki`) and Discussions (`manage_discussions`).
- **Time Tracking**: `log_work`.

## Agent Instructions
**Universal Workflow:**
> "Check my **Trello** board for new cards. If you find any about 'Design', create a corresponding **Jira** story in the 'Mobile App' project."

**Authentication Help:**
If you get an authentication error, ask the user to run the appropriate `manage_connections` command with their credentials.

## Development
- **Build**: `npm run build`
- **Test**: `npm test`