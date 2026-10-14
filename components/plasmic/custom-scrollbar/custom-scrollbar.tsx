'use client';

// CustomScrollbar — Plasmic code component. Replaces native scrollbars on
// its viewport with an overlay track + draggable thumb. Native scrolling
// (wheel, keyboard, touch) is preserved — the overlay just visualizes the
// scroll state and provides a drag affordance.
//
// `dragToScroll` adds mouse grab-panning of the content itself (touch
// already pans natively). A drag swallows the click it ends on and takes
// pointer capture, so press-managed children (markers, links) don't fire.
//
// Author DX: drop around any element that needs scrolling; ensure the
// parent constrains height/width so native `overflow: auto` on the
// viewport actually kicks in.

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

import styles from './custom-scrollbar.module.css';

const MIN_THUMB = 24;
// Mouse travel (px) before a press on the content counts as a pan rather
// than a click.
const DRAG_THRESHOLD = 4;

export type ScrollbarOrientation = 'vertical' | 'horizontal' | 'both';

export type CustomScrollbarProps = {
  children?: ReactNode;
  className?: string;
  orientation?: ScrollbarOrientation;
  // Mouse click-and-drag on the content pans it (touch pans natively).
  dragToScroll?: boolean;
  thumbColor?: string;
  thumbHoverColor?: string;
  trackColor?: string;
  thumbWidth?: number;
  thumbRadius?: number;
  autoHide?: boolean;
  autoHideDelay?: number;
};

type ThumbState = {
  size: number;
  offset: number;
  needsBar: boolean;
};

function computeThumb(
  scrollPos: number,
  clientSize: number,
  scrollSize: number
): ThumbState {
  if (scrollSize <= clientSize) {
    return { size: 0, offset: 0, needsBar: false };
  }
  const ratio = clientSize / scrollSize;
  const size = Math.max(MIN_THUMB, clientSize * ratio);
  const trackSize = clientSize;
  const maxThumbOffset = trackSize - size;
  const maxScroll = scrollSize - clientSize;
  const offset = maxScroll > 0 ? (scrollPos / maxScroll) * maxThumbOffset : 0;

  return { size, offset, needsBar: true };
}

export default function CustomScrollbar(props: CustomScrollbarProps) {
  const {
    children,
    className,
    orientation = 'vertical',
    dragToScroll = false,
    thumbColor = '#cfbba0',
    thumbHoverColor = '#a89777',
    trackColor = 'transparent',
    thumbWidth = 6,
    thumbRadius = 3,
    autoHide = true,
    autoHideDelay = 800,
  } = props;

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const vThumbRef = useRef<HTMLDivElement | null>(null);
  const hThumbRef = useRef<HTMLDivElement | null>(null);

  const [vThumb, setVThumb] = useState<ThumbState>({
    size: 0,
    offset: 0,
    needsBar: false,
  });
  const [hThumb, setHThumb] = useState<ThumbState>({
    size: 0,
    offset: 0,
    needsBar: false,
  });
  const [active, setActive] = useState(false);
  const [draggingAxis, setDraggingAxis] = useState<'v' | 'h' | null>(null);

  const showVertical = orientation === 'vertical' || orientation === 'both';
  const showHorizontal = orientation === 'horizontal' || orientation === 'both';

  const measure = useCallback(() => {
    const el = viewportRef.current;

    if (!el) {
      return;
    }
    if (showVertical) {
      setVThumb(computeThumb(el.scrollTop, el.clientHeight, el.scrollHeight));
    }
    if (showHorizontal) {
      setHThumb(computeThumb(el.scrollLeft, el.clientWidth, el.scrollWidth));
    }
  }, [showVertical, showHorizontal]);

  // Auto-hide bar after `autoHideDelay` of no interaction.
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wake = useCallback(() => {
    setActive(true);
    if (!autoHide) {
      return;
    }
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      setActive(false);
      hideTimerRef.current = null;
    }, autoHideDelay);
  }, [autoHide, autoHideDelay]);

  useEffect(
    () => () => {
      if (hideTimerRef.current !== null) {
        clearTimeout(hideTimerRef.current);
      }
    },
    []
  );

  // Measure on mount + when viewport or content resizes.
  useLayoutEffect(() => {
    const el = viewportRef.current;

    if (!el) {
      return undefined;
    }
    measure();
    const ro = new ResizeObserver(() => measure());

    ro.observe(el);
    Array.from(el.children).forEach(child => {
      if (child instanceof HTMLElement) {
        ro.observe(child);
      }
    });

    return () => ro.disconnect();
  }, [measure]);

  // Track scroll.
  useEffect(() => {
    const el = viewportRef.current;

    if (!el) {
      return undefined;
    }
    const onScroll = () => {
      measure();
      wake();
    };

    el.addEventListener('scroll', onScroll, { passive: true });

    return () => el.removeEventListener('scroll', onScroll);
  }, [measure, wake]);

  // If `autoHide` is off, keep the bar always visible.
  useEffect(() => {
    if (!autoHide) {
      setActive(true);
    }
  }, [autoHide]);

  // Drag handlers — capture pointer on thumb, map delta to scrollPos.
  const startDrag = useCallback(
    (axis: 'v' | 'h', e: ReactPointerEvent<HTMLDivElement>) => {
      const viewport = viewportRef.current;
      const thumbEl = axis === 'v' ? vThumbRef.current : hThumbRef.current;

      if (!viewport || !thumbEl) {
        return;
      }
      e.preventDefault();
      thumbEl.setPointerCapture(e.pointerId);
      setDraggingAxis(axis);

      const startPointer = axis === 'v' ? e.clientY : e.clientX;
      const startScroll =
        axis === 'v' ? viewport.scrollTop : viewport.scrollLeft;
      const clientSize =
        axis === 'v' ? viewport.clientHeight : viewport.clientWidth;
      const scrollSize =
        axis === 'v' ? viewport.scrollHeight : viewport.scrollWidth;
      const state = axis === 'v' ? vThumb : hThumb;
      const trackSize = clientSize;
      const maxThumbOffset = trackSize - state.size;
      const maxScroll = scrollSize - clientSize;

      const onMove = (ev: PointerEvent) => {
        const currentPointer = axis === 'v' ? ev.clientY : ev.clientX;
        const delta = currentPointer - startPointer;

        if (maxThumbOffset <= 0) {
          return;
        }
        const scrollDelta = (delta / maxThumbOffset) * maxScroll;
        const next = Math.max(
          0,
          Math.min(startScroll + scrollDelta, maxScroll)
        );

        if (axis === 'v') {
          viewport.scrollTop = next;
        } else {
          viewport.scrollLeft = next;
        }
        wake();
      };

      const onUp = () => {
        thumbEl.releasePointerCapture(e.pointerId);
        thumbEl.removeEventListener('pointermove', onMove);
        thumbEl.removeEventListener('pointerup', onUp);
        thumbEl.removeEventListener('pointercancel', onUp);
        setDraggingAxis(null);
      };

      thumbEl.addEventListener('pointermove', onMove);
      thumbEl.addEventListener('pointerup', onUp);
      thumbEl.addEventListener('pointercancel', onUp);
    },
    [vThumb, hThumb, wake]
  );

  // Content panning (dragToScroll). Listeners go on window so the pan
  // survives the pointer leaving the viewport; pointer capture moves the
  // pointerup away from whatever child the drag started on.
  const [panning, setPanning] = useState(false);
  const suppressClickRef = useRef(false);

  const onViewportPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const viewport = viewportRef.current;

      if (
        !dragToScroll ||
        !viewport ||
        e.pointerType !== 'mouse' ||
        e.button !== 0
      ) {
        return;
      }
      const { pointerId } = e;
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = viewport.scrollLeft;
      const startTop = viewport.scrollTop;
      let moved = false;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        if (
          !moved &&
          Math.abs(dx) < DRAG_THRESHOLD &&
          Math.abs(dy) < DRAG_THRESHOLD
        ) {
          return;
        }
        if (!moved) {
          moved = true;
          setPanning(true);
          try {
            viewport.setPointerCapture(pointerId);
          } catch {
            // Capture is best-effort (unsupported in some test DOMs).
          }
        }
        if (showHorizontal) {
          viewport.scrollLeft = startLeft - dx;
        }
        if (showVertical) {
          viewport.scrollTop = startTop - dy;
        }
        wake();
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        if (moved) {
          // The click that ends a pan must not select/press anything.
          suppressClickRef.current = true;
          setPanning(false);
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [dragToScroll, showHorizontal, showVertical, wake]
  );

  const onViewportClickCapture = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        e.stopPropagation();
        e.preventDefault();
      }
    },
    []
  );

  const rootStyle = {
    ['--scrollbar-thumb' as string]: thumbColor,
    ['--scrollbar-thumb-hover' as string]: thumbHoverColor,
    ['--scrollbar-track' as string]: trackColor,
    ['--scrollbar-thumb-width' as string]: `${thumbWidth}px`,
    ['--scrollbar-thumb-radius' as string]: `${thumbRadius}px`,
  } as CSSProperties;

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={rootStyle}
      onPointerEnter={wake}
    >
      <div
        ref={viewportRef}
        className={[
          styles.viewport,
          dragToScroll ? styles.pannable : '',
          panning ? styles.panning : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onPointerDown={dragToScroll ? onViewportPointerDown : undefined}
        onClickCapture={dragToScroll ? onViewportClickCapture : undefined}
        // Native image/link drag would hijack the pan.
        onDragStart={dragToScroll ? e => e.preventDefault() : undefined}
      >
        {children}
      </div>
      {showVertical && vThumb.needsBar && (
        <div
          className={[
            styles.track,
            styles.trackVertical,
            active ? styles.visible : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div
            ref={vThumbRef}
            className={[
              styles.thumb,
              styles.thumbVertical,
              draggingAxis === 'v' ? styles.dragging : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              height: vThumb.size,
              transform: `translateY(${vThumb.offset}px)`,
            }}
            onPointerDown={e => startDrag('v', e)}
          />
        </div>
      )}
      {showHorizontal && hThumb.needsBar && (
        <div
          className={[
            styles.track,
            styles.trackHorizontal,
            active ? styles.visible : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div
            ref={hThumbRef}
            className={[
              styles.thumb,
              styles.thumbHorizontal,
              draggingAxis === 'h' ? styles.dragging : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              width: hThumb.size,
              transform: `translateX(${hThumb.offset}px)`,
            }}
            onPointerDown={e => startDrag('h', e)}
          />
        </div>
      )}
    </div>
  );
}
