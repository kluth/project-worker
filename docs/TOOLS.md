# 🛠️ Project Worker Tool Reference

This document provides a comprehensive, granular reference for every tool available in the Gemini Project Worker.

## 📋 Core Task Management

### `create_task`
Creates a new task in the active provider.
- **Inputs:**
  - `title` (Required): The task title.
  - `description` (Optional): Detailed description.
  - `type` (Optional): 'task', 'bug', 'story', 'epic'. Default: 'task'.
  - `priority` (Optional): 'low', 'medium', 'high', 'critical'. Default: 'medium'.
  - `parentId` (Optional): ID of a parent task (if subtask).
- **Edge Cases:**
  - If the provider (e.g., Jira) requires fields that are not supplied, the creation may fail.
  - `parentId` must exist and be valid for the specific provider.

### `get_tasks`
Retrieves tasks based on filters.
- **Inputs:**
  - `status` (Optional): Filter by status (e.g., 'in progress', 'done').
  - `assignee` (Optional): Filter by assignee username/email.
  - `limit` (Optional): Max number of tasks to return. Default: 50.
- **Edge Cases:**
  - Some providers (like Trello) might return archived cards if not explicitly filtered out by the provider logic.
  - `assignee` matching is often provider-specific (exact match vs partial).

### `update_task`
Updates an existing task.
- **Inputs:**
  - `id` (Required): The Task ID.
  - `title`, `description`, `status`, `priority`, `assignee` (Optional): Fields to update.
- **Edge Cases:**
  - Changing `status` to an invalid workflow state (e.g., "Deployed" when that column doesn't exist) will likely throw an error.
  - Updating `assignee` requires a valid user ID for some providers (Jira), while others accept emails.

### `delete_task`
Permanently removes a task.
- **Inputs:**
  - `id` (Required): The Task ID.
- **Warning:** This action is usually irreversible.

### `search_tasks`
Performs a full-text search.
- **Inputs:**
  - `query` (Required): Search term.
- **Note:** Search capabilities vary by provider. Local provider uses simple substring matching; Jira uses JQL/text search.

---

## 🧠 Project Intelligence (New!)

### `generate_standup`
Generates a formatted text report of your recent activity for daily standups.
- **Inputs:**
  - `username` (Optional): Filter by assignee to generate "My Standup".
- **Logic:**
  - **Yesterday:** Fetches tasks completed or worked on (updated) in the last 24h (or 72h if today is Monday).
  - **Today:** Fetches tasks in 'In Progress' or 'Todo'.
  - **Blockers:** Fetches tasks with 'Blocked' status or tag.
- **Edge Cases:**
  - Relies on `updatedAt`. If you didn't touch a task "Yesterday" but finished it, it might be missed if the provider doesn't update the timestamp correctly.

### `scan_todos`
Scans your local codebase for comments like `// TODO:` or `# FIXME:`.
- **Inputs:**
  - `path` (Optional): Root directory to scan. Default: `.`.
  - `create` (Optional): Boolean. If `true`, automatically creates tasks for found TODOs.
- **Behavior:**
  - Ignores `node_modules`, `.git`, etc.
  - Generates a unique hash for each TODO to avoid creating duplicates (MVP implementation).
- **Edge Cases:**
  - Very large codebases might take time to scan.
  - If `create=true` is used repeatedly, it *might* create duplicates if the hash tracking logic isn't persisted (currently stateless in some modes).

### `get_project_stats`
Returns high-level metrics (e.g., Count by Status, Priority distribution).
- **Inputs:** None.
- **Use Case:** Good for "Give me a summary of the project" prompts.

### `get_task_history`
Retrieves the audit log or history of a specific task.
- **Inputs:**
  - `taskId` (Required).
- **Note:** Only works well if the provider supports history or if changes were made *through* this extension (which logs to local DB).

---

## 🏃 Agile & Sprints

### `manage_sprints`
CRUD for Sprints.
- **Inputs:**
  - `action`: 'create', 'list', 'update', 'delete'.
  - `sprintId`, `name`, `startDate`, `endDate`, `goal`.
- **Note:** Many providers (Jira) have their own Sprint objects. This tool currently syncs with the *Local* DB sprints unless the provider explicitly overrides it.

### `start_sprint` / `end_sprint`
Lifecycle management.
- **Inputs:** `sprintId`.
- **Effect:** Updates status. `end_sprint` might trigger rollover logic (moving incomplete tasks) if implemented.

### `log_work`
Logs time spent (Jira style).
- **Inputs:**
  - `taskId` (Required).
  - `timeSpent` (Optional): Hours to add.
  - `estimate` (Optional): New remaining estimate.
- **Edge Cases:**
  - Ensure `timeSpent` is a number (e.g., `1.5` for 1h 30m).

---

## 🌊 Kanban & Lean

### `set_wip_limit`
Sets Work-In-Progress limits for columns.
- **Inputs:** `column` (e.g., "In Progress"), `limit` (number).
- **Effect:** purely informational/validational for the local board view.

### `get_board_status`
Returns a visual or structured representation of the Kanban board, highlighting bottlenecks.

### `track_waste`
Log "Waste" activities (Lean methodology) like "Waiting", "Defects", "Over-processing".
- **Inputs:** `description`, `category`, `timeLost`.

---

## 📚 Knowledge Base

### `manage_wiki`
Create and read Wiki pages.
- **Inputs:**
  - `action`: 'read', 'write', 'search', 'list'.
  - `slug`: Page identifier (e.g., 'deployment-guide').
  - `title`, `content`.
- **Storage:** Stored in the local SQLite database. Not synced to Confluence/GitHub Wiki yet.

### `manage_discussions`
Threaded discussions decoupled from specific tasks.
- **Inputs:** `action`, `title`, `message`.

---

## 👥 Team & Meetings

### `create_meeting` / `summarize_meeting`
- `create_meeting`: log a meeting, invitees, and agenda.
- `summarize_meeting`: Store minutes and action items.

### `manage_team_health`
Conduct mood surveys or health checks.
- **Inputs:** `action` ('create_survey', 'log_response', 'get_results').

### `manage_pairing`
Track pair programming sessions.
- **Inputs:** `action` ('start', 'end'), `partner`.

---

## 💻 DevOps & Code

### `git_tools`
Helps with git workflows linked to tasks.
- **Inputs:**
  - `action`: 'create_branch', 'commit'.
  - `taskId`: Uses the task title to generate a branch name (e.g., `feat/123-login-page`).
- **Edge Cases:**
  - Requires `git` to be installed and available in the shell.

### `manage_releases`
Track software releases/versions.
- **Inputs:** `version`, `releaseDate`, `notes`.

---

## 🔌 Configuration

### `manage_connections`
**CRITICAL TOOL**. Configures which external provider is active.
- **Inputs:**
  - `action`: 'configure', 'set_active', 'list'.
  - `provider`: 'github', 'jira', 'trello', etc.
  - `credentials`: JSON string (e.g., `{"token": "..."}`).
  - `settings`: JSON string (e.g., `{"repo": "owner/repo"}`).
