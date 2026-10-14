// Cache purge by tag — single invalidation endpoint, GET for demo convenience.
//
//   GET /api/revalidate-cache?secret=<NEXT_CACHE_REVALIDATE_SECRET>              → purge all Plasmic pages
//   GET /api/revalidate-cache?tag=plasmic-data&secret=…                          → refresh $q data only
//   GET /api/revalidate-cache?tag=/some/path&secret=…                            → one page
//
// Plasmic Studio → Publish → Call webhooks: use the first URL (method GET).
// POST is accepted too so a webhook configured as POST still works; the body
// is ignored.
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { PLASMIC_TAG } from '@/lib/plasmic/tags';

function purge(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const expected = process.env.NEXT_CACHE_REVALIDATE_SECRET;
  const secret =
    req.headers.get('x-revalidate-secret') ?? searchParams.get('secret');

  if (expected && secret !== expected) {
    return NextResponse.json(
      { revalidated: false, message: 'Invalid secret' },
      { status: 401 }
    );
  }

  const tag = searchParams.get('tag') || PLASMIC_TAG;

  console.info('[plasmic] revalidate', { tag });
  revalidateTag(tag);

  return NextResponse.json({ revalidated: true, now: Date.now(), tags: [tag] });
}

export async function GET(req: NextRequest) {
  return purge(req);
}

export async function POST(req: NextRequest) {
  return purge(req);
}
