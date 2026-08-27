# CollabForge Web

Angular frontend for **CollabForge**, a real-time collaborative board application. It handles authentication, dashboards, kanban-style boards, and invite acceptance, and talks to the [`collabforge-api`](https://github.com/HenrySanguna/collabforge-api) backend over REST and WebSocket (Socket.IO) for live updates.

## Tech stack

- **Angular 20** (standalone components, signals, `@if`/`@for` control flow)
- **Tailwind CSS 4** for layout/spacing
- **Socket.IO client** for real-time board updates
- **pnpm** as package manager
- **Cloudflare Workers** for deployment (via `wrangler`)

## Prerequisites

- Node.js 22
- pnpm 10.18.0 (see `packageManager` in `package.json`)
- A running instance of [`collabforge-api`](https://github.com/HenrySanguna/collabforge-api) (local or remote)

## Getting started

Install dependencies:

```bash
pnpm install
```

Start the local development server:

```bash
pnpm start
```

The app runs at `http://localhost:4200/` and reloads on file changes.

By default, the local environment (`src/environments/environment.ts`) points to `http://localhost:3000/api` and `http://localhost:3000` for REST and WebSocket traffic. Adjust these values if your local API runs elsewhere.

## Project structure

```
src/app/
  core/          # singleton services: auth, boards, realtime, config, error, theme
  features/      # routed features: auth, dashboard, board, invite
  layout/        # app shell/layout components
  shared/        # reusable directives, pipes, UI components
```

Routing is defined in `src/app/app.routes.ts`, with lazy-loaded auth routes and lazy-loaded standalone pages for dashboard, board, and invite acceptance.

## Available scripts

| Command               | Description                                   |
| ---------------------- | ---------------------------------------------- |
| `pnpm start`            | Run the dev server (`ng serve`)                |
| `pnpm build`            | Production build to `dist/`                    |
| `pnpm watch`            | Development build in watch mode                |
| `pnpm test`             | Run unit tests (Karma/Jasmine)                  |
| `pnpm run test:ci`      | Run unit tests headless with coverage           |
| `pnpm run lint`         | Lint the codebase (`ng lint`)                   |
| `pnpm run format`       | Format `.ts`/`.html` files with Prettier        |
| `pnpm run format:check` | Check formatting without writing changes        |

## Environments

Three environment files are provided under `src/environments/`:

- `environment.ts` — local development (`localhost:3000`)
- `environment.staging.ts` — staging API
- `environment.production.ts` — production API

Each defines `apiUrl` (REST) and `wsUrl` (WebSocket) for the corresponding `collabforge-api` deployment.

## Deployment

The app is deployed to Cloudflare Workers via `wrangler.jsonc`. The build configuration (`staging` or `production`) is selected based on the CI branch (see `.github/workflows/ci.yml` and the `build.command` in `wrangler.jsonc`).

## Related repositories

- [`collabforge-api`](https://github.com/HenrySanguna/collabforge-api) — backend API and source of the `@collabforge/contracts` package consumed by this project.

## License

This repository is **private and unlicensed** (`"private": true` in `package.json`, no `LICENSE` file present). All rights reserved; no open-source license is granted for use, modification, or redistribution unless explicitly stated otherwise by the repository owner.

Third-party dependencies (Angular, RxJS, Socket.IO, Tailwind CSS, etc.) retain their own licenses (mostly MIT) — see each package's entry in `node_modules` or its npm registry page for details.
