# Azure DevOps Provider Setup

This guide explains how to connect the Gemini Project Worker to your Azure DevOps project (Boards).

## Prerequisites

1.  An Azure DevOps organization and project.
2.  Permissions to create a Personal Access Token (PAT).

## Step 1: Generate Personal Access Token (PAT)

1.  Log in to Azure DevOps (`dev.azure.com/YOUR_ORG`).
2.  Click the **User Settings** icon (gear/person) in the top right.
3.  Select **Personal access tokens**.
4.  Click **+ New Token**.
5.  Name it (e.g., "Gemini CLI").
6.  Set **Organization** to "All accessible organizations" or your specific one.
7.  **Scopes**: Select **Work Items** (Read & Write). Full access works but is not recommended.
8.  Click **Create** and copy the token.

## Step 2: Gather Organization and Project Name

*   **Organization**: The part after `dev.azure.com/` (e.g., `myorg` in `dev.azure.com/myorg`).
*   **Project**: The name of your project (e.g., `MyProject`).

## Step 3: Configure the Extension

Use the `manage_connections` tool.

**Command Syntax:**
```bash
manage_connections action=configure provider=azure-devops credentials={"token":"YOUR_PAT_TOKEN"} settings={"organization":"YOUR_ORG","project":"YOUR_PROJECT"}
```

**Example:**
```bash
manage_connections action=configure provider=azure-devops credentials={"token":"abcd123..."} settings={"organization":"fabricam","project":"Web App"}
```

## Step 4: Activate

Set Azure DevOps as your active provider:

```bash
manage_connections action=set_active provider=azure-devops
```

## Verification

Run a test command:

```bash
get_tasks
```
You should see work items from your Azure DevOps project.
