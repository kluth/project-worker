# ✨ Gemini Project Worker

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Tests](https://img.shields.io/badge/TDD-Mandatory-blueviolet)](https://github.com/kluth/project-worker)

> **An autonomous, AI-powered project gateway that bridges Gemini AI agents with your development workflow.**  
> Worker processes, orchestrates, and reports — all through natural language intent.

## 🏗️ Architecture

```
project-worker/
├── src/               # TypeScript source code
│   └── *.ts           # Worker modules, gateway handlers, AI integration
├── tests/             # Test suite (TDD mandatory)
├── package.json       # Dependencies & scripts
└── tsconfig.json      # TypeScript configuration
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Start worker
npm start
```

## 🧪 Testing

This project follows **eTDD (Enforced Test-Driven Development)** — every module has a corresponding test file with semantic assertions. No vanity patterns (`assert(true)`) allowed.

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 🔧 Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Gemini AI API key | — |
| `WORKER_MODE` | Worker execution mode | `gateway` |

## 📄 License

MIT