# 🤝 Contributing to Project Worker

We love contributions! Here's how you can help.

## Development Setup

1.  **Clone the repo**:
    ```bash
    git clone https://github.com/kluth/project-worker.git
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Build**:
    ```bash
    npm run build
    ```

## Testing

We use `vitest` for testing.
*   Run all tests: `npm test`
*   Run specific test: `npm test tests/tools/myTool.test.ts`

**Rule:** If you add a feature, you **must** add a test.

## Adding a New Tool

1.  Create the tool logic in `src/tools/myTool.ts`.
2.  Register it in `src/index.ts`.
3.  Add a test file in `tests/tools/myTool.test.ts`.
4.  Update `docs/TOOLS.md`.

## Adding a Provider

Implement the `ProjectProvider` interface in `src/providers/types.ts`. See `LocalProvider.ts` for a reference implementation.

## Pull Request Process

1.  Create a feature branch: `git checkout -b feat/my-new-feature`.
2.  Commit your changes.
3.  Push to the branch.
4.  Open a Pull Request against `main`.
5.  Ensure CI passes.

Thank you for building with us!
