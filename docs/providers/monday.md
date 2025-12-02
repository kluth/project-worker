# Monday.com Provider Setup

This guide explains how to connect the Gemini Project Worker to a Monday.com Board.

## Prerequisites

1.  A Monday.com account.
2.  A Board.

## Step 1: Generate API Token

1.  Log into your Monday.com account.
2.  Click on your **Avatar** (profile picture) in the bottom left.
3.  Select **Developers** (or **Admin** > **API** if you are an admin, but Developers is standard for personal tokens).
4.  Go to **My Access Tokens**.
5.  Click **Show** and copy your personal API token.

## Step 2: Get Board ID

1.  Open your board in the browser.
2.  The URL will look like: `https://mycompany.monday.com/boards/1234567890`.
3.  The number at the end is your **Board ID**.

## Step 3: Configure the Extension

Use the `manage_connections` tool.

**Command Syntax:**
```bash
manage_connections action=configure provider=monday credentials={"token":"YOUR_API_TOKEN"} settings={"boardId":"YOUR_BOARD_ID"}
```

**Example:**
```bash
manage_connections action=configure provider=monday credentials={"token":"eyJhb..."} settings={"boardId":"1234567890"}
```

## Step 4: Activate

Set Monday.com as your active provider:

```bash
manage_connections action=set_active provider=monday
```

## Verification

Run a test command:

```bash
get_tasks
```
You should see items from your Monday.com board.
