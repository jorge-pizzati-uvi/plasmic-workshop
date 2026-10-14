import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Plasmic's publish webhook is configured with a trailing slash
  // (/api/revalidate-plasmic/). Without this, Next 308-redirects it and the
  // POST body is lost. Both forms now reach the route handler.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
