// Draft-preview entry. Configure the Studio Preview URL to:
//   https://<host>/api/draft?url=/<slug>&secret=$NEXT_PREVIEW_SECRET
//
// Validates the secret (when NEXT_PREVIEW_SECRET is set), enables Next.js
// draftMode(), redirects to the target path. Exit via /api/disable-draft.
import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const expected = process.env.NEXT_PREVIEW_SECRET;
  const secret = searchParams.get('secret');
  const url = searchParams.get('url');

  if (expected && secret !== expected) {
    return new Response('Invalid secret', { status: 401 });
  }

  (await draftMode()).enable();

  // Same-origin paths only. Reject `//host` and `/\host` (open redirect).
  const isSafe =
    !!url &&
    url.startsWith('/') &&
    !url.startsWith('//') &&
    !url.startsWith('/\\');

  redirect(isSafe ? url! : '/');
}
