// Plasmic cache tags. Kept dependency-free so API routes (webhook receivers)
// can import them without pulling the loader / React into the route.

// Project-wide tag — on every Plasmic cache entry. Purging it clears all.
export const PLASMIC_TAG = 'plasmic-pages';

// Page manifest tag — only on the page-list caches (fetchPlasmicPages,
// getPlasmicPaths). Purged alongside per-page tags on surgical invalidation
// so newly published / deleted pages are picked up.
export const PLASMIC_MANIFEST_TAG = 'plasmic-manifest';

// Prefetched query data tag — on every Plasmic page cache entry whose HTML
// embeds server-query results (resorts, rates, ...). Purge to refresh data
// without a Plasmic publish:
//   /api/revalidate-cache?tag=plasmic-data&secret=<...>
export const PLASMIC_DATA_TAG = 'plasmic-data';

// Per-path tag — supports surgical invalidation:
//   /api/revalidate-cache?tag=/some/path&secret=<...>
// Tag is the identifier itself, no namespace prefix. Project-wide purge continues via the shared PLASMIC_TAG.
export const plasmicPageTag = (path: string) => path;
