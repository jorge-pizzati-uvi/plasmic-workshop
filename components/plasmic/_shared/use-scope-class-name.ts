'use client';

// useScopeClassName — walk a trigger element's ancestor chain and mirror
// every className token onto a single string. Portalled overlays (Modal,
// Tooltip) render inside <body>, escaping any Plasmic CSS-module ancestor
// that defines token custom properties (--token-*) or scoped selectors.
// Applying the joined chain on the portal root reproduces the cascade so
// component styles that rely on ancestor class selectors still match.
//
// Layout-breaking properties (overflow:hidden, position:relative, transform)
// that third-party classes (e.g. Swiper) may introduce are neutralised by
// inline styles on the CanvasPortal wrapper div — inline specificity beats
// class-based CSS, so collecting all classes here is safe.

import { useLayoutEffect, useState, type RefObject } from 'react';

export function useScopeClassName(
  triggerRef: RefObject<HTMLElement | null>,
  isOpen: boolean
): string {
  const [scopeClassName, setScopeClassName] = useState('');

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    const classes = new Set<string>();
    let node: HTMLElement | null = triggerRef.current;

    while (node && node !== document.body) {
      if (typeof node.className === 'string') {
        node.className
          .split(/\s+/)
          .filter(Boolean)
          .forEach(c => classes.add(c));
      }
      node = node.parentElement;
    }
    setScopeClassName(Array.from(classes).join(' '));
  }, [isOpen, triggerRef]);

  return scopeClassName;
}
