'use client';

// Studio embed target. Plasmic Studio iframes this page; code components and
// functions registered in host-registrations.ts appear in the Insert panel.
import * as React from 'react';
import { PlasmicCanvasHost } from '@plasmicapp/host';
import '@/lib/plasmic/host-registrations';
import { PLASMIC_ENABLED } from '@/lib/plasmic/config';

export default function PlasmicHost() {
  if (!PLASMIC_ENABLED) {
    return null;
  }

  return <PlasmicCanvasHost />;
}
