// Catch-all route: every URL resolves against Plasmic.
//
// 1. isPlasmicPath — cached published-page manifest gate (draft mode bypasses)
// 2. resolvePlasmicPage — bundle + $q data (cached per path, or fresh draft)
// 3. renderPlasmicPage — client renderer inside an error boundary
// Unknown paths 404.
import { notFound } from 'next/navigation';
import {
  fetchPlasmicPages,
  isPlasmicPath,
  renderPlasmicPage,
  resolvePlasmicPage,
} from '@/lib/plasmic/lookup';
import { PLASMIC_ENABLED } from '@/lib/plasmic/config';

type Params = Promise<{ slug?: string[] }>;

const toPlasmicPath = (slug?: string[]) => '/' + (slug?.join('/') ?? '');

export async function generateStaticParams() {
  if (!PLASMIC_ENABLED || process.env.SKIP_SSG === 'true') {
    return [];
  }

  const pages = await fetchPlasmicPages();

  return pages.map(page => ({
    slug: page.path.split('/').filter(Boolean),
  }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const path = toPlasmicPath(slug);

  if (PLASMIC_ENABLED && (await isPlasmicPath(path))) {
    const resolved = await resolvePlasmicPage(path);
    const pageMetadata = resolved?.data.entryCompMetas[0]?.pageMetadata;

    return {
      title: pageMetadata?.title ?? 'Plasmic workshop',
      description: pageMetadata?.description ?? undefined,
    };
  }

  return { title: 'Plasmic workshop' };
}

export default async function Page({ params }: { params: Params }) {
  if (!PLASMIC_ENABLED) {
    return (
      <main style={{ padding: 32, fontFamily: 'system-ui' }}>
        <h1>Plasmic is not configured</h1>
        <p>
          Set <code>NEXT_PUBLIC_PLASMIC_PROJECT_ID</code> and{' '}
          <code>NEXT_PUBLIC_PLASMIC_PUBLIC_TOKEN</code>, then restart.
        </p>
      </main>
    );
  }

  const { slug } = await params;
  const path = toPlasmicPath(slug);

  if (await isPlasmicPath(path)) {
    const resolved = await resolvePlasmicPage(path);

    if (resolved) {
      return renderPlasmicPage(resolved.data, {
        isPreview: resolved.isPreview,
        queryData: resolved.queryData,
      });
    }
  }

  notFound();
}
