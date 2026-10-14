'use client';

// Tabs — Plasmic code component. Vendored fork of @plasmicpkgs/plasmic-tabs,
// matching upstream's surface 1:1: TabsContainer + TabButton + TabContent +
// TabUnderline, one `children` slot (buttons, panels and anything shared
// across tabs laid out freely), `tabKey` strings, `initialKey` / `previewKey`
// / `previewAll` / `mountMode`, and `$ctx.currentTabKey`.
//
// Two structural differences: the container renders a wrapper div (see
// below), and TabButton does not clone its slot child with `isActive` +
// `onClick`. Upstream needs that because its trigger div has no onClick of
// its own; ours does, and slot content reads `$ctx.tabButton.isActive`
// instead (Plasmic wraps slot children in the canvas, so cloned props never
// reached the author's component there anyway).
//
// Deliberate additions beyond upstream:
//  - ARIA/keyboard (below).
//  - A writable Studio state, so `currentTab` can be set from interactions
//    elsewhere on the page — `$ctx.currentTabKey` is read-only.
//  - `activeColor`: Studio cannot style slot text conditionally on the active
//    state, so this one style is a prop. Set it once on TabsContainer for the
//    whole set; a TabButton's own `activeColor` overrides it for that button.
//    The active button applies it inline — a stylesheet rule loses to the
//    author's own colour on the button.
//  - Insert templates ("Underline" / "Pill") in the registration carry the two
//    looks authored in Studio as explicit element styles, so every value is
//    visible and overridable in the style panel. No look ships in CSS.
//
// The accessibility layer, which upstream has none of:
//  - ARIA (role=tab / tabpanel, aria-selected, aria-controls,
//    aria-labelledby), with ids namespaced per container instance.
//  - Keyboard nav (Left/Right, Home, End) with roving tabindex, in document
//    order, plus Enter/Space activation (the tab is a div, not a button).
//
// Three upstream bugs are also fixed here:
//  - `mountMode` is forwarded (upstream registers the prop and drops it).
//  - `previewKey` seeds the canvas selection instead of pinning it, so tabs
//    stay clickable in interactive preview.
//  - TabUnderline measures itself instead of having every TabButton push a
//    bbox into shared state (which re-rendered every button and panel on each
//    measurement, and looped against Plasmic's fresh slot refs).
//
// State + context split lives in hooks/use-tabs-controller.ts.

import { DataProvider, usePlasmicCanvasContext } from '@plasmicapp/host';
import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import type { Phase } from '../_shared';
import styles from './tabs.module.css';
import {
  HandlersCtx,
  StateCtx,
  useHandlers,
  useTabsState,
  useTabsController,
  type MountMode,
} from './hooks/use-tabs-controller';

export type { MountMode };

// ---- TabsContainer ----------------------------------------------------

export type TabsContainerProps = {
  className?: string;
  children?: ReactNode;
  initialKey?: string;
  // Controlled pair backing Studio's writable `currentTab` state. Leave
  // `activeKey` undefined and the component owns its selection, as upstream
  // does; bind the state and Studio drives it.
  activeKey?: string;
  onActiveKeyChange?: (key: string) => void;
  previewKey?: string;
  previewAll?: boolean;
  mountMode?: MountMode;
  // Keep a panel mounted this many ms after it stops being active, so its
  // content can animate out while the incoming panel animates in. 0 (default)
  // unmounts immediately. Panels expose `data-phase` / `$ctx.tabContent.phase`
  // for the author to bind a variant to; the motion is authored in Studio.
  exitDuration?: number;
  // Text colour for whichever button is active, for the whole tab set. Set it
  // once here instead of on every TabButton; a button's own `activeColor`
  // still wins. Reaches the buttons through context and is applied inline by
  // the active one — a stylesheet rule would lose to the author's own colour
  // on the button, which is why this style is a prop at all.
  activeColor?: string;
};

// Unlike upstream, this renders a wrapper div and applies Plasmic's
// `className`. Upstream renders nothing (`styleSections: false`), but that
// className also carries the token-scope classes that define `--token-*`, so
// dropping it leaves every descendant's var() unresolved.
export default function TabsContainer(props: TabsContainerProps) {
  const {
    className,
    children,
    initialKey,
    activeKey: activeKeyProp,
    onActiveKeyChange,
    previewKey,
    previewAll = false,
    mountMode = 'mountOneAtATime',
    exitDuration = 0,
    activeColor,
  } = props;

  const inCanvas = !!usePlasmicCanvasContext();
  const { handlers, state, activeKey } = useTabsController({
    activeKeyProp,
    onActiveKeyChange,
    initialKey,
    mountMode,
    previewKey,
    previewAll,
    exitDuration,
    activeColor,
    inCanvas,
  });

  return (
    <HandlersCtx.Provider value={handlers}>
      <StateCtx.Provider value={state}>
        <DataProvider name="currentTabKey" data={activeKey}>
          <div
            className={[styles.container, className].filter(Boolean).join(' ')}
          >
            {children}
          </div>
        </DataProvider>
      </StateCtx.Provider>
    </HandlersCtx.Provider>
  );
}

// ---- shared child wiring ----------------------------------------------

// Registers this child's DOM node with the container, which is what drives
// document-order keyboard nav and the underline's measurement.
function useRegisterNode(
  id: string,
  role: 'button' | 'panel',
  key: string,
  ref: React.RefObject<HTMLElement>
) {
  const handlers = useHandlers();

  useEffect(() => {
    if (!handlers) {
      return undefined;
    }
    handlers.registerNode(id, { role, key, node: ref.current });

    return () => handlers.unregisterNode(id);
    // `ref` is stable; `key` changes when the author renames a tab.
  }, [handlers, id, role, key, ref]);
}

// ---- TabButton --------------------------------------------------------

export type TabButtonProps = {
  className?: string;
  children?: ReactNode;
  tabKey?: string;
  // Text colour while active, for this button only. Overrides the container's
  // `activeColor`; leave it unset and the container's value applies. Inline
  // (see render) so it beats the author's Studio colour on this button.
  activeColor?: string;
};

export function TabButton(props: TabButtonProps) {
  const { className, children, tabKey, activeColor } = props;
  const handlers = useHandlers();
  const state = useTabsState();
  const id = useId();
  const key = (tabKey ?? '').trim();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const active = !!key && state?.activeKey === key;
  // Own value first, then the one setting on the container. Studio's colour
  // control has no hint state, so an inheriting button shows an empty swatch;
  // the prop description says so.
  const resolvedActiveColor = activeColor ?? state?.activeColor;

  useRegisterNode(id, 'button', key, buttonRef);

  const select = () => {
    if (key) {
      handlers?.setActiveKey(key);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!handlers || !key) {
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select();

      return;
    }
    const keys = handlers.orderedKeys();

    if (keys.length === 0) {
      return;
    }
    const idx = keys.indexOf(key);
    let targetKey: string | undefined;

    switch (e.key) {
      case 'ArrowRight':
        targetKey = keys[(idx + 1) % keys.length];
        break;
      case 'ArrowLeft':
        targetKey = keys[(idx - 1 + keys.length) % keys.length];
        break;
      case 'Home':
        targetKey = keys[0];
        break;
      case 'End':
        targetKey = keys[keys.length - 1];
        break;
      default:
        return;
    }
    e.preventDefault();
    if (targetKey !== undefined) {
      handlers.setActiveKey(targetKey);
      handlers.focusButton(targetKey);
    }
  };

  // Roving tabindex. When nothing is active yet (initialKey unset or pointing
  // at a tab that doesn't exist), the first button stays reachable by Tab.
  const buttonKeys = state?.registry.buttonKeys ?? [];
  const hasActive =
    state?.activeKey !== undefined && buttonKeys.includes(state.activeKey);
  const focusable = active || (!hasActive && buttonKeys[0] === key);
  const uid = handlers?.uid ?? '';

  return (
    <div
      ref={buttonRef}
      role={key ? 'tab' : undefined}
      id={key ? `${uid}-tab-${key}` : undefined}
      aria-selected={key ? active : undefined}
      aria-controls={key ? `${uid}-panel-${key}` : undefined}
      tabIndex={key && !focusable ? -1 : 0}
      data-tab-key={key || 'unset'}
      data-active={active ? 'true' : 'false'}
      className={[styles.button, className].filter(Boolean).join(' ')}
      style={
        active && resolvedActiveColor
          ? { color: resolvedActiveColor }
          : undefined
      }
      onClick={select}
      onKeyDown={onKeyDown}
    >
      {/* Slot content reacts to this button through `$ctx.tabButton`:
          bind a variant to `$ctx.tabButton.isActive`. */}
      <DataProvider name="tabButton" data={{ tabKey: key, isActive: active }}>
        {children}
      </DataProvider>
    </div>
  );
}

// ---- TabContent -------------------------------------------------------

export type TabContentProps = {
  className?: string;
  children?: ReactNode;
  tabKey?: string;
};

export function TabContent(props: TabContentProps) {
  const { className, children, tabKey } = props;
  const handlers = useHandlers();
  const state = useTabsState();
  const id = useId();
  const key = (tabKey ?? '').trim();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useRegisterNode(id, 'panel', key, panelRef);

  const active = !!key && state?.activeKey === key;
  // No key, or no container: stay visible, so the author sees the content
  // (and the mistake) instead of an empty page.
  const show = !key || state === undefined || active || state.previewAll;
  const [everMounted, setEverMounted] = useState(false);

  useEffect(() => {
    if (show) {
      setEverMounted(true);
    }
  }, [show]);

  const exitDuration = state?.exitDuration ?? 0;

  // Exit window. Derived during render against the previous `show`, not in an
  // effect: an effect leaves one committed frame where the panel is already
  // `hidden` but not yet marked exiting — a visible flash, and a frame where
  // SelectionProvider would treat these items as gone rather than exiting.
  const [exiting, setExiting] = useState(false);
  const prevShowRef = useRef(show);

  if (prevShowRef.current !== show) {
    prevShowRef.current = show;
    const shouldExit = !show && exitDuration > 0;

    if (shouldExit !== exiting) {
      setExiting(shouldExit);
    }
  }

  useEffect(() => {
    if (!exiting) {
      return undefined;
    }
    const timer = setTimeout(() => setExiting(false), exitDuration);

    return () => clearTimeout(timer);
  }, [exiting, exitDuration]);

  const mountMode = state?.mountMode ?? 'mountOneAtATime';
  const shouldRender =
    mountMode === 'mountAllEagerly'
      ? true
      : mountMode === 'mountLazily'
        ? everMounted
        : show || exiting;
  const uid = handlers?.uid ?? '';
  const phase: Phase = show ? 'open' : 'exit';

  return (
    <div
      ref={panelRef}
      role={key ? 'tabpanel' : undefined}
      id={key ? `${uid}-panel-${key}` : undefined}
      aria-labelledby={key ? `${uid}-tab-${key}` : undefined}
      // An exiting panel must not be `display:none` (see `.panel[hidden]`),
      // or there is nothing to animate.
      hidden={!show && !exiting}
      tabIndex={0}
      data-tab-key={key || 'unset'}
      data-exiting={exiting ? 'true' : undefined}
      data-phase={phase}
      style={
        exitDuration > 0
          ? ({
              ['--exit-duration' as string]: `${exitDuration}ms`,
            } as CSSProperties)
          : undefined
      }
      className={[styles.panel, className].filter(Boolean).join(' ')}
    >
      <DataProvider
        name="tabContent"
        data={{ tabKey: key || undefined, isActive: show, phase }}
      >
        {shouldRender ? children : null}
      </DataProvider>
    </div>
  );
}

// ---- TabUnderline -----------------------------------------------------

export type TabUnderlineProps = {
  className?: string;
};

type Box = { left: number; width: number };

function sameBox(a: Box | null, b: Box) {
  return !!a && a.left === b.left && a.width === b.width;
}

// Sliding indicator that positions itself under the active TabButton.
// Self-measuring: it reads the active button's node from the registry rather
// than having every TabButton push a bbox into shared state.
// Place it next to the buttons, inside a position:relative wrapper.
export function TabUnderline(props: TabUnderlineProps) {
  const { className } = props;
  const handlers = useHandlers();
  const state = useTabsState();
  const activeKey = state?.activeKey;
  const registry = state?.registry;
  const ref = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<Box | null>(null);
  const [box, setBox] = useState<Box | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const button = handlers?.getButtonNode(activeKey) ?? null;

    if (!el || !button) {
      boxRef.current = null;
      setBox(null);

      return undefined;
    }

    const measure = () => {
      const parent =
        (el.offsetParent as HTMLElement | null) ?? el.parentElement;
      const parentRect = parent?.getBoundingClientRect();
      const rect = button.getBoundingClientRect();
      const next: Box = {
        left: rect.left - (parentRect?.left ?? 0) + (parent?.scrollLeft ?? 0),
        width: rect.width,
      };

      if (sameBox(boxRef.current, next)) {
        return;
      }
      boxRef.current = next;
      setBox(next);
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const ro = new ResizeObserver(measure);

    ro.observe(button);
    const parent = el.offsetParent as HTMLElement | null;

    if (parent) {
      ro.observe(parent);
    }

    return () => ro.disconnect();
    // `registry` re-measures when buttons mount/unmount around us.
  }, [handlers, activeKey, registry]);

  const style: React.CSSProperties = !box
    ? { position: 'absolute', opacity: 0, pointerEvents: 'none' }
    : {
        position: 'absolute',
        left: box.left,
        width: box.width,
        bottom: 0,
        transition: '0.4s ease all',
      };

  return (
    <div
      ref={ref}
      className={[styles.underline, className].filter(Boolean).join(' ')}
      style={style}
    />
  );
}
