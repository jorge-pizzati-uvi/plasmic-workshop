'use client';

// Accordion — Plasmic code component. Three-component surface (mirrors Tabs):
//   AccordionContainer + AccordionButton + AccordionContent
//
// WCAG 2.1 AA:
//  - Header buttons are all in the tab order (Tab / Shift+Tab).
//  - Arrow Down/Up moves focus between header buttons; Home/End jumps to
//    first/last. Enter/Space toggle (native button behavior).
//  - Buttons emit aria-expanded, aria-controls; content emits role=region,
//    aria-labelledby, hidden when closed.
//
// Modes: `single` (one item open at a time) or `multiple` (any number).
// Author-DX: itemKey pairs a button with its content, matching Tabs pattern.

import { DataProvider, usePlasmicCanvasContext } from '@plasmicapp/host';
import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';

export type AccordionMode = 'single' | 'multiple';
export type MountMode = 'mountOneAtATime' | 'mountAllEagerly' | 'mountLazily';

export type AccordionContainerMethods = {
  /** Accepts a JSON array string (e.g. `["item-1","item-2"]`) or an array. */
  setOpenKeys: (keys: string | string[]) => void;
  getOpenKeys: () => string[];
  openItem: (key: string) => void;
  closeItem: (key: string) => void;
  toggleItem: (key: string) => void;
};

type AccordionContextValue = {
  openKeys: string[];
  toggle: (key: string) => void;
  registerButton: (key: string, node: HTMLButtonElement | null) => void;
  focusButton: (key: string) => void;
  orderedKeys: () => string[];
  mode: AccordionMode;
  mountMode: MountMode;
  enableKeyboardNav: boolean;
  previewAll: boolean;
  // Every AccordionButton + AccordionContent registers its authored
  // itemKey here so sibling code components' Studio pickers can show the
  // full known-key list. See plasmic-docs/props-and-data.md (Pattern D).
  registerDeclaredKey: (key: string) => () => void;
  declaredKeys: string[];
};

export type AccordionItemKeyControlContextData = {
  knownItemKeys: { label: string; value: string }[];
};

const AccordionContext = createContext<AccordionContextValue | undefined>(
  undefined
);

export function useAccordionContext(): AccordionContextValue | undefined {
  return useContext(AccordionContext);
}

function parseKeyList(input: string | undefined): string[] {
  if (!input) {
    return [];
  }
  try {
    const parsed = JSON.parse(input);

    if (Array.isArray(parsed)) {
      return parsed.filter((k): k is string => typeof k === 'string');
    }
  } catch {
    // fall through
  }

  return input
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function stringifyKeys(keys: string[]): string {
  return JSON.stringify(keys);
}

export type AccordionContainerProps = {
  className?: string;
  children?: ReactNode;
  mode?: AccordionMode;
  /** Controlled open keys (JSON array string). */
  openKeys?: string;
  defaultOpenKeys?: string;
  onOpenKeysChange?: (keys: string) => void;
  mountMode?: MountMode;
  enableKeyboardNav?: boolean;
  /** Reveal all panels while editing in Studio. */
  previewAll?: boolean;
  /** Studio-managed ordered key list (parallel to Tabs pattern). */
  itemKeys?: string;
  onItemKeysChange?: (keys: string) => void;
};

const AccordionContainer = forwardRef<
  AccordionContainerMethods,
  AccordionContainerProps
>((props, userRef: Ref<AccordionContainerMethods>) => {
  const {
    className,
    children,
    mode = 'single',
    openKeys: openKeysProp,
    defaultOpenKeys,
    onOpenKeysChange,
    mountMode = 'mountOneAtATime',
    enableKeyboardNav = true,
    previewAll = false,
  } = props;

  const inCanvas = !!usePlasmicCanvasContext();
  const controlled = openKeysProp !== undefined;
  const [internal, setInternal] = useState<string[]>(() =>
    parseKeyList(controlled ? openKeysProp : defaultOpenKeys)
  );
  const openKeys = controlled ? parseKeyList(openKeysProp) : internal;

  const buttonsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const orderRef = useRef<string[]>([]);
  const declaredCountsRef = useRef<Map<string, number>>(new Map());
  const [declaredKeys, setDeclaredKeys] = useState<string[]>([]);

  const registerDeclaredKey = useCallback((key: string) => {
    if (!key) {
      return () => undefined;
    }
    const counts = declaredCountsRef.current;
    const nextCount = (counts.get(key) ?? 0) + 1;

    counts.set(key, nextCount);
    if (nextCount === 1) {
      setDeclaredKeys(prev => (prev.includes(key) ? prev : [...prev, key]));
    }

    return () => {
      const remaining = (counts.get(key) ?? 1) - 1;

      if (remaining <= 0) {
        counts.delete(key);
        setDeclaredKeys(prev => prev.filter(k => k !== key));
      } else {
        counts.set(key, remaining);
      }
    };
  }, []);

  const commit = useCallback(
    (next: string[]) => {
      if (!controlled) {
        setInternal(next);
      }
      onOpenKeysChange?.(stringifyKeys(next));
    },
    [controlled, onOpenKeysChange]
  );

  const toggle = useCallback(
    (key: string) => {
      const isOpen = openKeys.includes(key);

      if (mode === 'single') {
        commit(isOpen ? [] : [key]);
      } else {
        commit(isOpen ? openKeys.filter(k => k !== key) : [...openKeys, key]);
      }
    },
    [commit, mode, openKeys]
  );

  const registerButton = useCallback(
    (key: string, node: HTMLButtonElement | null) => {
      if (node) {
        buttonsRef.current.set(key, node);
        if (!orderRef.current.includes(key)) {
          orderRef.current = [...orderRef.current, key];
        }
      } else {
        buttonsRef.current.delete(key);
        orderRef.current = orderRef.current.filter(k => k !== key);
      }
    },
    []
  );

  const focusButton = useCallback((key: string) => {
    const node = buttonsRef.current.get(key);

    if (node) {
      node.focus();
    }
  }, []);

  const orderedKeys = useCallback(() => orderRef.current.slice(), []);

  useImperativeHandle(
    userRef,
    () => ({
      setOpenKeys: (keys: string | string[]) => {
        const list = Array.isArray(keys) ? keys : parseKeyList(keys);

        commit(list);
      },
      getOpenKeys: () => openKeys,
      openItem: (key: string) => {
        if (openKeys.includes(key)) {
          return;
        }
        if (mode === 'single') {
          commit([key]);
        } else {
          commit([...openKeys, key]);
        }
      },
      closeItem: (key: string) => {
        if (!openKeys.includes(key)) {
          return;
        }
        commit(openKeys.filter(k => k !== key));
      },
      toggleItem: toggle,
    }),
    [commit, mode, openKeys, toggle]
  );

  const ctxValue = useMemo<AccordionContextValue>(
    () => ({
      openKeys,
      toggle,
      registerButton,
      focusButton,
      orderedKeys,
      mode,
      mountMode,
      enableKeyboardNav,
      previewAll: previewAll && inCanvas,
      registerDeclaredKey,
      declaredKeys,
    }),
    [
      openKeys,
      toggle,
      registerButton,
      focusButton,
      orderedKeys,
      mode,
      mountMode,
      enableKeyboardNav,
      previewAll,
      inCanvas,
      registerDeclaredKey,
      declaredKeys,
    ]
  );

  return (
    <DataProvider name="accordion" data={{ openKeys }}>
      <AccordionContext.Provider value={ctxValue}>
        <div className={className} data-accordion-mode={mode}>
          {children}
        </div>
      </AccordionContext.Provider>
    </DataProvider>
  );
});

AccordionContainer.displayName = 'AccordionContainer';

// ---- AccordionButton ---------------------------------------------------

export type AccordionButtonProps = {
  className?: string;
  itemKey?: string;
  children?: ReactNode;
  // Studio-only injected callback. See plasmic-docs/props-and-data.md (Pattern D).
  setControlContextData?: (data: AccordionItemKeyControlContextData) => void;
};

export function AccordionButton({
  className,
  itemKey,
  children,
  setControlContextData,
}: AccordionButtonProps) {
  const ctx = useAccordionContext();
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const key = itemKey ?? '';
  const isOpen = ctx ? ctx.openKeys.includes(key) : false;

  useEffect(() => {
    if (!ctx || !key) {
      return undefined;
    }
    ctx.registerButton(key, buttonRef.current);

    return () => ctx.registerButton(key, null);
  }, [ctx, key]);

  // Register this button's declared itemKey with the container so sibling
  // AccordionButton/AccordionContent pickers see it. Cleanup on unmount /
  // key change removes it (ref-counted so duplicate keys stay listed).
  useEffect(() => {
    if (!ctx || !key) {
      return undefined;
    }

    return ctx.registerDeclaredKey(key);
  }, [ctx, key]);

  // Publish known-key list to this button's Studio picker.
  useEffect(() => {
    if (!setControlContextData) {
      return;
    }
    setControlContextData({
      knownItemKeys: (ctx?.declaredKeys ?? []).map(k => ({
        label: k,
        value: k,
      })),
    });
  }, [setControlContextData, ctx?.declaredKeys]);

  const onClick = useCallback(() => {
    if (ctx && key) {
      ctx.toggle(key);
    }
  }, [ctx, key]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (!ctx || !ctx.enableKeyboardNav) {
        return;
      }
      const keys = ctx.orderedKeys();
      const idx = keys.indexOf(key);

      if (idx === -1) {
        return;
      }

      let nextKey: string | undefined;

      switch (e.key) {
        case 'ArrowDown':
          nextKey = keys[(idx + 1) % keys.length];
          break;
        case 'ArrowUp':
          nextKey = keys[(idx - 1 + keys.length) % keys.length];
          break;
        case 'Home':
          nextKey = keys[0];
          break;
        case 'End':
          nextKey = keys[keys.length - 1];
          break;
        default:
          return;
      }
      if (nextKey) {
        e.preventDefault();
        ctx.focusButton(nextKey);
      }
    },
    [ctx, key]
  );

  const panelId = `accordion-panel-${key}`;
  const buttonId = `accordion-button-${key}`;

  return (
    <button
      ref={buttonRef}
      type="button"
      id={buttonId}
      className={className}
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-expanded={isOpen}
      aria-controls={panelId}
      data-open={isOpen ? 'true' : 'false'}
    >
      {children}
    </button>
  );
}

AccordionButton.displayName = 'AccordionButton';

// ---- AccordionContent --------------------------------------------------

export type AccordionContentProps = {
  className?: string;
  itemKey?: string;
  children?: ReactNode;
  setControlContextData?: (data: AccordionItemKeyControlContextData) => void;
};

export function AccordionContent({
  className,
  itemKey,
  children,
  setControlContextData,
}: AccordionContentProps) {
  const ctx = useAccordionContext();
  const key = itemKey ?? '';
  const isOpen = ctx ? ctx.openKeys.includes(key) : false;
  const showInPreview = ctx?.previewAll ?? false;
  const visible = isOpen || showInPreview;

  useEffect(() => {
    if (!ctx || !key) {
      return undefined;
    }

    return ctx.registerDeclaredKey(key);
  }, [ctx, key]);

  useEffect(() => {
    if (!setControlContextData) {
      return;
    }
    setControlContextData({
      knownItemKeys: (ctx?.declaredKeys ?? []).map(k => ({
        label: k,
        value: k,
      })),
    });
  }, [setControlContextData, ctx?.declaredKeys]);

  const everOpenedRef = useRef(false);

  if (visible) {
    everOpenedRef.current = true;
  }

  const mountMode: MountMode = ctx?.mountMode ?? 'mountOneAtATime';

  const shouldRender = (() => {
    switch (mountMode) {
      case 'mountAllEagerly':
        return true;
      case 'mountLazily':
        return everOpenedRef.current;
      case 'mountOneAtATime':
      default:
        return visible;
    }
  })();

  const panelId = `accordion-panel-${key}`;
  const buttonId = `accordion-button-${key}`;

  return (
    <div
      id={panelId}
      role="region"
      aria-labelledby={buttonId}
      className={className}
      hidden={!visible}
      data-open={isOpen ? 'true' : 'false'}
    >
      {shouldRender ? children : null}
    </div>
  );
}

AccordionContent.displayName = 'AccordionContent';

export default AccordionContainer;
