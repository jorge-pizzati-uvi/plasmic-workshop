'use client';

import { DataProvider } from '@plasmicapp/loader-nextjs';
import React, { useEffect, useRef, useState } from 'react';

// StickyWrapper — native CSS `position: sticky` + scroll-listener detection
// for $ctx.isIntersected.
//
// The rendered JSX root is the visible content div. Author-set className
// applies to it. `position: sticky` handles the actual sticking via native
// browser layout.
//
// Detection uses a scroll listener + getBoundingClientRect on the content
// itself. IntersectionObserver is unsuitable here because it only fires on
// intersection ratio crossings — during slow scroll, sub-pixel movement
// between frames can skip the crossing entirely, leaving the flag stuck.
// Scroll listeners fire on every scroll frame (throttled by browser), so
// they reliably catch the position change regardless of scroll speed.

export default function StickyWrapper({
  children,
  className,
  topOffset = 0,
  topMargin = 0,
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  topOffset?: number;
  topMargin?: number;
  disabled?: boolean;
}) {
  const [isIntersected, setIsIntersected] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // SSR safety + disabled short-circuit — skip listener setup entirely.
    if (typeof window === 'undefined' || disabled) {
      // Ensure state resets when re-enabling after disabled → enabled.
      setIsIntersected(false);

      return undefined;
    }

    const content = contentRef.current;

    if (!content) {
      return undefined;
    }

    let raf = 0;
    let lastValue = false;

    const check = () => {
      raf = 0;

      if (!contentRef.current) {
        return;
      }

      // Skip work when tab is hidden — scroll can still fire in some
      // background scenarios; save cycles by no-op'ing.
      if (document.hidden) {
        return;
      }

      // Content is `position: sticky; top: topOffset`. When stuck, its
      // rect.top === topOffset. Otherwise (in flow, unstuck), rect.top
      // is greater. 0.5 epsilon guards against sub-pixel float rounding.
      const rect = contentRef.current.getBoundingClientRect();
      const next = rect.top <= topOffset + 0.5;

      // Skip setState when value unchanged — saves React reconciliation.
      if (next !== lastValue) {
        lastValue = next;
        setIsIntersected(next);
      }
    };

    const onScroll = () => {
      if (raf) {
        return;
      }
      raf = requestAnimationFrame(check);
    };

    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) {
        cancelAnimationFrame(raf);
      }
    };
  }, [topOffset, disabled]);

  return (
    <DataProvider name="isIntersected" data={isIntersected}>
      <div
        ref={contentRef}
        className={className}
        style={{
          position: disabled ? undefined : 'sticky',
          top: disabled ? undefined : topOffset,
          marginTop: topMargin || undefined,
        }}
      >
        {children}
      </div>
    </DataProvider>
  );
}
