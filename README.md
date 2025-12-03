# ✨ Gemini Project Worker: Your Universal Project Gateway ✨

Welcome to the **Gemini Project Worker**, a super powerful and autonomously working Gemini CLI extension designed to revolutionize your project management experience! This project serves as a comprehensive example of an MCP (Model Context Protocol) server, showcasing a lightweight TypeScript implementation that seamlessly integrates with a multitude of project management tools.

## 📚 Documentation

*   **[🚀 Getting Started Guide](project-worker.wiki/GETTING_STARTED.md)**: The step-by-step tutorial to get you up and running in minutes.
*   **[🛠️ Tool Reference](project-worker.wiki/TOOLS.md)**: A granular, comprehensive guide to every single tool and command available.
*   **[🔌 Provider Setup](project-worker.wiki/providers/index.md)**: Detailed configuration instructions for Jira, GitHub, Trello, Asana, Monday.com, and Azure DevOps.
*   **[❓ Troubleshooting](project-worker.wiki/TROUBLESHOOTING.md)**: Common issues and how to solve them.
*   **[🤝 Contributing](project-worker.wiki/CONTRIBUTING.md)**: How to help build the future of Project Worker.

## 🌟 Core Features

### 🔗 Universal Provider Model
We break down the walls between your favorite project management tools:
*   **Local Provider**: Offline-first task management.
*   **GitHub Issues**: For code-centric workflows.
*   **Jira**: Enterprise-grade agile support.
*   **Trello, Asana, Monday.com, Azure DevOps**: We support them all!

### 🧠 Intelligent Workflows (New!)
*   **Automated Standups**: Generate daily reports with `generate_standup`.
*   **Code Scanning**: Automatically find and track TODOs in your code with `scan_todos`.
*   **Smart Sprints**: Manage agile cycles directly from the CLI.

### ⚙️ Developer Enhancements
*   **Git Integration**: Create branches from tasks automatically.
*   **Wiki & Knowledge**: Built-in documentation system.
*   **Time Tracking**: Log work seamlessly.

## 🚀 Quick Start

1.  **Install**:
    ```bash
    npm install
    npm run build
    ```
2.  **Configure GitHub** (Example):
    ```bash
    manage_connections action=configure provider=github credentials={"token":"YOUR_TOKEN"} settings={"repo":"owner/repo"}
    ```
3.  **Activate**:
    ```bash
    manage_connections action=set_active provider=github
    ```
4.  **Create a Task**:
    > "Create a task to fix the login bug."

*See [Getting Started](project-worker.wiki/GETTING_STARTED.md) for the full guide.*

## 📄 License

This project is open-sourced under the MIT License. See the [LICENSE](LICENSE) file for more details.

---

_Empower your workflow. Unify your projects. Experience the Gemini Project Worker!_ ✨
