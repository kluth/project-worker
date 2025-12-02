# GitHub Provider Setup

This guide explains how to connect the Gemini Project Worker to your GitHub repository to manage issues.

## Prerequisites

1.  A GitHub account.
2.  A repository (public or private) that you want to manage.

## Step 1: Generate a Personal Access Token (PAT)

1.  Go to **GitHub Settings** > **Developer settings** > **Personal access tokens** > **Tokens (classic)** (or Fine-grained tokens).
    *   [Direct Link to Tokens (classic)](https://github.com/settings/tokens)
2.  Click **Generate new token**.
3.  Give it a Note (e.g., "Gemini Project Worker").
4.  Select the **Scopes**:
    *   `repo` (Full control of private repositories) - **Required** for private repos and full management.
    *   `public_repo` - Minimum for public repositories.
5.  Click **Generate token**.
6.  **Copy the token** immediately. You won't see it again.

## Step 2: Configure the Extension

Use the `manage_connections` tool to save your credentials.

**Command Syntax:**
```bash
manage_connections action=configure provider=github credentials={"token":"YOUR_PAT_TOKEN"} settings={"repo":"owner/repo_name"}
```

**Example:**
If your username is `octocat` and your repo is `hello-world`:
```bash
manage_connections action=configure provider=github credentials={"token":"ghp_1234567890abcdef"} settings={"repo":"octocat/hello-world"}
```

## Step 3: Activate

Set GitHub as your active provider:

```bash
manage_connections action=set_active provider=github
```

## Verification

Run a test command to verify the connection:

```bash
get_tasks
```
You should see the list of open issues from your repository.
