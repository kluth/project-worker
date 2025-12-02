# 🏗️ Architecture & Future Roadmap

This document outlines the current architectural state of the Gemini Project Worker and proposes a roadmap for evolving it into a multi-agent, high-concurrency system.

## 🔍 Current Architecture Analysis

### The "Split Brain" Problem
Currently, the extension operates with two disconnected data sources:
1.  **External Providers**: `GitHubProvider`, `JiraProvider`, etc., fetch and create tasks remotely.
2.  **Local Database (`db.json`)**: Stores rich metadata (comments, sprints, wiki, dependencies) that external platforms might not support.

**The Issue:** Tools like `add_comment` or `manage_dependencies` often write *only* to the local database. This means:
*   Comments added via Gemini are **not** visible on GitHub/Jira.
*   The local database effectively acts as a "cache" that drifts from the source of truth.

### Concurrency Bottleneck
The `src/db.ts` module relies on reading and writing a single `db.json` file for every operation.
*   **No Locking**: There is no file locking mechanism.
*   **Race Conditions**: If two "agents" or parallel requests try to write to the DB simultaneously, the last one wins, and data is lost.
*   **Impact**: This makes true parallel multi-agent execution unsafe in the current state.

---

## 🚀 Roadmap: Towards "Project Worker Pro"

To enable the requested features (Multi-Agent, Parallelism, Professional Efficiency), we propose the following evolution:

### Phase 1: Robust State Management (The Foundation)
*   **Replace `db.json` with SQLite**:
    *   **Why?**: SQLite handles concurrency and locking natively. It allows multiple "agents" to read/write without corruption.
    *   **Bonus**: Enables complex queries (SQL) for "Get Project Stats" or filtering, which is much faster than filtering arrays in JS.
*   **Unified Data Access Layer (DAL)**:
    *   Create a `Repository` pattern that abstracts the storage.
    *   Ensure all tools use this DAL instead of raw file I/O.

### Phase 2: The "Smart Sync" Engine
*   **Write-Through Providers**:
    *   Refactor `ProjectProvider` interface to support `addComment`, `addDependency`, etc.
    *   When `add_comment` is called, the Provider should try to push it to GitHub/Jira *first*, then save to local DB for indexing.
*   **Background Sync**:
    *   Implement a background process (or check-on-read) that syncs remote changes (e.g., new GitHub comments) into the local SQLite DB so the "Wiki" and "Search" are always up to date.

### Phase 3: Multi-Agent Architecture
Once the state is safe (Phase 1) and data is consistent (Phase 2), we can build specialized agents:

1.  **The "Router" (Supervisor)**:
    *   A high-level tool that analyzes a complex user request (e.g., "Plan the next sprint") and breaks it down.
    *   It delegates to sub-tools or sub-agents.

2.  **Specialized Agents (Implemented as "Smart Tools")**:
    *   **`CodeArchitect`**: A tool that doesn't just "read file", but "analyzes project structure" and returns a summary.
    *   **`QA_Bot`**: A tool that takes a Task ID, reads the linked Git branch, runs tests (via shell), and posts the result as a comment.

### Phase 4: Vector Memory (Long-Term Intelligence)
*   **Embeddings**: Calculate vector embeddings for Task descriptions, Wiki pages, and Discussion threads.
*   **Semantic Search**: Replace keyword search with semantic search.
    *   *User Query*: "How do we handle auth?"
    *   *Result*: Finds the Wiki page for "Authentication Standards" and the Task "Refactor Login", even if the word "auth" isn't exactly matched.

---

## Feasibility Verdict
*   **Multi-Agent**: **High Feasibility**, but requires Phase 1 (SQLite) first for safety.
*   **Parallelism**: **High Feasibility**, requires Phase 1.
*   **Efficiency**: **Medium Effort**. Caching is easy to add, but "Sync" is hard to get right.
