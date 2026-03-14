# Agent briefing

This is a server-rendered TSX app. Read this file before touching the codebase — it covers the stack, conventions, and the full workflow for common tasks.

## Stack at a glance

| Concern | What's used | Where |
|---|---|---|
| Server | Hono on Node.js | `src/index.tsx` |
| Templating | hono/jsx (SSR only — not React) | `src/middleware/renderer.tsx`, all `.tsx` route files |
| Dev server | Vite + `@hono/vite-dev-server` | `vite.config.ts` |
| CSS | Tailwind v4 (standalone CLI) | `src/style.css` → outputs `public/style.css`, served at `/style.css` |
| Interactivity | htmx (vendored) | `public/htmx.min.js`, served at `/htmx.min.js` |
| Database | SQLite via `better-sqlite3` | `src/db/client.ts` |
| Migrations | dbmate | `db/migrations/` |
| Typed queries | Hand-written wrappers over `better-sqlite3` | `src/db/sql.ts` (SQL strings) + `src/db/queries.ts` (typed functions) |
| Auth | JWT session cookie, admin-only | `src/middleware/auth.ts` |
| Env vars | `dotenv` | loaded in `vite.config.ts` (dev) and `src/index.tsx` (prod) |

## Philosophy and design constraints

This codebase is built for **longevity and maintainability over convenience**. Before making any change, understand these constraints — they should actively influence every decision you make.

**Keep the dependency count low.** Every package added is a future maintenance burden. Before reaching for a new package, ask: can this be done with what's already installed, with Node stdlib, or with a few lines of code? If yes, do that. The value of a thin dependency list compounds over time.

**No client-side frameworks or state management.** The rendering model is server-rendered HTML + htmx for partial updates. Do not introduce React, Vue, Svelte, Zustand, or any client-side state. If a feature feels like it needs a client-side framework, that's usually a signal to redesign the feature, not to add the framework.

**Keep SQL raw.** Queries live in `src/sql/` as plain `.sql` files. Do not introduce an ORM (Prisma, Drizzle, Kysely, etc.). The existing approach — raw SQL typed by TypeSQL — is intentional. SQL is more stable than any ORM's API, and `.sql` files are readable by anyone.

**Vite and Tailwind are dev/build tools only.** The production artifact (`dist/index.js`) has no dependency on either. Tailwind runs as a standalone CLI (`npm run css:watch` / `npm run css:build`) completely independently of Vite — do not re-couple them. Do not import anything from `vite` or `tailwindcss` in application code.

**Optimize for readability by the next person.** This codebase may be read by a developer (or agent) who wasn't involved in building it, years from now. Prefer obvious, explicit code over clever abstractions. Don't introduce patterns that require framework-specific knowledge to understand.

## Critical: hono/jsx is not React

`.tsx` files use Hono's JSX runtime, not React. This means:

- **No hooks.** `useState`, `useEffect`, `useRef`, etc. do not exist. Components are pure functions that return JSX strings.
- **No client-side rendering.** Everything renders on the server to an HTML string. There is no virtual DOM, no reconciliation, no hydration.
- **Use `class` not `className`.** Hono/jsx uses the HTML attribute name directly.
- **The JSX factory is configured globally** via `jsxImportSource: "hono/jsx"` in `tsconfig.json`. No per-file pragma needed.
- **Event handlers in JSX are fine for form submissions** (they become HTML attributes), but there is no JS runtime to back them up. Use htmx for dynamic behavior.

## Project layout

```
src/
  index.tsx          # app entry — mounts middleware, registers routes, starts server in prod
  global.d.ts        # ContextRenderer type augmentation (do not edit)
  middleware/
    renderer.tsx     # jsxRenderer shell: doctype, <head>, Tailwind, htmx script
    auth.ts          # requireAdmin middleware, setAdminSession, clearAdminSession
  routes/
    public.tsx       # public routes (no auth)
    admin/
      index.tsx      # protected admin routes
      login.tsx      # login/logout
  db/
    client.ts        # better-sqlite3 singleton (exports `db`)
    sql.ts           # raw SQL string constants
    queries.ts       # typed wrapper functions
  components/        # shared TSX components
db/
  migrations/        # dbmate migration files (<timestamp>_<name>.sql)
  schema.sql         # auto-maintained by dbmate — do not edit
```

## Rendering patterns

**Full page response** (sets HTML shell via renderer middleware):
```tsx
app.get('/example', (c) => {
  return c.render(<MyPage />, { title: 'Example' })
})
```

**htmx partial response** (returns a fragment, skips the shell):
```tsx
app.get('/example', (c) => {
  const isHtmx = c.req.header('HX-Request')
  const fragment = <MyComponent />
  if (isHtmx) return c.html(fragment)
  return c.render(fragment, { title: 'Example' })
})
```

## Adding a route

1. Create or edit a file in `src/routes/`.
2. Register it in `src/index.tsx`:
   ```ts
   import myRoutes from './routes/my-routes'
   app.route('/my-path', myRoutes)
   ```
3. For protected admin routes, apply `requireAdmin` at the top of the router:
   ```ts
   app.use('*', requireAdmin)
   ```

## Adding a data model

This is a two-step workflow: migrate → add query + type.

**Step 1 — write the migration:**
```bash
npm run db:new <name>    # e.g. npm run db:new create_posts_table
```
Edit the generated file in `db/migrations/`. Structure:
```sql
-- migrate:up
CREATE TABLE posts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- migrate:down
DROP TABLE posts;
```
Run it:
```bash
npm run db:migrate
```

**Step 2 — add SQL strings and typed wrapper functions:**

Add the raw SQL to `src/db/sql.ts`:
```ts
export const LIST_POSTS = `
  SELECT id, title, created_at FROM posts ORDER BY created_at DESC
`
export const INSERT_POST = `
  INSERT INTO posts (title, body) VALUES (?, ?)
`
```

Add typed wrapper functions to `src/db/queries.ts`:
```ts
import { db } from './client'
import { LIST_POSTS, INSERT_POST } from './sql'

export type Post = { id: number; title: string; body: string; created_at: number }

export function listPosts(): Post[] {
  return db.prepare(LIST_POSTS).all() as Post[]
}

export function insertPost(title: string, body: string): number {
  return Number(db.prepare(INSERT_POST).run(title, body).lastInsertRowid)
}
```

**Step 3 — use the functions in a route:**
```ts
import { listPosts } from '../db/queries'

const posts = listPosts()  // fully typed result
```

The `@/` alias maps to `src/`.

## Auth

`requireAdmin` reads a JWT from the session cookie and redirects to `/admin/login` if absent or invalid. The token is signed with `SESSION_SECRET` from env.

To protect a route or router:
```ts
import { requireAdmin } from '@/middleware/auth'

// whole router:
app.use('*', requireAdmin)

// single route:
app.get('/sensitive', requireAdmin, (c) => { ... })
```

Do not try to read user identity from the session — there is only one admin, no user table.

## Environment variables

Loaded automatically from `.env` in development. Expected vars:

| Var | Purpose |
|---|---|
| `DATABASE_URL` | SQLite path, e.g. `sqlite:./db/app.db` |
| `ADMIN_USERNAME` | Admin login username |
| `ADMIN_PASSWORD` | Admin login password |
| `SESSION_SECRET` | JWT signing key — must be a strong random string in production |
| `PORT` | Server port (default 3000) |

Access via `process.env.VAR_NAME` in server code.

## Dev commands

```bash
npm run dev            # starts Vite + Tailwind watcher concurrently
npm run db:migrate     # run pending migrations
npm run db:rollback    # roll back last migration
npm run db:new <name>  # scaffold a new migration file
```

## What not to do

- **Do not add React, ReactDOM, or any React-specific packages.** The JSX runtime is hono/jsx.
- **Do not edit `src/db/queries/`.** These are generated. Edit `src/sql/` and recompile.
- **Do not edit `db/schema.sql`.** dbmate maintains it.
- **Do not write client-side JS bundles.** Use htmx attributes for dynamic behavior. If a small client-side script is truly necessary, inline it in the renderer or a layout component — do not add a build step for it.
- **Do not import `import.meta.env` variables for runtime secrets.** Vite only exposes `VITE_`-prefixed vars there. Use `process.env` instead (dotenv handles loading).
- **Do not add packages without justification.** Check whether the stdlib, an existing dependency, or a few lines of code can do the job first. The dependency list is intentionally short.
- **Do not introduce abstractions for single uses.** A helper that's only called once is just indirection. Write the code inline and extract only when there's a genuine second use case.
