'use client';

// TooltipWrapper — Plasmic code component. Adds interaction + auto-flip
// positioning around Plasmic-authored trigger + popup slots.
//
// Author DX (mirrors StickyWrapper):
//   1. Drop TooltipWrapper.
//   2. Fill `trigger` slot with any Plasmic tree.
//   3. Fill `popup` slot with any Plasmic tree (including a close X).
//   4. On the close X, set HTML attribute `data-tooltip-close`.
//
// Open state is controlled or uncontrolled, decided by whether `open` is
// defined. Bound: the owner's value wins on every render and the tooltip's
// own interactions stop moving it. Unbound: the tooltip owns it. See the
// `isControlled` note in the body for why that also silences onOpenChange.
//
// Wrapper handles: open state, hover (hover-capable devices only),
// press/tap toggle, outside-click dismiss, Escape dismiss, portal to
// body, and collision-aware placement (react-aria useOverlayPosition
// with shouldFlip). Popup root gets `data-placement` (top|bottom|left|
// right after flip) and `data-open-via` (hover|press) so authors can
// key Plasmic variants off those attrs (e.g. arrow direction, close-X
// visibility on press only).

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';
import {
  useHover,
  useInteractOutside,
  useOverlayPosition,
  useOverlayTrigger,
  usePress,
} from 'react-aria';
import { DataProvider } from '@plasmicapp/host';
import {
  CanvasPortal,
  useCanvasOverlay,
  useMediaQuery,
  usePresence,
  useScopeClassName,
} from '../_shared';

export type TooltipPlacement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top start'
  | 'top end'
  | 'bottom start'
  | 'bottom end'
  | 'left top'
  | 'left bottom'
  | 'right top'
  | 'right bottom';

export type TooltipMode = 'hover' | 'press';

export type TooltipWrapperProps = {
  trigger?: ReactNode;
  popup?: ReactNode;
  mode?: TooltipMode;
  placement?: TooltipPlacement;
  offset?: number;
  hoverOpenDelay?: number;
  hoverCloseDelay?: number;
  /** Controlled open state. Defined ⇒ the owner decides what shows, and the
   *  tooltip's own interactions can no longer move it (see `isControlled`
   *  below). Leave undefined and the tooltip manages itself. */
  open?: boolean;
  /** Reports open/close intent. Suppressed while controlled — see the note
   *  on `isControlled` in the body. */
  onOpenChange?: (open: boolean) => void;
  /** Fires on trigger press/tap regardless of `mode`. Independent of
   *  onOpenChange — the tooltip still handles its own open toggle. */
  onPress?: () => void;
  /** Fire when the pointer enters/leaves the trigger, regardless of `mode`
   *  — same contract as `onPress`. Opening on hover stays gated to
   *  `mode='hover'` on a hover-capable device; these only notify. Touch
   *  devices fire neither (react-aria suppresses emulated mouse events). */
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  /** Keep the popup mounted this many ms after it closes, so an exit
   *  animation can play. 0 (default) unmounts immediately. The popup carries
   *  `data-phase` and publishes `$ctx.tooltip.phase`; the motion itself is
   *  authored in Studio. */
  exitDuration?: number;
  className?: string;
};

export type TooltipWrapperMethods = {
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const TooltipWrapper = forwardRef<TooltipWrapperMethods, TooltipWrapperProps>(
  (props, userRef: Ref<TooltipWrapperMethods>) => {
    const {
      trigger,
      popup,
      mode = 'hover',
      placement = 'top',
      offset = 8,
      hoverOpenDelay = 0,
      hoverCloseDelay = 150,
      open: openProp,
      onOpenChange,
      onPress,
      onHoverStart,
      onHoverEnd,
      exitDuration = 0,
      className,
    } = props;

    // Who owns the open state.
    //
    // `open` alone can't answer that. Plasmic binds this prop to its own
    // implicit state cell and mirrors `onOpenChange` back into it, so the
    // moment an uncontrolled tooltip reports a change the prop stops being
    // undefined — it's an echo of our own write, not an author binding.
    // Reading it naively latches every tooltip into controlled mode on first
    // use and it can never close again.
    //
    // So decide from what arrives *before* our first report: anything defined
    // then came from the author. After that the prop is ours and is ignored.
    const selfChangedRef = useRef(false);
    const isControlledRef = useRef(false);

    if (!selfChangedRef.current && openProp !== undefined) {
      isControlledRef.current = true;
    }
    const isControlled = isControlledRef.current;

    // Withholding `onOpenChange` is what makes controlled mode hold. The cell
    // Plasmic writes is the very thing handed back as `open`, and one internal
    // write (hover-end, Escape, outside click, close button, ref action)
    // leaves it stale against the author's expression — Plasmic re-seeds only
    // when that expression's *value* changes, so it never recovers. Staying
    // silent keeps the two in sync.
    //
    // The rest falls out for free: react-stately refuses to move a controlled
    // value, so with nothing to report to, every internal path goes inert
    // without a single per-handler guard.
    const reportOpenChange = useCallback(
      (next: boolean) => {
        selfChangedRef.current = true;
        onOpenChange?.(next);
      },
      [onOpenChange]
    );

    const { state, safeClose, safeToggle } = useCanvasOverlay(
      {
        // Uncontrolled: never hand the echo back to react-stately, or it
        // would flip itself into controlled mode behind our back.
        open: isControlled ? openProp : undefined,
        onOpenChange: isControlled ? undefined : reportOpenChange,
        triggerSlotName: 'trigger',
      },
      props as unknown as Record<string, unknown>
    );
    // Presence: `mounted` keeps the popup in the DOM through its exit window,
    // `phase` ('enter' | 'open' | 'exit') is what authors bind a variant to.
    const { mounted, phase } = usePresence(state.isOpen, exitDuration);

    const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
    // Hover only fires when mode='hover' AND device supports hover. Press
    // remains available in both modes for touch + keyboard a11y.
    const hoverEnabled = mode === 'hover' && canHover;

    const triggerRef = useRef<HTMLDivElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const openedViaRef = useRef<'hover' | 'press'>('hover');
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Mirror trigger ancestor className chain onto portal wrapper so Plasmic
    // token CSS vars cascade to the portalled popup.
    const scopeClassName = useScopeClassName(triggerRef, mounted);

    const cancelClose = useCallback(() => {
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    }, []);

    const scheduleClose = useCallback(
      (delay: number) => {
        cancelClose();
        closeTimerRef.current = setTimeout(() => {
          safeClose();
          closeTimerRef.current = null;
        }, delay);
      },
      [cancelClose, safeClose]
    );

    useEffect(() => () => cancelClose(), [cancelClose]);

    // useOverlayTrigger returns aria attrs AND an onPress toggle. We drive
    // press ourselves via usePress below, so pick only aria fields — skipping
    // triggerProps.onPress avoids double-toggling.
    const overlayTrigger = useOverlayTrigger(
      { type: 'dialog' },
      state,
      triggerRef
    );
    const ariaOverlayProps = overlayTrigger.overlayProps;
    const triggerAriaProps = {
      id: overlayTrigger.triggerProps.id,
      'aria-haspopup': 'dialog' as const,
      'aria-expanded': state.isOpen,
      'aria-controls': state.isOpen ? ariaOverlayProps.id : undefined,
    };

    const {
      overlayProps: positionProps,
      arrowProps,
      placement: resolvedPlacement,
      updatePosition,
    } = useOverlayPosition({
      targetRef: triggerRef,
      overlayRef,
      placement,
      offset,
      shouldFlip: true,
      containerPadding: 8,
      // `mounted`, not `isOpen`: an exiting popup must keep its measured
      // position while it animates out.
      isOpen: mounted,
      // Non-zero arrowSize enables arrow position calc. Doesn't render an
      // arrow — author's Plasmic-authored chevron reads the position via
      // CSS custom props (--tooltip-arrow-x / -y).
      arrowSize: 20,
    });

    // Reposition after mount + when popup content changes.
    useEffect(() => {
      if (state.isOpen) {
        updatePosition();
      }
    }, [state.isOpen, popup, updatePosition]);

    // Trigger interactions.
    const openViaPress = useCallback(() => {
      openedViaRef.current = 'press';
      cancelClose();
      safeToggle();
      onPress?.();
    }, [cancelClose, safeToggle, onPress]);

    const { pressProps } = usePress({ onPress: openViaPress });

    // Not gated by `isDisabled`: the author's handlers fire in both modes
    // (as `onPress` does). Only the open/close behaviour checks
    // `hoverEnabled`.
    const { hoverProps: triggerHoverProps } = useHover({
      onHoverStart: () => {
        onHoverStart?.();
        if (!hoverEnabled) {
          return;
        }
        cancelClose();
        if (!state.isOpen) {
          openedViaRef.current = 'hover';
        }
        if (hoverOpenDelay > 0) {
          const delay = hoverOpenDelay;

          closeTimerRef.current = setTimeout(() => {
            state.open();
            closeTimerRef.current = null;
          }, delay);
        } else {
          state.open();
        }
      },
      onHoverEnd: () => {
        onHoverEnd?.();
        if (!hoverEnabled) {
          return;
        }
        if (openedViaRef.current === 'hover') {
          scheduleClose(hoverCloseDelay);
        }
      },
    });

    // Popup hover — keep alive while pointer sits on popup.
    const { hoverProps: popupHoverProps } = useHover({
      isDisabled: !hoverEnabled,
      onHoverStart: cancelClose,
      onHoverEnd: () => {
        if (openedViaRef.current === 'hover') {
          scheduleClose(hoverCloseDelay);
        }
      },
    });

    // Outside interaction dismiss (press-opened only — hover-opened relies
    // on hover-end).
    useInteractOutside({
      ref: overlayRef,
      onInteractOutside: e => {
        // Ignore interactions on the trigger — usePress handles toggling
        // and would otherwise re-open after this close.
        if (
          triggerRef.current &&
          e.target instanceof Node &&
          triggerRef.current.contains(e.target)
        ) {
          return;
        }
        if (state.isOpen) {
          safeClose();
        }
      },
    });

    // Bubbled clicks on any [data-tooltip-close] descendant close the popup.
    // Also catches Escape via keydown on overlay.
    const onOverlayClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as Element | null;

        if (target && target.closest('[data-tooltip-close]')) {
          safeClose();
        }
      },
      [safeClose]
    );

    const onOverlayKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          safeClose();
        }
      },
      [safeClose]
    );

    useImperativeHandle(
      userRef,
      () => ({
        open: () => state.open(),
        close: () => state.close(),
        toggle: () => state.toggle(),
      }),
      [state]
    );

    const overlayInlineStyle = useMemo<CSSProperties>(() => {
      const arrowStyle = arrowProps?.style as
        { left?: number; top?: number } | undefined;

      return {
        ...(positionProps.style as CSSProperties),
        // Ensure popup sits above page chrome. Author can override via
        // popup slot content styles if needed.
        zIndex: 1000,
        // Single source of truth for the exit window: an author can type
        // `var(--exit-duration)` into the Studio transition duration field.
        ['--exit-duration' as string]: `${exitDuration}ms`,
        // Arrow position along the popup edge, matched to trigger center.
        // Author reads via `left: var(--tooltip-arrow-x)` (top/bottom
        // placements) or `top: var(--tooltip-arrow-y)` (left/right).
        ...(arrowStyle?.left !== undefined
          ? { ['--tooltip-arrow-x' as string]: `${arrowStyle.left}px` }
          : null),
        ...(arrowStyle?.top !== undefined
          ? { ['--tooltip-arrow-y' as string]: `${arrowStyle.top}px` }
          : null),
      } as CSSProperties;
    }, [positionProps.style, arrowProps, exitDuration]);

    // Trigger wrapper listeners — merge press + hover + aria trigger props.
    const mergedTriggerProps = {
      ...triggerAriaProps,
      ...pressProps,
      ...triggerHoverProps,
    };

    return (
      // Wraps both slots: the popup is portalled in the DOM but stays inside
      // this subtree in the React tree, so `$ctx.tooltip` reaches it too.
      <DataProvider
        name="tooltip"
        data={{
          isOpen: state.isOpen,
          phase,
          placement: resolvedPlacement,
          openVia: openedViaRef.current,
        }}
      >
        <div
          {...mergedTriggerProps}
          ref={triggerRef}
          className={className}
          style={{ cursor: 'pointer' }}
        >
          {trigger}
          <CanvasPortal open={mounted} scopeClassName={scopeClassName}>
            <div
              {...ariaOverlayProps}
              {...popupHoverProps}
              ref={overlayRef}
              onClick={onOverlayClick}
              onKeyDown={onOverlayKeyDown}
              data-placement={resolvedPlacement}
              data-open-via={openedViaRef.current}
              data-mode={mode}
              data-phase={phase}
              style={overlayInlineStyle}
            >
              {/* Injected rules:
                - Hide `[data-tooltip-close]` in hover mode.
                - Anchor `[data-tooltip-chevron]` to popup edge facing
                  the trigger per `[data-placement]`. `!important`
                  overrides the placement=top defaults on the chevron
                  element so author edits to visual (color/size/shadow)
                  are preserved while position stays wrapper-owned. */}
              <style>
                {`
[data-mode="hover"] [data-tooltip-close]{display:none;}
[data-placement="top"] [data-tooltip-chevron]{bottom:0!important;top:auto!important;left:var(--tooltip-arrow-x,50%)!important;right:auto!important;translate:-50% 50%!important;}
[data-placement="bottom"] [data-tooltip-chevron]{top:0!important;bottom:auto!important;left:var(--tooltip-arrow-x,50%)!important;right:auto!important;translate:-50% -50%!important;}
[data-placement="left"] [data-tooltip-chevron]{right:0!important;left:auto!important;top:var(--tooltip-arrow-y,50%)!important;bottom:auto!important;translate:50% -50%!important;}
[data-placement="right"] [data-tooltip-chevron]{left:0!important;right:auto!important;top:var(--tooltip-arrow-y,50%)!important;bottom:auto!important;translate:-50% -50%!important;}
`}
              </style>
              {popup}
            </div>
          </CanvasPortal>
        </div>
      </DataProvider>
    );
  }
);

TooltipWrapper.displayName = 'TooltipWrapper';

export default TooltipWrapper;
