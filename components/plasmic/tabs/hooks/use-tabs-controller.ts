'use client';

// Controller hook for TabsContainer — mirrors @plasmicpkgs/plasmic-tabs's
// `useTabsData`, plus the node registry the accessibility layer needs.
//
// Upstream keeps only `{ tabKey, bbox, mountMode }` in context. We keep the
// same selection model (uncontrolled state seeded from `initialKey`, canvas
// preview override) and add a registry of the live TabButton/TabContent DOM
// nodes, because keyboard nav has to walk the buttons in *document* order and
// TabUnderline has to measure the active one.
//
// CONTEXT SPLIT (HandlersCtx + StateCtx) is deliberate:
//   - HandlersCtx values are stable fn refs (empty-deps useCallback).
//     Effects can list handlers in deps safely.
//   - StateCtx values are reactive. Consumers re-render on state change
//     but there's no cascade because state changes never invalidate
//     handler identity.
//
// Combining them into a single ctx object memoized on state produces
// "Maximum update depth exceeded" in Plasmic Studio: a child effect whose
// deps include the ctx registers → setState → new ctx identity → effect
// cleanup + re-run → setState → … (components/plasmic/accordion still has
// this shape; fix it when that component gets the same treatment).
//
// INVARIANT: any handler that can call setState must have empty-deps
// identity and must no-op when the resulting value is unchanged.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

export type MountMode = 'mountOneAtATime' | 'mountAllEagerly' | 'mountLazily';
export type TabRole = 'button' | 'panel';

export type TabsRegistry = {
  buttonKeys: string[];
};

export type TabNodeInfo = {
  role: TabRole;
  key: string;
  node: HTMLElement | null;
};

export type TabsHandlers = {
  // Namespaces DOM ids so two Tabs instances using the same key don't
  // collide (which would point aria-controls at the wrong panel).
  uid: string;
  setActiveKey: (key: string) => void;
  registerNode: (id: string, info: TabNodeInfo) => void;
  unregisterNode: (id: string) => void;
  getButtonNode: (key: string | undefined) => HTMLElement | null;
  focusButton: (key: string) => void;
  // Document-ordered, computed lazily at call time. Never stored in state:
  // storing it is the update-depth hazard above, and a stored order is also
  // unobservably stale after a canvas reorder (Studio keys nodes by uuid, so
  // reordering siblings fires no remount and no effect).
  orderedKeys: () => string[];
};

export type TabsState = {
  activeKey: string | undefined;
  mountMode: MountMode;
  previewAll: boolean;
  // How long a panel stays mounted after it stops being active, so its
  // content can animate out. 0 = unmount immediately (default).
  exitDuration: number;
  // Text colour for whichever button is active. One setting for the whole
  // tab set; a TabButton's own `activeColor` still wins over it.
  activeColor: string | undefined;
  registry: TabsRegistry;
};

export const HandlersCtx = createContext<TabsHandlers | undefined>(undefined);
export const StateCtx = createContext<TabsState | undefined>(undefined);

export function useHandlers() {
  return useContext(HandlersCtx);
}
export function useTabsState() {
  return useContext(StateCtx);
}

const EMPTY_REGISTRY: TabsRegistry = { buttonKeys: [] };

function sameList(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

// Detached/portalled nodes make compareDocumentPosition inconsistent, and an
// inconsistent comparator makes Array#sort return garbage silently. Partition
// them out; they keep insertion order.
function inDocumentOrder<T extends { node: HTMLElement | null }>(
  entries: T[]
): T[] {
  const live = entries.filter(e => e.node?.isConnected);
  const rest = entries.filter(e => !e.node?.isConnected);

  live.sort((a, b) =>
    // eslint-disable-next-line no-bitwise
    (a.node as HTMLElement).compareDocumentPosition(b.node as HTMLElement) &
    Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1
  );

  return [...live, ...rest];
}

export type ControllerOpts = {
  activeKeyProp: string | undefined;
  onActiveKeyChange: ((key: string) => void) | undefined;
  initialKey: string | undefined;
  mountMode: MountMode;
  previewKey: string | undefined;
  previewAll: boolean;
  exitDuration: number;
  activeColor: string | undefined;
  inCanvas: boolean;
};

export function useTabsController(opts: ControllerOpts) {
  const {
    activeKeyProp,
    onActiveKeyChange,
    initialKey,
    mountMode,
    previewKey,
    previewAll,
    exitDuration,
    activeColor,
    inCanvas,
  } = opts;

  const uid = useId();
  // Controlled when Studio's `currentTab` state (or code) supplies activeKey;
  // otherwise the component owns the selection, as upstream does.
  const isControlled = activeKeyProp !== undefined;
  const [tabKey, setTabKey] = useState<string | undefined>(initialKey);
  const [registry, setRegistry] = useState<TabsRegistry>(EMPTY_REGISTRY);

  const nodesRef = useRef<Map<string, TabNodeInfo>>(new Map());

  // Ref mirrors keep the handlers empty-deps stable when props change.
  const isControlledRef = useRef(isControlled);

  isControlledRef.current = isControlled;
  const onActiveKeyChangeRef = useRef(onActiveKeyChange);

  onActiveKeyChangeRef.current = onActiveKeyChange;

  // In canvas, live-sync initialKey edits → state so authors see the effect
  // without reloading Studio. In production only the initial mount matters.
  useEffect(() => {
    if (!inCanvas || isControlled || initialKey === undefined) {
      return;
    }
    setTabKey(initialKey);
  }, [initialKey, inCanvas, isControlled]);

  // Upstream does `previewKey || tabKey`, which permanently pins the canvas to
  // previewKey — clicking a tab in interactive preview does nothing. Here the
  // preview key seeds the selection instead, so clicks still win.
  const previewSeededRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (
      !inCanvas ||
      isControlled ||
      !previewKey ||
      previewSeededRef.current === previewKey
    ) {
      return;
    }
    previewSeededRef.current = previewKey;
    setTabKey(previewKey);
  }, [previewKey, inCanvas, isControlled]);

  const activeKey = isControlled ? activeKeyProp : tabKey;

  const entriesOf = useCallback(
    (role: TabRole) =>
      inDocumentOrder(
        Array.from(nodesRef.current.entries())
          .filter(([, info]) => info.role === role)
          .map(([id, info]) => ({ id, ...info }))
      ),
    []
  );

  const orderedKeys = useCallback(
    () => entriesOf('button').map(e => e.key),
    [entriesOf]
  );

  const setActiveKey = useCallback((key: string) => {
    if (!isControlledRef.current) {
      setTabKey(key);
    }
    onActiveKeyChangeRef.current?.(key);
  }, []);

  // One reconciliation pass per burst of (un)registrations, after every mount
  // effect in the commit has run. Idempotent and bails when nothing changed,
  // so the pass converges and cannot ping-pong.
  const syncPendingRef = useRef(false);
  const scheduleSync = useCallback(() => {
    if (syncPendingRef.current) {
      return;
    }
    syncPendingRef.current = true;
    queueMicrotask(() => {
      syncPendingRef.current = false;

      const nextRegistry: TabsRegistry = {
        buttonKeys: entriesOf('button').map(e => e.key),
      };

      setRegistry(prev =>
        sameList(prev.buttonKeys, nextRegistry.buttonKeys) ? prev : nextRegistry
      );
    });
  }, [entriesOf]);

  const registerNode = useCallback(
    (id: string, info: TabNodeInfo) => {
      nodesRef.current.set(id, info);
      scheduleSync();
    },
    [scheduleSync]
  );

  const unregisterNode = useCallback(
    (id: string) => {
      nodesRef.current.delete(id);
      scheduleSync();
    },
    [scheduleSync]
  );

  const getButtonNode = useCallback((key: string | undefined) => {
    if (!key) {
      return null;
    }
    let found: HTMLElement | null = null;

    nodesRef.current.forEach(info => {
      if (!found && info.role === 'button' && info.key === key) {
        found = info.node;
      }
    });

    return found;
  }, []);

  const focusButton = useCallback(
    (key: string) => {
      getButtonNode(key)?.focus();
    },
    [getButtonNode]
  );

  const handlers = useMemo<TabsHandlers>(
    () => ({
      uid,
      setActiveKey,
      registerNode,
      unregisterNode,
      getButtonNode,
      focusButton,
      orderedKeys,
    }),
    [
      uid,
      setActiveKey,
      registerNode,
      unregisterNode,
      getButtonNode,
      focusButton,
      orderedKeys,
    ]
  );

  const state = useMemo<TabsState>(
    () => ({
      activeKey,
      mountMode,
      previewAll: inCanvas && previewAll,
      exitDuration,
      activeColor,
      registry,
    }),
    [
      activeKey,
      mountMode,
      previewAll,
      exitDuration,
      activeColor,
      inCanvas,
      registry,
    ]
  );

  return { handlers, state, activeKey };
}
