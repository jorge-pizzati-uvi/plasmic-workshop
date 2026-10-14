// Plasmic publish webhook receiver.
// Plasmic Studio → Publish dialog → Call Webhooks → POST
//   ${HOST}/api/revalidate-plasmic/?secret=<NEXT_CACHE_REVALIDATE_SECRET>
// Body (https://docs.plasmic.app/learn/webhooks/):
//   { payload: string, importedProjectsChanged: string[], pagesChanged: string[] }
//
// Default scope is a project-wide purge (PLASMIC_TAG). `?scope=pages` opts in
// to surgical invalidation from `pagesChanged` — only when every entry is a
// page path and no imported project changed; otherwise falls back to full.
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import {
  PLASMIC_MANIFEST_TAG,
  PLASMIC_TAG,
  plasmicPageTag,
} from '@/lib/plasmic/tags';

type PlasmicWebhookBody = {
  payload?: string;
  importedProjectsChanged?: unknown;
  pagesChanged?: unknown;
};

const createResponse = (
  tags: string[],
  status = 200,
  message: string = 'Successfully revalidated cache'
) =>
  NextResponse.json(
    { revalidated: status === 200, now: Date.now(), tags, message },
    { status }
  );

// Plasmic may call with an empty body (payload disabled) — treat as {}.
const parseBody = async (req: NextRequest): Promise<PlasmicWebhookBody> => {
  try {
    const body = await req.json();

    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');

const resolveTags = (scope: string | null, body: PlasmicWebhookBody) => {
  if (scope !== 'pages') {
    return [PLASMIC_TAG];
  }

  const { importedProjectsChanged, pagesChanged } = body;

  // Shared library changes can affect any page — purge everything.
  if (
    isStringArray(importedProjectsChanged) &&
    importedProjectsChanged.length
  ) {
    return [PLASMIC_TAG];
  }

  if (
    !isStringArray(pagesChanged) ||
    !pagesChanged.length ||
    !pagesChanged.every(page => page.startsWith('/'))
  ) {
    return [PLASMIC_TAG];
  }

  return [PLASMIC_MANIFEST_TAG, ...pagesChanged.map(plasmicPageTag)];
};

export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const expected = process.env.NEXT_CACHE_REVALIDATE_SECRET;
  const secret =
    req.headers.get('x-revalidate-secret') ?? searchParams.get('secret');

  if (expected && secret !== expected) {
    return createResponse([], 401, 'Invalid secret');
  }

  const body = await parseBody(req);
  const tags = resolveTags(searchParams.get('scope'), body);

  console.info('[plasmic] publish webhook', {
    pagesChanged: body.pagesChanged,
    importedProjectsChanged: body.importedProjectsChanged,
    tags,
  });

  tags.forEach(tag => revalidateTag(tag));

  return createResponse(tags);
}
