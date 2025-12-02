# Asana Provider Setup

This guide explains how to connect the Gemini Project Worker to an Asana Project.

## Prerequisites

1.  An Asana account.
2.  An Asana Project.

## Step 1: Generate Personal Access Token (PAT)

1.  Go to **My Profile Settings** in Asana.
2.  Navigate to the **Apps** tab.
3.  Click **Manage Developer Apps**.
4.  Under "Personal Access Tokens", click **+ New Access Token**.
5.  Name it (e.g., "Gemini CLI") and create it.
6.  **Copy the token**.

## Step 2: Get Project ID

1.  Open your project in Asana.
2.  Look at the URL. It typically looks like: `https://app.asana.com/0/1234567890/0987654321`.
3.  The Project ID is usually the number *after* the `/0/` in the middle or end. If it's `.../0/PROJECT_ID/TASK_ID`, grab the project ID.
    *   *Tip: If unsure, you can use the Asana API explorer or just try the numbers from the URL.*

## Step 3: Configure the Extension

Use the `manage_connections` tool.

**Command Syntax:**
```bash
manage_connections action=configure provider=asana credentials={"token":"YOUR_PAT_TOKEN"} settings={"projectId":"YOUR_PROJECT_ID"}
```

**Example:**
```bash
manage_connections action=configure provider=asana credentials={"token":"1/123456..."} settings={"projectId":"9876543210"}
```

## Step 4: Activate

Set Asana as your active provider:

```bash
manage_connections action=set_active provider=asana
```

## Verification

Run a test command:

```bash
get_tasks
```
You should see tasks from your Asana project.
