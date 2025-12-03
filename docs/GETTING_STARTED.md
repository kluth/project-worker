# 🚀 Getting Started with Project Worker

Welcome to the Gemini Project Worker! This guide will take you from zero to hero, helping you set up your environment and start managing projects like a pro.

## 1. Prerequisites

Before you begin, ensure you have the following installed:
*   **Node.js**: Version 18 or higher.
*   **Gemini CLI**: You should be running this within the Gemini environment.
*   **Git**: For version control features.

## 2. Installation

If you are reading this, you likely already have the extension downloaded. If not:

```bash
git clone https://github.com/kluth/project-worker.git
cd project-worker
npm install
npm run build
```

## 3. Configuration (The Most Important Step!)

By default, Project Worker uses a **Local** provider (storing tasks in a local SQLite database). To unlock its true power, you should connect it to your real tools.

### Connecting to GitHub
1.  **Get a Token:** Create a Personal Access Token (Classic) on GitHub with `repo` scope.
2.  **Run Command:**
    ```bash
    manage_connections action=configure provider=github credentials={"token":"YOUR_ghp_TOKEN"} settings={"repo":"owner/repo_name"}
    ```
3.  **Activate:**
    ```bash
    manage_connections action=set_active provider=github
    ```

### Connecting to Jira
1.  **Get a Token:** Generate an API Token from your Atlassian Account Settings.
2.  **Run Command:**
    ```bash
    manage_connections action=configure provider=jira credentials={"email":"your@email.com","token":"YOUR_API_TOKEN"} settings={"domain":"your-domain.atlassian.net","projectKey":"PROJ"}
    ```
3.  **Activate:**
    ```bash
    manage_connections action=set_active provider=jira
    ```

## 4. Your First Workflow

Let's try a simple workflow to verify everything works.

**Step 1: Create a Task**
> "Create a new task called 'Update Documentation' with high priority."

Gemini will use `create_task` to add this to your active provider.

**Step 2: List Tasks**
> "Show me all my high priority tasks."

Gemini will use `get_tasks` to fetch the list.

**Step 3: Generate a Standup Report (New Feature!)**
> "Generate my daily standup."

Gemini will use `generate_standup` to look at what you just created and format a report for you.

## 5. Exploring Further

Now that you are up and running, explore the full capabilities:

*   **[Tool Reference](TOOLS.md)**: A deep dive into every single command available.
*   **[Provider Guide](providers/index.md)**: Specific details for Asana, Trello, Monday.com, and Azure DevOps.
*   **[Best Practices](BEST_PRACTICES.md)**: How to use this tool effectively in a team.

## Troubleshooting

*   **"Provider not configured"**: Run `manage_connections action=list` to see what's set up.
*   **"Task not found"**: Ensure you are looking at the right provider. `manage_connections action=list` will show you which one is active (`*`).

Happy Coding! 🚀
