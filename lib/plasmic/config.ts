// Shared env resolution for server + client loaders.
// NEXT_PUBLIC_* values are inlined at BUILD time — set them before `next build`.

export type PlasmicConfig = { projectId: string; token: string };

export function getPlasmicConfig(): PlasmicConfig | null {
  const projectId = process.env.NEXT_PUBLIC_PLASMIC_PROJECT_ID;
  const token = process.env.NEXT_PUBLIC_PLASMIC_PUBLIC_TOKEN;

  if (!projectId || !token || projectId === 'REPLACE_ME') {
    return null;
  }

  return { projectId, token };
}

export const PLASMIC_ENABLED = getPlasmicConfig() !== null;

// Freshness of the cached Plasmic page (bundle + prefetched query data).
// Publish webhooks still purge immediately via tags. Server-only env.
const DEFAULT_PAGE_REVALIDATE_SECONDS = 3600;

export const PLASMIC_PAGE_REVALIDATE_SECONDS = (() => {
  const raw = Number(process.env.PLASMIC_PAGE_REVALIDATE_SECONDS);

  return Number.isFinite(raw) && raw > 0
    ? raw
    : DEFAULT_PAGE_REVALIDATE_SECONDS;
})();
