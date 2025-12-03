# ❓ Troubleshooting Guide

Having trouble with Project Worker? Here are solutions to common problems.

## Connection Issues

### "Provider not configured"
**Symptom:** You try to run a command and get an error saying the provider is not configured.
**Solution:**
1.  Run `manage_connections action=list` to see which providers are set up.
2.  Ensure the provider you want to use is marked as active (`*`).
3.  If not, run `manage_connections action=set_active provider=<name>`.

### "Authentication failed" or "Bad credentials"
**Symptom:** The tool fails to fetch data or create tasks.
**Solution:**
*   **GitHub:** Ensure your Personal Access Token (PAT) has the `repo` scope.
*   **Jira:** You **must** use an API Token, not your account password. [Generate one here](https://id.atlassian.com/manage-profile/security/api-tokens).
*   **Trello:** Check that you have both the API Key and the User Token.

## Task Management

### "Task not found"
**Symptom:** `update_task` or `get_task_history` fails.
**Solution:**
1.  Verify you are using the ID from the *currently active* provider.
2.  If you switched providers (e.g., from Local to Jira), the ID '1' might mean something different or not exist.

### "Field 'X' is required"
**Symptom:** Creating a task fails because of missing fields.
**Solution:**
*   Some setups (especially Jira) have required custom fields.
*   Currently, Project Worker supports standard fields. You may need to relax the requirements in your Jira project settings or use the `customFields` parameter if available in the specific tool implementation (check `TOOLS.md`).

## Developer Tools

### `scan_todos` not finding anything
**Symptom:** You run `scan_todos` but it returns 0 results.
**Solution:**
1.  Ensure you are running it from the project root.
2.  Check if your TODOs follow the standard format: `// TODO: message` or `# TODO: message`.
3.  The tool ignores `node_modules` and hidden folders by default.

### `generate_standup` is empty
**Symptom:** The report says "(No tasks)".
**Solution:**
1.  The tool looks at `updatedAt`. If you modified tasks externally (on the Jira website) and the provider API didn't update the timestamp immediately (or caching issues), it might be missed.
2.  Ensure your username filter matches your assignee name exactly (or substring).

## Still Stuck?

If you encounter a bug, please open an issue on our [GitHub Repository](https://github.com/kluth/project-worker/issues).
