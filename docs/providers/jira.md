# Jira Provider Setup

This guide explains how to connect the Gemini Project Worker to your Jira Cloud project.

## Prerequisites

1.  A Jira Cloud account.
2.  A Jira Project.

## Step 1: Generate an API Token

1.  Log in to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
2.  Click **Create API token**.
3.  Label it (e.g., "Gemini CLI").
4.  Click **Create** and **Copy** the token.

## Step 2: Gather Project Information

*   **Domain**: This is your site URL, e.g., `mycompany.atlassian.net`.
*   **Email**: The email address you use to log in to Jira.
*   **Project Key**: The prefix for your issue keys (e.g., for issue `PROJ-123`, the key is `PROJ`).

## Step 3: Configure the Extension

Use the `manage_connections` tool to save your credentials.

**Command Syntax:**
```bash
manage_connections action=configure provider=jira credentials={"email":"your_email@example.com","token":"YOUR_API_TOKEN"} settings={"domain":"yourdomain.atlassian.net","projectKey":"PROJ"}
```

**Example:**
```bash
manage_connections action=configure provider=jira credentials={"email":"jane@example.com","token":"ATATT3xFfGF0..."} settings={"domain":"acme.atlassian.net","projectKey":"WEB"}
```

## Step 4: Activate

Set Jira as your active provider:

```bash
manage_connections action=set_active provider=jira
```

## Verification

Run a test command:

```bash
get_tasks
```
You should see a list of issues from your Jira project.
