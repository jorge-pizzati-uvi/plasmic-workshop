// Shared server-side Plasmic page lookup + render. Used by [[...slug]].
//
// Server data for `$q` queries: Plasmic generates a per-page exec module
// (emitted because the loaders request the bundle with
// platformOptions.nextjs.appDir). We run it via loader.getPlasmicQueriesData
// right after the bundle fetch — same loader instance that fetched the bundle
// — and cache the result together with the page. The client receives it as
// prefetchedQueryData, so $q bindings render from the static HTML.
//
// Draft preview: when draftMode() is enabled, switch to PREVIEW_PLASMIC
// (unpublished revisions) and skip the cache so drafts always render fresh.
// https://docs.plasmic.app/learn/preview-mode/
import { unstable_cache } from 'next/cache';
import { draftMode } from 'next/headers';
import type { ComponentRenderData } from '@plasmicapp/loader-nextjs';
import { internal_getCachedBundleInNodeServer } from '@plasmicapp/loader-fetcher';
import { PLASMIC, PREVIEW_PLASMIC } from '@/lib/plasmic/init-server';
import '@/lib/plasmic/server-registrations';
// Static import on purpose. A next/dynamic() wrapper adds a Suspense
// boundary, and React 19's streaming renderer outlines any completed boundary
// larger than ~12.8 KB: the shell gets the fallback and the real HTML is
// swapped in by a script. A Plasmic page is hundreds of KB, so without
// JavaScript the page would show only the fallback. See client-page.tsx.
import { ClientPlasmicPage } from '@/lib/plasmic/client-page';
import ErrorBoundary from '@/components/error-boundary';
import { PLASMIC_PAGE_REVALIDATE_SECONDS } from '@/lib/plasmic/config';
import { POSTS_TAG } from '@/lib/plasmic/data/posts';
import {
  PLASMIC_DATA_TAG,
  PLASMIC_MANIFEST_TAG,
  PLASMIC_TAG,
  plasmicPageTag,
} from '@/lib/plasmic/tags';

export { PLASMIC_MANIFEST_TAG, PLASMIC_TAG, plasmicPageTag };

const PLASMIC_FETCH_TIMEOUT_MS = 5000;

type ServerLoader = NonNullable<typeof PLASMIC>;

export type PlasmicQueryData = Record<string, any>;

export type PlasmicPageResult = {
  data: ComponentRenderData;
  queryData: PlasmicQueryData;
};

// Race a fetch against a timeout. On timeout, throw so unstable_cache
// does not memoize a null response — next request retries fresh.
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`[plasmic] ${label} timed out after ${ms}ms`)),
        ms
      )
    ),
  ]);
}

// Execute the page's server queries ($q) on the loader that just fetched the
// bundle. Failures degrade to {} (client refetches $q on hydration).
async function fetchQueriesData(
  loader: ServerLoader,
  data: ComponentRenderData,
  path: string
): Promise<PlasmicQueryData> {
  const pageMeta = data.entryCompMetas[0];

  try {
    const queries = await loader.getPlasmicQueriesData(data, {
      pagePath: path,
      params: pageMeta?.params ?? {},
      query: {},
    });

    return queries ?? {};
  } catch (err) {
    console.warn(`[plasmic] getPlasmicQueriesData failed for ${path}:`, err);

    return {};
  }
}

async function fetchPageResult(
  loader: ServerLoader,
  path: string,
  label: string
): Promise<PlasmicPageResult | null> {
  const data = await withTimeout(
    loader.maybeFetchComponentData(path),
    PLASMIC_FETCH_TIMEOUT_MS,
    label
  );

  if (!data) {
    return null;
  }

  const queryData = await fetchQueriesData(loader, data, path);

  return { data, queryData };
}

// Per-path cache factory: unstable_cache's `tags` are static, so one cache per
// path attaches the path-specific tag alongside the shared tags.
const cacheForPath = (path: string) =>
  unstable_cache(
    async () => fetchPageResult(PLASMIC!, path, `fetch ${path}`),
    ['plasmic-page', 'v1', path],
    {
      tags: [PLASMIC_TAG, PLASMIC_DATA_TAG, POSTS_TAG, plasmicPageTag(path)],
      revalidate: PLASMIC_PAGE_REVALIDATE_SECONDS,
    }
  );

// The loader strips server modules from the ComponentRenderData it returns
// (that object is serialised to the browser), and expects the SSR pass to
// recover them from an in-process node cache (globalThis.__PLASMIC_BUNDLES)
// that the fetcher fills whenever it downloads a bundle. unstable_cache hands
// back page data without any download, so a fresh process (or a build
// worker, or a lambda that never fetched) has no server modules: the page
// renders empty HTML and only appears after hydration. Fill the node cache
// when it is missing or holds a different project version than the cached
// page data; the fetcher memoises the bundle, so this costs one download per
// process per published version.
async function ensureServerBundle(
  loader: ServerLoader,
  data: ComponentRenderData,
  path: string
): Promise<void> {
  const opts = (loader as unknown as { __internal?: { opts?: unknown } })
    .__internal?.opts;
  const wanted = data.bundle.projects;
  const cached = opts
    ? (internal_getCachedBundleInNodeServer(opts as never) as
        | { projects?: { id: string; version: string }[] }
        | undefined)
    : undefined;
  const fresh =
    !!cached &&
    wanted.every(p =>
      cached.projects?.some(c => c.id === p.id && c.version === p.version)
    );

  if (fresh) {
    return;
  }

  try {
    await withTimeout(
      loader.maybeFetchComponentData(path),
      PLASMIC_FETCH_TIMEOUT_MS,
      `warm server bundle ${path}`
    );
  } catch (err) {
    console.warn(`[plasmic] ensureServerBundle failed for ${path}:`, err);
  }
}

export const fetchPlasmicPage = async (
  path: string
): Promise<PlasmicPageResult | null> => {
  if (!PLASMIC) {
    return null;
  }
  try {
    const result = await cacheForPath(path)();

    if (result) {
      await ensureServerBundle(PLASMIC, result.data, path);
    }

    return result;
  } catch (err) {
    console.warn(`[plasmic] fetchPlasmicPage failed for ${path}:`, err);

    return null;
  }
};

export const fetchPlasmicPages = unstable_cache(
  async () =>
    PLASMIC
      ? withTimeout(
          PLASMIC.fetchPages(),
          PLASMIC_FETCH_TIMEOUT_MS,
          'fetchPages'
        )
      : [],
  ['plasmic-pages-list'],
  { tags: [PLASMIC_TAG, PLASMIC_MANIFEST_TAG] }
);

const getPlasmicPaths = unstable_cache(
  async (): Promise<string[]> => {
    try {
      const pages = await fetchPlasmicPages();

      return pages.map(p => p.path);
    } catch (err) {
      console.warn('[plasmic] getPlasmicPaths failed:', err);

      return [];
    }
  },
  ['plasmic-paths'],
  { tags: [PLASMIC_TAG, PLASMIC_MANIFEST_TAG] }
);

// Membership check. Preview mode bypasses the gate — new drafts may not
// exist in the published manifest yet.
export const isPlasmicPath = async (path: string): Promise<boolean> => {
  if ((await draftMode()).isEnabled) {
    return true;
  }

  const paths = await getPlasmicPaths();

  return paths.includes(path);
};

// Non-cached preview lookup — drafts must always be fresh.
const fetchPlasmicPagePreview = async (
  path: string
): Promise<PlasmicPageResult | null> => {
  if (!PREVIEW_PLASMIC) {
    return null;
  }
  try {
    return await fetchPageResult(
      PREVIEW_PLASMIC,
      path,
      `preview fetch ${path}`
    );
  } catch (err) {
    console.warn(`[plasmic] fetchPlasmicPagePreview failed for ${path}:`, err);

    return null;
  }
};

export async function resolvePlasmicPage(
  path: string
): Promise<(PlasmicPageResult & { isPreview: boolean }) | null> {
  const isPreview = (await draftMode()).isEnabled;
  const result = isPreview
    ? await fetchPlasmicPagePreview(path)
    : await fetchPlasmicPage(path);

  return result ? { ...result, isPreview } : null;
}

export function renderPlasmicPage(
  plasmicData: ComponentRenderData,
  { isPreview, queryData }: { isPreview: boolean; queryData?: PlasmicQueryData }
) {
  const pageMeta = plasmicData.entryCompMetas[0];

  // Preview: skip prefetchedData so the client re-fetches the draft via
  // PREVIEW_PLASMIC. Query data is still seeded.
  return (
    <ErrorBoundary>
      <ClientPlasmicPage
        prefetchedData={isPreview ? undefined : plasmicData}
        componentName={pageMeta.displayName}
        queryData={queryData}
        isPreview={isPreview}
        pageRoute={pageMeta.path}
        pageParams={pageMeta.params}
      />
    </ErrorBoundary>
  );
}
