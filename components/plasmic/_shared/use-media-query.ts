'use client';

// useMediaQuery — subscribe to a CSS media query, return current match as
// a boolean. SSR-safe (returns false on server, syncs on mount).
//
// Callers pass any valid media query string, e.g.:
//   const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
//   const isMobile = useMediaQuery(`(max-width: ${breakpoint - 1}px)`);
//
// Skips subscription when `query` is empty — useful when the query is
// derived from a runtime value that may be unset.

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia || !query) {
      return undefined;
    }
    const mq = window.matchMedia(query);

    setMatches(mq.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);

    mq.addEventListener('change', listener);

    return () => mq.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
