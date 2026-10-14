// BFF for the `getPosts` demo query — called by the Studio canvas and by
// client-side navigation (see lib/plasmic/data/posts.ts).
import { NextRequest, NextResponse } from 'next/server';
import { fetchPostsUpstream } from '@/lib/plasmic/data/posts';

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get('limit')) || undefined;

  try {
    return NextResponse.json(await fetchPostsUpstream(limit));
  } catch (err) {
    console.error('[api/posts]', err);

    return NextResponse.json({ error: 'upstream failed' }, { status: 502 });
  }
}
