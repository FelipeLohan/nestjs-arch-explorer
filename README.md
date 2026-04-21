# nestjs-arch-explorer

[![npm version](https://img.shields.io/npm/v/nestjs-arch-explorer?color=6366f1&label=npm)](https://www.npmjs.com/package/nestjs-arch-explorer)
[![CI](https://github.com/FelipeLohan/nestjs-arch-explorer/actions/workflows/ci.yml/badge.svg)](https://github.com/FelipeLohan/nestjs-arch-explorer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-10b981.svg)](LICENSE)

Plug-and-play NestJS library that inspects the Dependency Injection container **at runtime** and displays an interactive architecture graph dashboard — zero extra decorators required.

> Add one import. Open `/architecture`. See your whole app.

---

## Features

- Auto-discovers all **Modules**, **Controllers**, and **Providers** via `DiscoveryService`
- Interactive graph rendered with [Cytoscape.js](https://js.cytoscape.org/) + dagre layout
- Click any node to inspect its type, scope, and injected dependencies
- Configurable route paths and custom security guard
- One flag to disable in production: `enabled: false`
- Zero decorators required in application code

---

## Installation

```bash
npm install nestjs-arch-explorer
```

## Quick start

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ExplorerModule } from 'nestjs-arch-explorer';

@Module({
  imports: [
    ExplorerModule.forRoot({
      enabled: process.env.NODE_ENV !== 'production',
    }),
  ],
})
export class AppModule {}
```

Start your app and open **`http://localhost:3000/architecture`**.

---

## Configuration

```typescript
ExplorerModule.forRoot({
  enabled?:      boolean;       // default: true
  apiPath?:      string;        // default: 'explorer-data'
  dashboardPath?: string;       // default: 'architecture'
  guardFn?:      () => boolean; // optional security hook
})
```

### Example — custom paths + guard

```typescript
ExplorerModule.forRoot({
  apiPath:       'internal/arch-data',
  dashboardPath: 'internal/arch',
  guardFn:       () => process.env.NODE_ENV === 'development',
})
```

---

## API

| Method | Path (default)   | Description                             |
|--------|------------------|-----------------------------------------|
| `GET`  | `/explorer-data` | Returns full `ArchitectureMap` as JSON  |
| `GET`  | `/architecture`  | Serves the interactive graph dashboard  |

### `ArchitectureMap` shape

```typescript
interface ArchitectureMap {
  modules:     ModuleNode[];
  controllers: ComponentNode[];
  providers:   ComponentNode[];
}

interface ModuleNode {
  name:        string;
  controllers: string[];
  providers:   string[];
}

interface ComponentNode {
  name:         string;
  type:         'controller' | 'provider';
  scope:        'DEFAULT' | 'TRANSIENT' | 'REQUEST';
  dependencies: string[];
}
```

---

## How it works

On `onModuleInit`, `ArchitectureScanner` uses NestJS's built-in `DiscoveryService` and `ModulesContainer` to:

1. Enumerate all registered modules, controllers, and providers
2. Filter out NestJS framework internals
3. Resolve constructor parameter types via `Reflect.getMetadata('design:paramtypes', ...)`
4. Build an `ArchitectureMap` exposed at `/explorer-data`

The dashboard at `/architecture` fetches that JSON and renders an interactive Cytoscape.js graph:

| Node colour | Represents  |
|-------------|-------------|
| Indigo      | Module      |
| Emerald     | Controller  |
| Amber       | Provider    |
| Orange dash | `injects` dependency edge |

---

## Peer dependencies

- `@nestjs/common` ^10 or ^11
- `@nestjs/core` ^10 or ^11
- `@nestjs/platform-express` ^10 or ^11
- `reflect-metadata` ^0.1 or ^0.2
- `rxjs` ^7

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, development workflow, and PR guidelines.

---

## License

[MIT](LICENSE) © FelipeLohan
