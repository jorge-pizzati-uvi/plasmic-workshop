# Plasmic workshop

Minimal Next.js 15.5 (App Router, Turbopack) host for the Plasmic workshop. Contains only the Plasmic integration: loaders, page rendering, Studio host, draft preview, publish webhook, and standalone code components.

## Setup

```bash
yarn
cp .env.example .env.local   # fill NEXT_PUBLIC_PLASMIC_PROJECT_ID + NEXT_PUBLIC_PLASMIC_PUBLIC_TOKEN
yarn dev                     # http://localhost:3000
```

`NEXT_PUBLIC_*` values are inlined at build time: change them → restart `yarn dev` / rebuild.

Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `format`.

## How a page renders

1. Every URL hits the catch-all route (`app/[[...slug]]`).
2. The path is checked against the cached list of published Plasmic pages (draft mode skips this gate).
3. The page bundle is fetched with the server loader, its `$q` data queries are executed server-side, and both are cached per path with tags.
4. A client component renders the page with `PlasmicRootProvider` + `PlasmicComponent`, seeded with the prefetched bundle and query data.
5. Unknown paths → 404.

## Studio configuration

| Setting | Value |
|---|---|
| App host (Project settings → Code components) | `https://<host>/plasmic-host` |
| Preview URL (per page or project) | `https://<host>/api/draft?url=/<page-path>&secret=<NEXT_PREVIEW_SECRET>` |
| Publish webhook (Publish → Call webhooks) | `POST https://<host>/api/revalidate-plasmic/?secret=<NEXT_CACHE_REVALIDATE_SECRET>` |

Locally use `http://localhost:3000` as `<host>`. Secrets are optional locally (unset = no check).

## Code components

Registered in `lib/plasmic/host-registrations.ts` on both client loaders (published + preview); components live in `components/plasmic/<name>/`. Registered today: StickyWrapper, SliderCarousel, Tabs (container/button/content/underline), Selection (provider/item), TooltipWrapper, CustomScrollbar, ModalWrapper, Accordion (container/button/content), Form (container, field, text, select, checkbox, radio group, checkbox group, combobox, date picker).

Rules:
- Components are `'use client'` and must not import server-only modules.
- Never rename a registration `name`: published pages resolve components by name.
- Changing registered props shows a diff modal in Studio for everyone on the project; coordinate before pushing.

### Adding one

1. Create `components/plasmic/<name>/<name>.tsx` + `index.ts`.
2. Add `loader.registerComponent(...)` in `host-registrations.ts` (name, importPath, props).
3. Reload the Studio project; the component appears in the Insert panel.

## Server data (`$q` queries)

Pattern: a function registered with `isQuery: true` on both the server loaders (`server-registrations.ts`) and the client loaders (`host-registrations.ts`). On the server it fetches upstream directly with cache tags; in the browser (Studio canvas, client navigation) it calls a BFF route under `app/api/`. Demo: `getPosts` → `lib/plasmic/data/posts.ts` + `app/api/posts`. In Studio: page → Data queries → Custom function → *Get posts (demo)*, then bind `$q.<name>.data`.

## Draft preview

Studio's Preview button opens `/api/draft?url=…&secret=…`, which enables Next draft mode (cookie) and redirects. While on, pages use the preview loader (unpublished revisions) with no cache and show a banner; *Exit* calls `/api/disable-draft`.

## Cache invalidation

Pages are cached with tags `plasmic-pages` (all), `plasmic-manifest` (page list), `plasmic-data` (query data), `posts-data`, and `<path>`.

- Publish webhook → purges `plasmic-pages` (everything). Add `&scope=pages` to purge only `pagesChanged` + the manifest.
- Manual: `GET /api/revalidate-cache?tag=plasmic-data&secret=…` (refresh query data without publishing), or `tag=/some/path` for one page.

```bash
curl -X POST "http://localhost:3000/api/revalidate-plasmic/?secret=$S" -H 'content-type: application/json' -d '{"pagesChanged":["/"]}'
curl "http://localhost:3000/api/revalidate-cache?tag=plasmic-data&secret=$S"
curl "http://localhost:3000/api/posts?limit=3"
```

## Deploy (Vercel)

Live: **https://plasmic-workshop.vercel.app** (Vercel team `uvi3`, project `plasmic-workshop`). Studio host: `https://plasmic-workshop.vercel.app/plasmic-host`. Secrets live in the Vercel project env (Production).

```bash
npx vercel login
npx vercel link            # new project: plasmic-workshop
npx vercel env add NEXT_PUBLIC_PLASMIC_PROJECT_ID production
npx vercel env add NEXT_PUBLIC_PLASMIC_PUBLIC_TOKEN production
npx vercel env add NEXT_PREVIEW_SECRET production
npx vercel env add NEXT_CACHE_REVALIDATE_SECRET production
npx vercel --prod
```

Use the production `*.vercel.app` URL as `<host>` in Studio (preview deployments are auth-gated and cannot be iframed).
