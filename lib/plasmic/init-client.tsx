'use client';

// Client-side loaders. Used by /plasmic-host (registrations) +
// client renderer. Mirror server loaders in init-server.ts (published +
// preview).
import { initPlasmicLoader } from '@plasmicapp/loader-nextjs';
import { getPlasmicConfig } from '@/lib/plasmic/config';

const config = getPlasmicConfig();

if (!config && process.env.NODE_ENV !== 'production') {
  console.warn(
    '[plasmic] Missing NEXT_PUBLIC_PLASMIC_PROJECT_ID or NEXT_PUBLIC_PLASMIC_PUBLIC_TOKEN. Plasmic pages will not render.'
  );
}

// Mirrors init-server.ts — see comment there.
const PLATFORM_OPTIONS = { nextjs: { appDir: true } } as const;

const projects = config
  ? [{ id: config.projectId, token: config.token }]
  : null;

export const PLASMIC = projects
  ? initPlasmicLoader({
      projects,
      preview: false,
      platformOptions: PLATFORM_OPTIONS,
    })
  : null;

export const PREVIEW_PLASMIC = projects
  ? initPlasmicLoader({
      projects,
      preview: true,
      platformOptions: PLATFORM_OPTIONS,
    })
  : null;
