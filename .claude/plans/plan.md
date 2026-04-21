# nestjs-arch-explorer — Plano de Execução para Claude Code

> Documento de referência para desenvolvimento assistido por IA. Cada etapa contém contexto, tarefas atômicas e critérios de aceitação claros.

---

## Visão Geral

Biblioteca NPM plug-and-play para NestJS que inspeciona o contêiner de Injeção de Dependências (DI) em tempo de execução e exibe um dashboard visual interativo com o grafo de dependências entre Módulos, Controllers e Providers.

---

## Etapa 1 — Motor de Introspecção (Backend Core)

**Objetivo:** Extrair e estruturar os metadados da aplicação NestJS do usuário.

### Tarefas

- [ ] Criar projeto NestJS do zero para servir como sandbox de desenvolvimento
- [ ] Criar o módulo `ExplorerModule` dentro do projeto
- [ ] Importar `DiscoveryModule` e injetar `DiscoveryService` do pacote `@nestjs/core`
- [ ] Criar `ArchitectureScanner` — um `@Injectable()` que implementa `OnModuleInit`
  - No método `onModuleInit()`, chamar `discoveryService.getControllers()` e `discoveryService.getProviders()`
  - Filtrar metadados internos do NestJS (prefixo `__` nos tokens, providers do próprio framework)
  - Extrair as dependências injetadas no construtor de cada classe via `Reflect.getMetadata('design:paramtypes', target)`
- [ ] Produzir um objeto JSON estruturado com o seguinte shape:

```typescript
interface ArchitectureMap {
  modules: ModuleNode[];
  controllers: ComponentNode[];
  providers: ComponentNode[];
}

interface ModuleNode {
  name: string;
  controllers: string[];
  providers: string[];
}

interface ComponentNode {
  name: string;
  type: 'controller' | 'provider';
  scope: string;
  dependencies: string[];
}
```

### Critérios de Aceitação

- O `console.log` do JSON no `onModuleInit` deve listar apenas as classes da aplicação sandbox, sem ruído de internals do NestJS.
- A varredura deve ocorrer **uma única vez** no bootstrap, não em cada requisição.

---

## Etapa 2 — Endpoints da API Interna

**Objetivo:** Expor os dados coletados via HTTP para o frontend consumir.

### Tarefas

- [ ] Criar `ExplorerController` dentro do `ExplorerModule`
- [ ] Implementar `GET /explorer-data` que retorna o `ArchitectureMap` em JSON
- [ ] Implementar `GET /architecture` (ou rota configurável via `forRoot()`) para servir o HTML do dashboard
- [ ] Criar `ExplorerModule.forRoot(options?)` como `DynamicModule` com opções:

```typescript
interface ExplorerModuleOptions {
  dashboardPath?: string;   // default: '/architecture'
  apiPath?: string;         // default: '/explorer-data'
  enabled?: boolean;        // default: true (desativar em produção)
  guardFn?: () => boolean;  // hook customizável de segurança
}
```

### Critérios de Aceitação

- `GET /explorer-data` retorna status 200 com o JSON estruturado.
- Quando `enabled: false`, nenhuma rota é registrada.

---

## Etapa 3 — Dashboard (Frontend)

**Objetivo:** Criar a interface visual que consome a API e renderiza o grafo interativo.

### Tarefas

- [ ] Criar projeto frontend separado (React + Vite ou Vanilla TS)
- [ ] Instalar e configurar `cytoscape` + layout `cytoscape-dagre`
- [ ] Ao carregar, buscar `GET /explorer-data` e transformar o `ArchitectureMap` em nós e arestas do Cytoscape:
  - Nós: cada módulo, controller e provider
  - Arestas: cada dependência injetada
- [ ] Estilizar nós por tipo com cores distintas (módulo / controller / provider)
- [ ] Implementar painel lateral de detalhes ao clicar em um nó:
  - Nome da classe
  - Tipo (controller / provider / module)
  - Escopo (singleton, request, transient)
  - Lista de dependências injetadas
- [ ] Adicionar controles de zoom e fit-to-screen
- [ ] Gerar build de produção (`npm run build`) com saída em `dist/`
- [ ] Garantir que `index.html`, `*.js` e `*.css` estão minificados

### Critérios de Aceitação

- O grafo renderiza todos os nós e arestas sem erros no console.
- Clicar em um nó exibe o painel lateral com as informações corretas.
- O build de produção tem tamanho total abaixo de **500 KB** (gzip).

---

## Etapa 4 — Integração e Empacotamento como Biblioteca NPM

**Objetivo:** Unir backend e frontend em uma única biblioteca publicável.

### Tarefas

- [ ] Transformar o módulo NestJS em biblioteca com `nest generate library explorer` ou configuração manual de `tsconfig.lib.json`
- [ ] Copiar os arquivos do build de produção do frontend para `lib/public/` dentro da biblioteca
- [ ] Configurar `@nestjs/serve-static` (ou `res.sendFile` manual) para servir `index.html` e assets na rota do dashboard
- [ ] Configurar `package.json` da biblioteca:

```json
{
  "name": "nestjs-arch-explorer",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist/", "README.md"],
  "peerDependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0"
  }
}
```

- [ ] Exportar `ExplorerModule` e `ExplorerModuleOptions` do `index.ts` público
- [ ] Escrever `README.md` com instruções de instalação e uso mínimo:

```typescript
// app.module.ts
import { ExplorerModule } from 'nestjs-arch-explorer';

@Module({
  imports: [
    ExplorerModule.forRoot({ enabled: process.env.NODE_ENV !== 'production' }),
  ],
})
export class AppModule {}
```

- [ ] Rodar `npm pack` e testar instalação local em projeto separado
- [ ] Publicar no NPM com `npm publish --access public`

### Critérios de Aceitação

- `npm install nestjs-arch-explorer` funciona em um projeto NestJS limpo.
- Acessar `/architecture` no browser exibe o dashboard com o grafo da aplicação instalada.
- Nenhum decorator extra é necessário no código do usuário.

---

## Etapa 5 — Lançamento para a Comunidade

**Objetivo:** Tornar a biblioteca descobrível e atrair primeiros usuários.

### Tarefas

- [ ] Criar repositório `nestjs-arch-explorer` no GitHub com:
  - `README.md` com GIF/screenshot do dashboard
  - `CONTRIBUTING.md`
  - GitHub Actions para CI (lint + build + test)
  - Badge de versão NPM no README
- [ ] Criar repositório separado `nestjs-arch-explorer-example` com app de demonstração pronta para clonar
- [ ] Escrever artigo técnico em inglês: *"How I built a visual architecture explorer for NestJS"*
  - Publicar no Dev.to
  - Publicar no Medium
- [ ] Compartilhar nos canais:
  - Discord oficial do NestJS (`#show-and-tell`)
  - Reddit `r/nestjs`
  - Twitter/X com hashtags `#NestJS #typescript #opensource`

### Critérios de Aceitação

- O repositório de exemplo pode ser clonado e iniciado com `npm install && npm run start:dev`.
- O artigo cobre: problema, solução, arquitetura da lib, e como usar.

---

## Requisitos Não Funcionais — Checklist

| # | Requisito | Como Validar |
|---|-----------|--------------|
| RNF01 | Varredura ocorre apenas no `onModuleInit` | Log com timestamp + teste de carga |
| RNF02 | Zero decorators extras no código do usuário | Instalar em projeto limpo sem modificações |
| RNF03 | Dashboard desativável via `enabled: false` | Testar com `NODE_ENV=production` |
| RNF04 | Bundle frontend < 500 KB gzip | `npx bundlesize` ou análise do Vite |

---

## Dependências Técnicas

| Pacote | Uso |
|--------|-----|
| `@nestjs/core` | `DiscoveryService`, `DiscoveryModule` |
| `@nestjs/serve-static` | Servir arquivos do frontend |
| `cytoscape` | Renderização do grafo |
| `cytoscape-dagre` | Layout hierárquico do grafo |
| `vite` ou `webpack` | Build do frontend |
| `reflect-metadata` | Leitura de `design:paramtypes` |

---

## Ordem de Execução Recomendada

```
Etapa 1 → Etapa 2 → Validar JSON no browser → Etapa 3 → Etapa 4 → Etapa 5
```

> Não avance para a próxima etapa sem validar os critérios de aceitação da etapa atual.