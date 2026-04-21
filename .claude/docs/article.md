# How I Built a Visual Architecture Explorer for NestJS

> *Published on Dev.to and Medium — tags: #nestjs #typescript #opensource #webdev*

---

Every NestJS project I've worked on eventually reaches the same inflection point: the codebase is large enough that you can't hold the module graph in your head anymore. You want to answer a simple question — *"which service injects which?"* — and instead you spend twenty minutes grepping through decorators.

I built **nestjs-arch-explorer** to solve exactly that. One import, zero decorators, and your entire dependency graph becomes an interactive visual at `/architecture`.

---

## The Problem

NestJS has a beautiful module system. Each `@Module` declares its `imports`, `providers`, `controllers`, and `exports`. But this information lives scattered across dozens of files. As the codebase grows, tracking cross-module dependencies becomes genuinely hard:

- Which modules depend on `AuthService`?
- Is `UsersService` being re-exported correctly through `CoreModule`?
- Why is there a circular dependency error on startup?

Documentation gets stale. Architecture diagrams drift from reality. A tool that *reads the live container* and generates the graph from ground truth is the only reliable answer.

---

## The Idea

NestJS already knows everything about your dependency graph. It built the DI container — it has every module, provider, controller, and their relationships in memory. The only question is: how do you get that data out?

The answer is `DiscoveryService` and `ModulesContainer` from `@nestjs/core`.

---

## Building the Scanner

The core of the library is `ArchitectureScanner`, an `@Injectable()` that implements `OnModuleInit`:

```typescript
@Injectable()
export class ArchitectureScanner implements OnModuleInit {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly moduleRef: ModuleRef,
  ) {}

  onModuleInit(): void {
    const controllers = this.discovery.getControllers()
      .filter(w => this.isUserDefined(w))
      .map(w => this.buildComponentNode(w, 'controller'));

    const providers = this.discovery.getProviders()
      .filter(w => this.isUserDefined(w))
      .map(w => this.buildComponentNode(w, 'provider'));

    const modules = this.buildModuleNodes();

    this.map = { modules, controllers, providers };
  }
}
```

`onModuleInit` runs once — after all modules are fully initialized, before the app starts serving requests. This is the perfect moment: the DI container is complete and stable.

### Extracting dependencies

For each class, I read constructor parameter types using `reflect-metadata`:

```typescript
const paramTypes: Function[] =
  Reflect.getMetadata('design:paramtypes', metatype) ?? [];

const dependencies = paramTypes
  .filter(dep => dep && dep.name && dep.name !== 'Object')
  .map(dep => dep.name);
```

This works because TypeScript (with `emitDecoratorMetadata: true`) emits the constructor parameter types as metadata at compile time.

### Filtering out NestJS internals

`DiscoveryService` returns *everything* in the container — including NestJS's own internal providers. I maintain a blocklist of known internal class names and token prefixes:

```typescript
const INTERNAL_NAMES = new Set([
  'ModuleRef', 'MetadataScanner', 'DiscoveryService',
  'Reflector', 'HttpAdapterHost', /* ... */
]);

private isUserDefined(wrapper: InstanceWrapper): boolean {
  const name = wrapper.metatype?.name ?? '';
  return name && !INTERNAL_NAMES.has(name) && !name.startsWith('__');
}
```

### Reading the module structure

To know *which* providers and controllers belong to *which* module, I go through `ModulesContainer`:

```typescript
const modulesContainer = this.moduleRef.get(ModulesContainer, { strict: false });

for (const [, mod] of modulesContainer) {
  const controllers = [...mod.controllers.values()]
    .filter(w => this.isUserDefined(w))
    .map(w => w.metatype.name);

  nodes.push({ name: mod.metatype.name, controllers, providers });
}
```

`{ strict: false }` is the key — it escapes the current module scope and retrieves the singleton instance from the root container.

---

## The API Layer

Once the scanner has the data, exposing it is trivial. The `ExplorerModule.forRoot()` dynamic module registers two controllers:

```typescript
static forRoot(options: ExplorerModuleOptions = {}): DynamicModule {
  const ExplorerController = createExplorerController(options.apiPath ?? 'explorer-data');
  const DashboardController = createDashboardController(options.dashboardPath ?? 'architecture');

  return {
    module: ExplorerModule,
    imports: [DiscoveryModule],
    controllers: [ExplorerController, DashboardController],
    providers: [optionsProvider, ArchitectureScanner],
  };
}
```

I used controller factory functions (`createExplorerController(path)`) because NestJS decorators are evaluated at class definition time — you can't change `@Controller('path')` dynamically after the class is defined. A factory that returns a fresh class with the right decorator solves this cleanly:

```typescript
export function createExplorerController(apiPath: string) {
  @Controller(apiPath)
  class ExplorerController {
    @Get()
    getExplorerData() { return this.scanner.getArchitectureMap(); }
  }
  return ExplorerController;
}
```

---

## The Dashboard

The frontend is a React + Vite app bundled into the library's `dist/public/` directory at build time. It fetches `/explorer-data` and renders an interactive graph using **Cytoscape.js** with the **dagre** layout engine.

```typescript
const cy = cytoscape({
  elements: buildElements(map),   // nodes + edges from ArchitectureMap
  layout: { name: 'dagre', rankDir: 'TB', nodeSep: 60, rankSep: 80 },
  style: [ /* color-coded by kind */ ],
});
```

Nodes are colored by type (indigo = module, emerald = controller, amber = provider). Edges are solid for "contains" relationships and dashed orange for "injects" dependencies. Clicking a node opens a detail panel showing scope, type, and injected dependencies.

### Serving the frontend from the library

The `DashboardController` uses `__dirname`-relative paths to locate the bundled assets:

```typescript
const PUBLIC_DIR = join(__dirname, '..', 'public');

@Get()
serveIndex(@Res() res: Response) {
  res.sendFile(join(PUBLIC_DIR, 'index.html'));
}

@Get('*path')
serveAsset(@Req() req: Request, @Res() res: Response) {
  const assetPath = req.path.slice(`/${dashboardPath}/`.length);
  res.sendFile(join(PUBLIC_DIR, normalize(assetPath)), err => {
    if (err) res.status(404).end();
  });
}
```

When the library is installed in a user's project, `__dirname` resolves to `node_modules/nestjs-arch-explorer/dist/explorer/`, so `../public` points to `node_modules/nestjs-arch-explorer/dist/public/` — exactly where the bundled frontend lives. No configuration needed.

---

## Packaging as a Library

The build pipeline has three steps:

```bash
npm run build:client   # Vite → client/dist/
npm run build          # nest build → dist/
npm run build:copy     # cp -r client/dist dist/public
```

The `package.json` exposes:

```json
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist/", "README.md"]
}
```

Users get the compiled TypeScript, type declarations, and the bundled frontend in a single package. No peer runtime dependencies other than the NestJS core packages they already have.

---

## Usage

```bash
npm install nestjs-arch-explorer
```

```typescript
@Module({
  imports: [
    ExplorerModule.forRoot({
      enabled: process.env.NODE_ENV !== 'production',
    }),
  ],
})
export class AppModule {}
```

Open `http://localhost:3000/architecture`. That's it.

---

## What I Learned

**1. `onModuleInit` is the right hook.** It runs after the full DI graph is resolved, so every provider is available. Trying to read the container earlier (in the constructor) gives you an incomplete picture.

**2. `{ strict: false }` unlocks the root container.** Without it, `ModuleRef.get()` is scoped to the current module. With it, you can retrieve any singleton from anywhere — including NestJS internals like `ModulesContainer`.

**3. Factory functions are the right pattern for dynamic routes.** NestJS decorators are metadata applied at class definition. To configure a route path at runtime, you need a fresh class per configuration. The factory pattern keeps it clean.

**4. Bundling a frontend into an npm package is underused.** Shipping the dashboard HTML/JS inside `dist/public/` and serving it via `res.sendFile(__dirname + '/../public/...')` is a self-contained approach that requires zero setup from the user.

---

## What's Next

- Watch mode: re-scan when source files change
- Export to Mermaid / DOT formats
- Filter panel to hide modules by name
- Support for Fastify adapter

---

## Links

- **npm**: https://www.npmjs.com/package/nestjs-arch-explorer
- **GitHub**: https://github.com/FelipeLohan/nestjs-arch-explorer
- **Example app**: https://github.com/FelipeLohan/nestjs-arch-explorer-example
