# Trello Provider Setup

This guide explains how to connect the Gemini Project Worker to a Trello Board.

## Prerequisites

1.  A Trello account.
2.  A Board you want to manage.

## Step 1: Get API Key and Token

1.  Go to the [Trello Power-Ups Admin](https://trello.com/power-ups/admin).
2.  Create a new integration (or select an existing one).
3.  You will see your **API Key**. Copy it.
4.  To generate a **Token**, click the "Token" link (usually labeled "generate a Token") next to the API Key.
5.  Authorize the request and copy the generated Token.

## Step 2: Get Board ID

To find your Board ID (`shortLink` or `id`):
1.  Open your board in a browser.
2.  Look at the URL: `https://trello.com/b/BOARD_ID/board-name`.
3.  The `BOARD_ID` is the part after `/b/`.

*Alternatively, you can use the `.json` trick: append `.json` to your board URL (e.g., `https://trello.com/b/xyz/name.json`) and search for `"id":`. Use the top-level ID.*

## Step 3: Configure the Extension

Use the `manage_connections` tool.

**Command Syntax:**
```bash
manage_connections action=configure provider=trello credentials={"key":"YOUR_API_KEY","token":"YOUR_API_TOKEN"} settings={"boardId":"YOUR_BOARD_ID"}
```

**Example:**
```bash
manage_connections action=configure provider=trello credentials={"key":"abc123...","token":"token789..."} settings={"boardId":"xYz123"}
```

## Step 4: Activate

Set Trello as your active provider:

```bash
manage_connections action=set_active provider=trello
```

## Verification

Run a test command:

```bash
get_tasks
```
You should see cards from your Trello board.
