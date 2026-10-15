'use client';

// PostList — workshop demo code component.
//
// One component that exercises every registration feature shown in the
// session-1 demo, in the order they are presented:
//
//   1. Primitive props      title (string), limit (number), showBody (boolean)
//   2. A slot               header — any Plasmic tree rendered above the list
//   3. A choice → variant   layout: 'list' | 'grid' → data-layout attribute
//   4. Data fetch           getPosts(limit) from jsonplaceholder, via the BFF
//                           route in the browser (same helper the $q query uses)
//   5. $ctx via DataProvider  $ctx.posts = { count, loading, error, items }
//                           available to anything dropped in the header slot
//
// Mirrors the other components: client-only, no server imports, data goes
// through lib/plasmic/data/posts.ts.
import React, {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { DataProvider } from '@plasmicapp/loader-nextjs';
import { getPosts, type Post } from '@/lib/plasmic/data/posts';

export type PostListLayout = 'list' | 'grid';

export type PostListProps = {
  /** Heading shown above the list when the header slot is empty. */
  title?: string;
  /** Number of posts to fetch (1–100). */
  limit?: number;
  /** Show each post's body text under its title. */
  showBody?: boolean;
  /** 'list' stacks posts; 'grid' lays them out in columns. */
  layout?: PostListLayout;
  /** Rendered above the list. Can read $ctx.posts. */
  header?: ReactNode;
  /** Rendered instead of the list while loading or when there are no posts. */
  empty?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

type PostsContext = {
  count: number;
  loading: boolean;
  error: string | null;
  items: Post[];
};

const layoutStyles: Record<PostListLayout, CSSProperties> = {
  list: { display: 'flex', flexDirection: 'column', gap: 16 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16,
  },
};

export default function PostList({
  title = 'Latest posts',
  limit = 5,
  showBody = true,
  layout = 'list',
  header,
  empty,
  className,
  style,
}: PostListProps) {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getPosts(limit)
      .then(posts => {
        if (!cancelled) {
          setItems(posts);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [limit]);

  const ctx: PostsContext = { count: items.length, loading, error, items };
  const showEmpty = loading || error !== null || items.length === 0;

  return (
    <DataProvider name="posts" data={ctx}>
      <section className={className} style={style} data-layout={layout}>
        {header ?? <h2 style={{ margin: '0 0 16px' }}>{title}</h2>}

        {showEmpty ? (
          (empty ?? (
            <p style={{ opacity: 0.6 }}>
              {loading ? 'Loading posts…' : (error ?? 'No posts')}
            </p>
          ))
        ) : (
          <ul
            style={{
              ...layoutStyles[layout],
              listStyle: 'none',
              margin: 0,
              padding: 0,
            }}
          >
            {items.map(post => (
              <li
                key={post.id}
                style={{
                  padding: 16,
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: 8,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 16 }}>{post.title}</h3>
                {showBody && (
                  <p style={{ margin: '8px 0 0', fontSize: 14, opacity: 0.8 }}>
                    {post.body}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </DataProvider>
  );
}
