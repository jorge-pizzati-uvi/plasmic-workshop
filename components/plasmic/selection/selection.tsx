'use client';

// Selection — generic "one active item among many" for Plasmic. Two code
// components:
//
//  - SelectionProvider: owns which item is selected, publishes it as
//    `$ctx.selection.item`, and exposes it as a writable Studio state
//    (`selectedItem`) so interactions elsewhere can read/set it.
//  - SelectionItem: wraps any Studio content (a marker, a hotspot, a card…),
//    registers with the provider in document order and selects itself on
//    press and/or hover. Publishes `$ctx.selectionItem.isSelected` for the
//    content to react to.
//
// Nothing here knows about maps or markers: `item` is whatever object the
// author binds, and consumers read it back from `$ctx.selection.item`.
//
// Auto-select: when nothing is selected, or the selected item unmounted (a
// tab switched, an instance was deleted), the first registered item in
// document order becomes selected. That reproduces "initial = first" and
// "tab change = first of that tab" with zero wiring.
//
// Context split (HandlersCtx stable, StateCtx reactive) and the microtask
// reconciliation follow components/plasmic/tabs/hooks/use-tabs-controller.ts
// — see the notes there on why a merged context loops in Studio.

import { DataProvider } from '@plasmicapp/host';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

import { isPresent, observePresence, usePhase, useSwapPhase } from '../_shared';
import styles from './selection.module.css';

export type SelectOn = 'press' | 'hover' | 'both';

type ItemInfo = { item: unknown; node: HTMLElement | null };

type Handlers = {
  registerNode: (id: string, info: ItemInfo) => void;
  updateItem: (id: string, item: unknown) => void;
  unregisterNode: (id: string) => void;
  select: (id: string) => void;
};

type State = {
  selectedId: string | undefined;
  orderedIds: string[];
  // Registered items whose subtree is hidden or animating out. They are not
  // selectable, and they render in the `exit` phase.
  deferredIds: string[];
};

const HandlersCtx = createContext<Handlers | undefined>(undefined);
const StateCtx = createContext<State | undefined>(undefined);

function sameList(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function serialize(item: unknown) {
  try {
    return JSON.stringify(item ?? null);
  } catch {
    return String(item);
  }
}

// Detached/portalled nodes make compareDocumentPosition inconsistent, and an
// inconsistent comparator makes Array#sort return garbage silently. Partition
// them out; they keep insertion order.
//
// "Present" also excludes anything under a hidden or exiting ancestor: the
// outgoing tab's markers linger in the DOM for their exit animation, and they
// must not take part in ordering or win the auto-select. Returns the present
// ids in document order plus the deferred ones.
function partitionByPresence(
  entries: { id: string; node: HTMLElement | null }[]
) {
  const live = entries.filter(e => isPresent(e.node));
  const deferred = entries.filter(e => !isPresent(e.node));

  live.sort((a, b) =>
    // eslint-disable-next-line no-bitwise
    (a.node as HTMLElement).compareDocumentPosition(b.node as HTMLElement) &
    Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1
  );

  return {
    present: live.map(e => e.id),
    deferred: deferred.map(e => e.id),
  };
}

// ---- SelectionProvider ------------------------------------------------

export type SelectionProviderProps = {
  className?: string;
  children?: ReactNode;
  // Select the first registered item whenever nothing valid is selected.
  autoSelectFirst?: boolean;
  // Controlled pair backing Studio's writable `selectedItem` state. Matching
  // is by value (serialized), since Studio hands back a plain object.
  selectedItem?: unknown;
  onSelectedItemChange?: (item: unknown) => void;
  // Keep publishing the last item for this many ms after the last item
  // disappears, with `$ctx.selection.phase === 'exit'`, so a card bound to it
  // can fade out instead of blanking. 0 (default) clears immediately.
  exitDuration?: number;
  // Per-item delay unit for staggered marker animations. Exposed to Studio as
  // `--selection-delay` (index × stagger) on every item.
  stagger?: number;
  // How long `$ctx.selection.phase` stays on `enter` after the selection
  // moves. Match the duration of the animation on the card's `enter` variant,
  // so it runs to completion. 0 flips on the next frame, which only suits a
  // transition.
  swapDuration?: number;
};

export default function SelectionProvider(props: SelectionProviderProps) {
  const {
    className,
    children,
    autoSelectFirst = true,
    selectedItem: selectedItemProp,
    onSelectedItemChange,
    exitDuration = 0,
    stagger = 0,
    swapDuration = 0,
  } = props;

  const isControlled = selectedItemProp !== undefined;
  const [uncontrolledId, setUncontrolledId] = useState<string | undefined>();
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [deferredIds, setDeferredIds] = useState<string[]>([]);
  // Bumped when a registered item's payload changes, so the published
  // `$ctx.selection.item` re-renders with the author's latest edit.
  const [, setItemsVersion] = useState(0);

  const nodesRef = useRef<Map<string, ItemInfo>>(new Map());
  const serializedRef = useRef<Map<string, string>>(new Map());

  const isControlledRef = useRef(isControlled);

  isControlledRef.current = isControlled;
  const selectedItemPropRef = useRef(selectedItemProp);

  selectedItemPropRef.current = selectedItemProp;
  const autoSelectFirstRef = useRef(autoSelectFirst);

  autoSelectFirstRef.current = autoSelectFirst;
  const onChangeRef = useRef(onSelectedItemChange);

  onChangeRef.current = onSelectedItemChange;
  const uncontrolledIdRef = useRef(uncontrolledId);

  uncontrolledIdRef.current = uncontrolledId;

  const findIdByValue = useCallback((value: unknown) => {
    const wanted = serialize(value);
    let found: string | undefined;

    serializedRef.current.forEach((s, id) => {
      if (found === undefined && s === wanted) {
        found = id;
      }
    });

    return found;
  }, []);

  const selectedId = isControlled
    ? findIdByValue(selectedItemProp)
    : uncontrolledId;

  // The id currently selected, whichever side owns the value. Studio wires
  // the writable state to `selectedItem`, so after the first change the
  // provider is controlled and must keep reconciling against that value.
  const currentIdRef = useRef<string | undefined>(undefined);

  const readCurrentId = useCallback(
    () =>
      isControlledRef.current
        ? findIdByValue(selectedItemPropRef.current)
        : uncontrolledIdRef.current,
    [findIdByValue]
  );

  currentIdRef.current = readCurrentId();

  // Uncontrolled: set our own state. Controlled: only report, and let the
  // owner (Studio's state) hand the value back through the prop.
  const commit = useCallback((id: string | undefined) => {
    if (!isControlledRef.current) {
      setUncontrolledId(id);
    }
    onChangeRef.current?.(
      id === undefined ? null : (nodesRef.current.get(id)?.item ?? null)
    );
  }, []);

  // One reconciliation pass per burst of (un)registrations, after every
  // mount effect in the commit has run. Idempotent; bails when unchanged.
  const syncPendingRef = useRef(false);
  const scheduleSync = useCallback(() => {
    if (syncPendingRef.current) {
      return;
    }
    syncPendingRef.current = true;
    queueMicrotask(() => {
      syncPendingRef.current = false;

      const { present: next, deferred } = partitionByPresence(
        Array.from(nodesRef.current.entries()).map(([id, info]) => ({
          id,
          node: info.node,
        }))
      );

      setOrderedIds(prev => (sameList(prev, next) ? prev : next));
      setDeferredIds(prev => (sameList(prev, deferred) ? prev : deferred));

      if (!autoSelectFirstRef.current) {
        return;
      }
      const current = readCurrentId();

      if (current !== undefined && next.includes(current)) {
        return;
      }
      if (next.length === 0) {
        // An exit in flight is a transient empty list, not "nothing to
        // select" — clearing here would blank the card mid tab-switch.
        if (deferred.length > 0) {
          return;
        }
        // Report the loss only if something was selected; in controlled
        // mode a stale value that matches nothing is already "nothing".
        if (current !== undefined) {
          commit(undefined);
        }

        return;
      }
      commit(next[0]);
    });
  }, [commit, readCurrentId]);

  const registerNode = useCallback(
    (id: string, info: ItemInfo) => {
      nodesRef.current.set(id, info);
      serializedRef.current.set(id, serialize(info.item));
      scheduleSync();
    },
    [scheduleSync]
  );

  // Payload edits (an author retyping a title) must not re-register — that
  // would churn the registry — but the published item has to refresh.
  const updateItem = useCallback((id: string, item: unknown) => {
    const info = nodesRef.current.get(id);

    if (!info) {
      return;
    }
    const serialized = serialize(item);

    if (serializedRef.current.get(id) === serialized) {
      return;
    }
    const wasSelected = currentIdRef.current === id;

    nodesRef.current.set(id, { ...info, item });
    serializedRef.current.set(id, serialized);
    setItemsVersion(v => v + 1);
    // Controlled owners match by value, so an edited payload would silently
    // deselect the item; hand them the new value to keep the match.
    if (wasSelected) {
      onChangeRef.current?.(item);
    }
  }, []);

  const unregisterNode = useCallback(
    (id: string) => {
      nodesRef.current.delete(id);
      serializedRef.current.delete(id);
      scheduleSync();
    },
    [scheduleSync]
  );

  const select = useCallback(
    (id: string) => {
      if (!nodesRef.current.has(id)) {
        return;
      }
      commit(id);
    },
    [commit]
  );

  const handlers = useMemo<Handlers>(
    () => ({ registerNode, updateItem, unregisterNode, select }),
    [registerNode, updateItem, unregisterNode, select]
  );

  // A tab panel starting or finishing its exit changes nothing about
  // registration, so no React update would tell us the set of *present* items
  // moved. Watch the two presence attributes instead — the only coupling
  // between Selection and whatever hides a subtree.
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(
    () => observePresence(rootRef.current, scheduleSync),
    [scheduleSync]
  );

  const state = useMemo<State>(
    () => ({ selectedId, orderedIds, deferredIds }),
    [selectedId, orderedIds, deferredIds]
  );

  const liveItem =
    selectedId === undefined
      ? null
      : (nodesRef.current.get(selectedId)?.item ?? null);
  const index = selectedId === undefined ? -1 : orderedIds.indexOf(selectedId);

  // Card presence. Selection itself is never delayed — markers highlight and
  // tooltips open with no lag. Only the *published* item lingers, and only
  // when it would otherwise go to nothing, so a card bound to it can fade out.
  const [heldItem, setHeldItem] = useState<unknown>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastItemRef = useRef<unknown>(null);
  const hasItem = selectedId !== undefined;

  if (liveItem !== null) {
    lastItemRef.current = liveItem;
  }

  useEffect(() => {
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (hasItem) {
      setHeldItem(null);

      return undefined;
    }
    if (exitDuration <= 0) {
      setHeldItem(null);

      return undefined;
    }
    setHeldItem(prev => prev ?? lastItemRef.current);
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      setHeldItem(null);
    }, exitDuration);

    return () => {
      if (holdTimerRef.current !== null) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };
  }, [hasItem, exitDuration]);

  const publishedItem = liveItem ?? heldItem ?? null;
  // 'enter' on the commit where the published item changes, 'open' one frame
  // later — that flip is what lets a CSS transition run on the incoming card;
  // 'exit' while the last item is only being held for its fade-out.
  // Keyed on the payload, not the item's identity: what the card shows is what
  // should re-animate. A tab switch that lands on a marker with the same
  // payload — the resort pin that appears in every tab — is not a change, so
  // the card holds still.
  const phase = useSwapPhase(
    serialize(publishedItem),
    liveItem === null && publishedItem !== null,
    swapDuration
  );

  return (
    <HandlersCtx.Provider value={handlers}>
      <StateCtx.Provider value={state}>
        <DataProvider
          name="selection"
          data={{
            item: publishedItem,
            index,
            count: orderedIds.length,
            phase,
          }}
        >
          <div
            ref={rootRef}
            className={[styles.provider, className].filter(Boolean).join(' ')}
            style={
              {
                '--selection-stagger': `${stagger}ms`,
                '--exit-duration': `${exitDuration}ms`,
              } as CSSProperties
            }
          >
            {children}
          </div>
        </DataProvider>
      </StateCtx.Provider>
    </HandlersCtx.Provider>
  );
}

// ---- SelectionItem ----------------------------------------------------

export type SelectionItemProps = {
  className?: string;
  children?: ReactNode;
  // Payload published as `$ctx.selection.item` while this item is selected.
  item?: unknown;
  selectOn?: SelectOn;
};

export function SelectionItem(props: SelectionItemProps) {
  const { className, children, item, selectOn = 'both' } = props;
  const handlers = useContext(HandlersCtx);
  const state = useContext(StateCtx);
  const id = useId();
  const ref = useRef<HTMLDivElement | null>(null);
  const isSelected = state?.selectedId === id;
  const index = state?.orderedIds.indexOf(id) ?? -1;
  // Deferred = this item's subtree is hidden or animating out. The provider
  // has already dropped it from `orderedIds`, so it renders in `exit`.
  const deferred = !!state?.deferredIds.includes(id);
  const phase = usePhase(!deferred);
  // Once an item leaves `orderedIds` its index is -1; freeze the last real one
  // so a stagger delay built on it does not jump mid-exit.
  const frozenIndexRef = useRef(0);

  if (index >= 0) {
    frozenIndexRef.current = index;
  }
  // Register once per mount; payload changes go through updateItem. Authors
  // typically bind `item` to an inline object (a new reference every render),
  // so the update effect keys on the serialized value, not the reference.
  const itemRef = useRef(item);

  itemRef.current = item;
  const serialized = serialize(item);

  useEffect(() => {
    if (!handlers) {
      return undefined;
    }
    handlers.registerNode(id, { item: itemRef.current, node: ref.current });

    return () => handlers.unregisterNode(id);
  }, [handlers, id]);

  useEffect(() => {
    handlers?.updateItem(id, itemRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlers, id, serialized]);

  const select = () => handlers?.select(id);
  const onPress = selectOn === 'press' || selectOn === 'both';
  const onHover = selectOn === 'hover' || selectOn === 'both';

  // Capture phase: the wrapped content is often a press-managed component
  // (react-aria `usePress` in TooltipWrapper stops click propagation by
  // default), so a bubbling `onClick` here would never fire.
  return (
    <div
      ref={ref}
      className={[styles.item, className].filter(Boolean).join(' ')}
      data-selected={isSelected ? 'true' : 'false'}
      data-phase={phase}
      style={{ '--selection-index': frozenIndexRef.current } as CSSProperties}
      onClickCapture={onPress ? select : undefined}
      onPointerEnter={onHover ? select : undefined}
    >
      <DataProvider name="selectionItem" data={{ isSelected, index, phase }}>
        {children}
      </DataProvider>
    </div>
  );
}
