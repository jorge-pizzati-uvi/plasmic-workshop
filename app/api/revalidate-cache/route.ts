// Manual tag purge, e.g. refresh query data without a Plasmic publish:
//   GET /api/revalidate-cache?tag=plasmic-data&secret=<NEXT_CACHE_REVALIDATE_SECRET>
//   GET /api/revalidate-cache?tag=/some/path&secret=...   (one page)
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const expected = process.env.NEXT_CACHE_REVALIDATE_SECRET;
  const tag = searchParams.get('tag');

  if (expected && searchParams.get('secret') !== expected) {
    return NextResponse.json(
      { revalidated: false, message: 'Invalid secret' },
      { status: 401 }
    );
  }

  if (!tag) {
    return NextResponse.json(
      { revalidated: false, message: 'Missing tag' },
      { status: 400 }
    );
  }

  revalidateTag(tag);

  return NextResponse.json({ revalidated: true, now: Date.now(), tags: [tag] });
}
