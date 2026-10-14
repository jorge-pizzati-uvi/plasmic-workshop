'use client';

// Client-side code-split boundary for the Plasmic page renderer.
//
// lookup.tsx (RSC) must not import client-page.tsx directly: a static import
// — and even next/dynamic called from a server module — lands the renderer
// and everything host-registrations pulls in (loader, Swiper, react-aria,
// every code component) in the [[...slug]] client bundle for EVERY page,
// flag on or off. Calling dynamic() from a client module makes webpack emit
// a real async chunk, fetched only when a Plasmic page renders.
import dynamic from 'next/dynamic';

export const ClientPlasmicPage = dynamic(() =>
  import('@/lib/plasmic/client-page').then(m => m.ClientPlasmicPage)
);
