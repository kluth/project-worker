# 🏆 Engineering Best Practices & Decisions

This document records the architectural decisions and best practices adopted for the Gemini Project Worker providers.

## 🐙 GitHub Provider
*   **Library**: `Octokit` (Official SDK).
*   **Auth**: Personal Access Token (PAT) via standard Authorization header.
*   **Pagination**: Uses `octokit.paginate()` to fetch all tasks, ensuring complete data visibility.
*   **Rate Limiting**: Octokit handles basic rate limiting automatically.

## ☁️ Azure DevOps Provider
*   **Library**: Native `fetch` (REST API).
*   **Reasoning**: The official `azure-devops-node-api` is large and complex. For a CLI extension, a lightweight wrapper around the REST API (`_apis/wit/wiql`) reduces bundle size and complexity.
*   **Versioning**: Explicitly uses `api-version=6.0` for stability.
*   **Querying**: Uses **WIQL** (Work Item Query Language) for efficient task retrieval.

## 📅 Monday.com Provider
*   **Library**: Native `fetch` (GraphQL API).
*   **Reasoning**: The `monday-sdk-js` is a valid option, but direct GraphQL queries offer transparency and zero dependencies for simple CRUD operations.
*   **Pattern**: Requests constructed manually to the `v2` endpoint.

## 🏗️ Future Providers (Jira, Asana, Trello)
When implementing these fully, we recommend:
*   **Jira**: Use `jira.js` (Modern, typed SDK) over `jira-connector`.
*   **Asana**: Use the official `asana` node client (v3).
*   **Trello**: Use `trello.js` or `node-trello` for simplified auth handling.

## 🔒 Security & State
*   **Database**: **SQLite** (`better-sqlite3`) is used for local state to ensure concurrency safety (file locking) during multi-agent execution.
*   **Sensitive Data**: Tokens are stored in `~/.gemini-project-worker/config.json`. In a future iteration, integrating with the system credential store (Keytar) would be a security upgrade.
