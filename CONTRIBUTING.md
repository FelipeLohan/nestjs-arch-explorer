# Contributing to nestjs-arch-explorer

Thank you for your interest in contributing! This document covers how to set up the project locally, run tests, and submit changes.

## Repository structure

```
nestjs-arch-explorer/
├── src/                  # NestJS library source
│   └── explorer/         # ExplorerModule, ArchitectureScanner, controllers
├── client/               # React + Vite frontend (dashboard)
│   └── src/
│       ├── components/   # ArchGraph, DetailPanel
│       └── ...
├── example/              # Standalone demo app (separate installable project)
├── .github/workflows/    # CI (GitHub Actions)
└── dist/                 # Compiled output (git-ignored)
```

## Prerequisites

- Node.js 20+
- npm 9+

## Local setup

```bash
git clone https://github.com/FelipeLohan/nestjs-arch-explorer.git
cd nestjs-arch-explorer

# Install all dependencies (root + client)
npm install
npm install --prefix client

# Full build: frontend → backend → copy assets
npm run build:all

# Run the sandbox app
npm run start:prod
# Open http://localhost:3000/architecture
```

## Development workflow

### Backend (NestJS) — watch mode

The backend auto-recompiles on save. Assets must be built at least once first:

```bash
npm run build:all   # first time
npm run start:dev   # watch mode for src/
```

### Frontend (React/Vite) — dev server with HMR

```bash
# In one terminal — keep the NestJS backend running for /explorer-data
npm run start:prod

# In another terminal
cd client
npm run dev
# Open http://localhost:5173/architecture/
```

## Running tests

```bash
npm test          # unit tests
npm run test:cov  # with coverage
npm run test:e2e  # end-to-end
```

## Code style

The project uses ESLint + Prettier. Run before committing:

```bash
npm run lint
npm run format
```

## Submitting a pull request

1. Fork the repository and create a branch from `main`.
2. Make your changes and ensure `npm run build:all` and `npm test` pass.
3. Open a PR against `main` with a clear description of what changed and why.
4. A maintainer will review within a few days.

## Reporting issues

Open a GitHub Issue with:
- NestJS version
- Node.js version
- Minimal reproduction steps
- Expected vs actual behaviour

## License

By contributing you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
