'use client';

// CanvasPortal — renders children into <body> via ReactDOM.createPortal,
// wrapped in a div carrying `scopeClassName` so Plasmic token custom props
// from the trigger's ancestor chain apply to the portalled subtree.
// SSR-safe: renders nothing on server or when `open` is false.

import React, { type ReactNode } from 'react';
import ReactDOM from 'react-dom';

export type CanvasPortalProps = {
  open: boolean;
  scopeClassName?: string;
  children: ReactNode;
};

export function CanvasPortal({
  open,
  scopeClassName,
  children,
}: CanvasPortalProps) {
  if (!open || typeof document === 'undefined') {
    return null;
  }

  return ReactDOM.createPortal(
    // The wrapper carries scopeClassName so Plasmic CSS-token custom props
    // cascade into the portalled subtree. Inline styles neutralize any
    // layout/stacking rules that leaked in from third-party ancestor classes
    // (e.g. Swiper's `.swiper { overflow: hidden; position: relative }`).
    // Inline style specificity beats class-based CSS, so this is safe.
    //
    // `display: contents` is the load-bearing one: scopeClassName is the whole
    // class chain of the trigger's ancestors, so it can carry a display that
    // turns this wrapper into a real box at the end of <body> — e.g.
    // SelectionItem's `.item { display: inline-flex }`, which laid out a
    // full-width box and pushed document scrollWidth past the viewport
    // (horizontal scrollbar on every page with an open tooltip). With
    // `contents` the wrapper generates no box at all, while custom properties
    // still inherit into the subtree, which is the only reason it exists.
    <div
      className={scopeClassName}
      style={{
        display: 'contents',
        overflow: 'visible',
        position: 'static',
        transform: 'none',
        contain: 'none',
        isolation: 'auto',
      }}
    >
      {children}
    </div>,
    document.body
  );
}
