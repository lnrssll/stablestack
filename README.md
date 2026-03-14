# skeleton

Minimal server-rendered TSX app. Hono + hono/jsx for SSR, Tailwind v4, htmx, SQLite via better-sqlite3, dbmate migrations, TypeSQL for typed queries. No React, no client bundle, no user accounts.

## Philosophy

This stack is designed to be **simple, stable, and maintainable over a long time horizon** — the kind of codebase a small team (or a single developer) can keep running for a decade without constant dependency churn or framework rewrites.

**Minimal dependencies.** Every package added is a future maintenance obligation. The goal is to keep the dependency list short and each item individually justifiable. Prefer stdlib, platform APIs, and well-established tools over convenience packages.

**Server-rendered by default.** HTML generated on the server is the most durable, accessible, and debuggable output a web app can produce. It requires no framework knowledge to read, works in any browser, and doesn't require a JS runtime to be useful. htmx handles the cases where a page transition or partial update needs to feel fast — without a client-side framework.

**Familiar syntax, not a framework monoculture.** JSX/TSX is understood by nearly every JavaScript developer and most AI coding agents today. Using hono/jsx means getting that familiar syntax for free — no React runtime, no virtual DOM, no hydration — just functions that return HTML strings. Any developer who has written a React component can read and write these components immediately.

**Raw SQL over abstractions.** SQL has been stable for decades. ORMs and query builders come and go. Writing queries in `.sql` files and using TypeSQL to generate typed wrappers gives the best of both worlds: readable SQL that any developer can understand, with TypeScript types at the call site. If TypeSQL ever goes unmaintained, the generated files continue to work indefinitely.

**Build tooling is a dev concern, not a runtime concern.** Vite handles HMR for server code in development. Tailwind runs as a standalone CLI, independent of Vite, outputting a static CSS file to `public/`. The production output is a plain Node.js file with no Vite or Tailwind dependency at runtime. The build toolchain can be upgraded or replaced without touching any application code.

## Stack

| Layer | Tech |
|---|---|
| Server | Hono on Node.js |
| Templating | hono/jsx (SSR only) |
| Dev server / build | Vite + @hono/vite-dev-server |
| CSS | Tailwind v4 (standalone CLI) |
| Interactivity | htmx (vendored in `public/`) |
| Database | SQLite via better-sqlite3 |
| Migrations | dbmate |
| Typed queries | TypeSQL |
| Auth | Session cookie, admin-only via env vars |

## Setup

```bash
npm install
cp .env .env.local   # then edit credentials
```

**.env vars:**

```
DATABASE_URL=sqlite:./db/app.db
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme
SESSION_SECRET=replace-with-random-32-char-string
PORT=3000
```

The admin account is not stored in the database — credentials come entirely from env vars. No seeding required.

## Development

```bash
npm run dev          # starts Vite + Tailwind watcher concurrently
npm run types:watch  # TypeSQL watcher — run separately, only after db:migrate
```

Open http://localhost:5173 (Vite default) or whatever port Vite prints.

## Database

Requires `dbmate` on your PATH. On Arch Linux:

```bash
sudo pacman -S dbmate
```

```bash
npm run db:migrate       # run pending migrations → creates db/app.db
npm run db:rollback      # roll back last migration
npm run db:new <name>    # scaffold a new migration file
```

Migrations live in `db/migrations/`. dbmate maintains `db/schema.sql` automatically.

**Inspect the database:**

```bash
sqlite3 db/app.db
.tables
.schema
SELECT * FROM some_table;
.quit
```

## Typed SQL queries (TypeSQL)

1. Write a migration, run `npm run db:migrate`
2. Add a `.sql` file to `src/sql/` with a `-- @name` annotation:

```sql
-- @name ListPosts
SELECT id, title, created_at FROM posts ORDER BY created_at DESC;
```

3. Run `npm run types:watch` (or `npx typesql compile` once)
4. TypeSQL emits a typed module to `src/db/queries/` — import and call it:

```ts
import { listPosts } from '@/db/queries/list-posts'
import { db } from '@/db/client'

const posts = listPosts(db)  // fully typed result
```

`src/db/queries/` is generated — do not edit by hand.

## Auth

Admin login is at `/admin/login`. Credentials are read from `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`. On success, a JWT signed with `SESSION_SECRET` is issued as an `HttpOnly`, `SameSite=Strict` cookie (8hr expiry). All `/admin/*` routes are protected by `requireAdmin`, which verifies the token on every request.

There are no user accounts, no registration, and no password reset flow.

## Going to production

### What the scaffolding already handles

- JWT-signed session tokens — `SESSION_SECRET` never leaves the server
- `HttpOnly` + `SameSite=Strict` cookie flags
- `secure: true` on the session cookie in production mode

### What you must do before deploying

**1. Set strong secrets.** Generate a random `SESSION_SECRET` and choose a strong, unique `ADMIN_PASSWORD`. Never reuse dev values.

```bash
openssl rand -hex 32   # use this as SESSION_SECRET
```

Set these in your production environment (not in a committed `.env` file):

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong unique password>
SESSION_SECRET=<openssl output>
DATABASE_URL=sqlite:./db/app.db
PORT=3000
```

**2. Terminate HTTPS before the Node process.** The session cookie has `secure: true` in production, which means browsers will not send it over plain HTTP — login will silently break without HTTPS. Use a reverse proxy to handle TLS. Caddy is the easiest option since it provisions certificates automatically:

```
# Caddyfile
example.com {
    reverse_proxy localhost:3000
}
```

**3. Keep the process alive.** Node exits on unhandled errors. Use a process manager:

```bash
# PM2
npm install -g pm2
pm2 start dist/index.js --name myapp
pm2 save && pm2 startup   # auto-restart on reboot
```

Or write a systemd unit pointing to `node /path/to/dist/index.js`.

### Build and run

```bash
npm run db:migrate  # run pending migrations against production DB
npm run build       # typesql compile + tailwind build + vite build → dist/index.js + public/style.css
npm start           # node dist/index.js
```

## Project structure

```
db/
  migrations/        # dbmate migration files
  schema.sql         # auto-maintained by dbmate
src/
  index.tsx          # app entry point
  global.d.ts        # ContextRenderer type augmentation
  middleware/
    renderer.tsx     # jsxRenderer shell (doctype, head, Tailwind, htmx)
    auth.ts          # requireAdmin middleware + session helpers
  routes/
    public.tsx       # GET /
    admin/
      index.tsx      # GET /admin (protected)
      login.tsx      # GET+POST /admin/login
  db/
    client.ts        # better-sqlite3 singleton
    queries/         # TypeSQL-generated (do not edit)
  sql/               # hand-written .sql query files (TypeSQL input)
  components/        # shared TSX components
public/              # static assets
typesql.json
vite.config.ts
tsconfig.json
.env
```
