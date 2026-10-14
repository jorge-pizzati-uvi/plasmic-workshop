// Server-side loaders. Called from lookup.tsx (RSC).
// Do not import in client components — use init-client.tsx there.
//
// Two loaders per Plasmic docs (https://docs.plasmic.app/learn/preview-mode/):
//   PLASMIC          — published-only. Used for prod requests without draft mode.
//   PREVIEW_PLASMIC  — includes unpublished revisions. Used when draftMode() is
//                       enabled (via /api/draft?url=<slug>&secret=<...>).

import { initPlasmicLoader } from '@plasmicapp/loader-nextjs/react-server';
// Type-only import from the main entry — the /react-server subpath has a
// broken type shim in @plasmicapp/loader-react@2.0.14 that drops base-class
// methods (maybeFetchComponentData, fetchPages). Runtime still uses the
// react-server bundle.
import type { NextJsPlasmicComponentLoader } from '@plasmicapp/loader-nextjs';
import { getPlasmicConfig } from '@/lib/plasmic/config';

const config = getPlasmicConfig();

if (!config) {
  console.warn(
    '[plasmic] Missing NEXT_PUBLIC_PLASMIC_PROJECT_ID or NEXT_PUBLIC_PLASMIC_PUBLIC_TOKEN. Plasmic pages will not render.'
  );
}

// App Router codegen. Plasmic only emits the per-page server-queries exec
// module (entryCompMetas[0].serverQueriesExecFuncFileName, consumed by
// getPlasmicQueriesData) when the bundle is requested with nextjsAppDir=true.
// Must match init-client.tsx so both loaders share one bundle shape.
const PLATFORM_OPTIONS = { nextjs: { appDir: true } } as const;

const projects = config
  ? [{ id: config.projectId, token: config.token }]
  : null;

export const PLASMIC: NextJsPlasmicComponentLoader | null = projects
  ? (initPlasmicLoader({
      projects,
      preview: false,
      platformOptions: PLATFORM_OPTIONS,
    }) as unknown as NextJsPlasmicComponentLoader)
  : null;

export const PREVIEW_PLASMIC: NextJsPlasmicComponentLoader | null = projects
  ? (initPlasmicLoader({
      projects,
      preview: true,
      platformOptions: PLATFORM_OPTIONS,
    }) as unknown as NextJsPlasmicComponentLoader)
  : null;
