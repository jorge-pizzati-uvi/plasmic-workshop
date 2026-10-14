'use client';

// Client renderer for pages fetched by RSC parent.
//
// Picks between the published PLASMIC loader and PREVIEW_PLASMIC based on the
// isPreview prop (server sets it from draftMode()). See Plasmic Preview Mode
// docs: https://docs.plasmic.app/learn/preview-mode/.
import {
  PlasmicComponent,
  PlasmicRootProvider,
  ComponentRenderData,
} from '@plasmicapp/loader-nextjs';
import { PLASMIC, PREVIEW_PLASMIC } from '@/lib/plasmic/init-client';
import '@/lib/plasmic/host-registrations';

export function ClientPlasmicPage({
  prefetchedData,
  componentName,
  queryData,
  isPreview,
  pageRoute,
  pageParams,
}: {
  prefetchedData?: ComponentRenderData;
  componentName: string;
  // Server-query results from PLASMIC.getPlasmicQueriesData (see lookup.tsx).
  // Seeds the SWR cache so $q bindings render from HTML without a refetch.
  queryData?: Record<string, any>;
  isPreview?: boolean;
  pageRoute?: string;
  pageParams?: Record<string, string>;
}) {
  const loader = isPreview ? PREVIEW_PLASMIC : PLASMIC;

  // Loader null when NEXT_PUBLIC_PLASMIC_PROJECT_ID/TOKEN missing.
  // Server callers already gate; guard again for type safety.
  if (!loader) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[plasmic] Client loader is null — NEXT_PUBLIC_PLASMIC_PROJECT_ID or NEXT_PUBLIC_PLASMIC_PUBLIC_TOKEN is missing. Rendering nothing.'
      );
    }

    return null;
  }

  return (
    <PlasmicRootProvider
      loader={loader}
      prefetchedData={prefetchedData}
      prefetchedQueryData={queryData}
      pageRoute={pageRoute}
      pageParams={pageParams}
    >
      <PlasmicComponent component={componentName} />
    </PlasmicRootProvider>
  );
}
