import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Studio webhooks are often typed with a trailing slash
  // (/api/revalidate-cache/). Without this, Next 308-redirects them; both
  // forms now reach the route handler directly.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
