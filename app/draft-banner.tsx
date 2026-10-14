'use client';

import { usePathname } from 'next/navigation';

// Shown while Next draft mode is on (entered via /api/draft from the Studio
// "Preview" button). Pages render unpublished Plasmic revisions until exit.
export default function DraftBanner() {
  const pathname = usePathname();

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        padding: '6px 12px',
        background: '#f59e0b',
        color: '#111',
        font: '13px/1.4 system-ui',
      }}
    >
      Draft mode: showing unpublished Plasmic changes.{' '}
      <a href={`/api/disable-draft?url=${encodeURIComponent(pathname || '/')}`}>
        Exit
      </a>
    </div>
  );
}
