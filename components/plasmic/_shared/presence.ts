'use client';

// presence — the DOM-level contract between a component that hides a subtree
// (Tabs) and a component that tracks what is selectable inside it (Selection).
// Deliberately plain DOM: neither side imports the other, the only shared
// vocabulary is the two attributes declared here.
//
//   data-phase   'enter' | 'open' | 'exit' — published for Studio bindings and
//                for CSS; written by whoever owns the node.
//   data-exiting 'true' while a subtree is still mounted purely so it can
//                animate out. Content inside is on its way out: it must not
//                take part in selection, focus or pointer interaction.

export const PHASE_ATTR = 'data-phase';
export const EXITING_ATTR = 'data-exiting';

// Ancestors that make a node "not really there" for interaction purposes.
export const PRESENCE_SELECTOR = '[data-exiting="true"],[hidden]';

export type Phase = 'enter' | 'open' | 'exit';

// True when the node is in the document and no ancestor is hidden or exiting.
export function isPresent(node: Element | null | undefined): boolean {
  if (!node?.isConnected) {
    return false;
  }

  return !node.closest(PRESENCE_SELECTOR);
}

// Watch a root for `hidden` / `data-exiting` flips anywhere inside it. Used by
// SelectionProvider to re-sync when a tab panel starts or finishes exiting —
// those flips change nothing about registration, so no React update would
// otherwise tell the provider that the set of present items changed.
export function observePresence(
  root: Element | null | undefined,
  onChange: () => void
): () => void {
  if (!root || typeof MutationObserver === 'undefined') {
    return () => undefined;
  }

  const observer = new MutationObserver(() => onChange());

  observer.observe(root, {
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden', EXITING_ATTR],
  });

  return () => observer.disconnect();
}
