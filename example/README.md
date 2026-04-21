# nestjs-arch-explorer — Example App

A minimal NestJS application demonstrating [nestjs-arch-explorer](https://github.com/FelipeLohan/nestjs-arch-explorer).

## Modules

- **UsersModule** — `UsersController`, `UsersService`
- **OrdersModule** — `OrdersController`, `OrdersService` (injects `UsersService`)

## Running

```bash
npm install
npm run start:dev
```

Open:
- `http://localhost:3000/users` — REST endpoint
- `http://localhost:3000/orders` — REST endpoint
- **`http://localhost:3000/architecture`** — interactive architecture graph
