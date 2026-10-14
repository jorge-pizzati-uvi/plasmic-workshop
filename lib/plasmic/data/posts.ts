// Demo server query: `getPosts` — fetches posts from jsonplaceholder.
//
// Registered with `isQuery: true` on every loader (server loaders in
// server-registrations.ts, client loaders in host-registrations.ts) so
// authors can add it as a Data query in Studio and bind `$q.<name>.data`.
//
// Isomorphic: on the server (RSC, getPlasmicQueriesData) it fetches the
// upstream API directly with cache tags; in the browser (Studio canvas,
// client navigation) it calls the BFF route /api/posts so the browser never
// talks to upstream APIs or holds credentials. Same pattern as production.
import type { CustomFunctionMeta } from '@plasmicapp/host';

export const POSTS_API = 'https://jsonplaceholder.typicode.com/posts';
export const POSTS_TAG = 'posts-data';

export type Post = {
  userId: number;
  id: number;
  title: string;
  body: string;
};

const clampLimit = (limit?: number) =>
  Math.min(Math.max(Math.floor(Number(limit) || 10), 1), 100);

export async function fetchPostsUpstream(limit?: number): Promise<Post[]> {
  const res = await fetch(`${POSTS_API}?_limit=${clampLimit(limit)}`, {
    next: { tags: ['plasmic-data', POSTS_TAG], revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`getPosts: upstream ${res.status}`);
  }

  return (await res.json()) as Post[];
}

export async function getPosts(limit?: number): Promise<Post[]> {
  if (typeof window === 'undefined') {
    return fetchPostsUpstream(limit);
  }

  const res = await fetch(`/api/posts?limit=${clampLimit(limit)}`);

  if (!res.ok) {
    throw new Error(`getPosts: /api/posts ${res.status}`);
  }

  return (await res.json()) as Post[];
}

export const getPostsMeta: CustomFunctionMeta<typeof getPosts> = {
  name: 'getPosts',
  displayName: 'Get posts (demo)',
  description:
    'Demo posts from jsonplaceholder. Use as a Data query; bind $q.<name>.data.',
  importPath: '@/lib/plasmic/data/posts',
  isQuery: true,
  params: [
    {
      name: 'limit',
      displayName: 'Limit',
      description: 'Number of posts (1–100). Default 10.',
      type: 'number',
    },
  ],
  returnValue: {
    description: 'Array of { userId, id, title, body }.',
  },
};
