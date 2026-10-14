'use client';

// ModalWrapper — Plasmic code component. Wraps trigger + content slots with
// a WCAG 2.1 AA modal dialog (focus trap, restore, Escape, backdrop dismiss,
// scroll lock, portal to body).
//
// Author DX (mirrors TooltipWrapper):
//   1. Drop ModalWrapper.
//   2. Fill `trigger` slot with any Plasmic tree (button, link, icon).
//   3. Fill `content` slot with the modal dialog markup.
//   4. On any close button inside content, set HTML attr `data-modal-close`.

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  type Ref,
} from 'react';
import {
  FocusScope,
  useDialog,
  useInteractOutside,
  usePreventScroll,
} from 'react-aria';
import { CanvasPortal, useCanvasOverlay, useScopeClassName } from '../_shared';

export type ModalWrapperMethods = {
  open: () => void;
  close: () => void;
  toggle: () => void;
};

export type ModalWrapperProps = {
  className?: string;
  trigger?: React.ReactNode;
  content?: React.ReactNode;
  /** Controlled open state. Leave blank for uncontrolled. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Close when the backdrop is clicked. Default true. */
  dismissOnBackdrop?: boolean;
  /** Close when Escape is pressed. Default true. */
  dismissOnEscape?: boolean;
  /** Lock body scroll while open. Default true. */
  preventScroll?: boolean;
};

type ModalContentsProps = {
  content: React.ReactNode;
  dismissOnBackdrop: boolean;
  dismissOnEscape: boolean;
  preventScroll: boolean;
  safeClose: () => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  inCanvas: boolean;
};

function ModalContents({
  content,
  dismissOnBackdrop,
  dismissOnEscape,
  preventScroll,
  safeClose,
  triggerRef,
  inCanvas,
}: ModalContentsProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  usePreventScroll({ isDisabled: inCanvas || !preventScroll });

  const { dialogProps } = useDialog({}, dialogRef);

  useInteractOutside({
    ref: dialogRef,
    isDisabled: inCanvas || !dismissOnBackdrop,
    onInteractOutside: e => {
      if (
        triggerRef.current &&
        e.target instanceof Node &&
        triggerRef.current.contains(e.target)
      ) {
        return;
      }
      safeClose();
    },
  });

  const onDialogClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as Element | null;

      if (target && target.closest('[data-modal-close]')) {
        safeClose();
      }
    },
    [safeClose]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (inCanvas || !dismissOnEscape) {
        return;
      }
      if (e.key === 'Escape') {
        e.stopPropagation();
        safeClose();
      }
    },
    [inCanvas, dismissOnEscape, safeClose]
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <FocusScope
        contain={!inCanvas}
        restoreFocus={!inCanvas}
        autoFocus={!inCanvas}
      >
        <div
          {...dialogProps}
          ref={dialogRef}
          role="dialog"
          aria-modal={!inCanvas}
          onClick={onDialogClick}
          onKeyDown={onKeyDown}
          style={{ maxWidth: '100%', maxHeight: '100%', outline: 'none' }}
        >
          {content}
        </div>
      </FocusScope>
    </div>
  );
}

const ModalWrapper = forwardRef<ModalWrapperMethods, ModalWrapperProps>(
  (props, userRef: Ref<ModalWrapperMethods>) => {
    const {
      trigger,
      content,
      open: openProp,
      onOpenChange,
      dismissOnBackdrop = true,
      dismissOnEscape = true,
      preventScroll = true,
      className,
    } = props;

    const { state, inCanvas, safeClose, safeToggle } = useCanvasOverlay(
      { open: openProp, onOpenChange, triggerSlotName: 'trigger' },
      props as unknown as Record<string, unknown>
    );

    const triggerRef = useRef<HTMLDivElement | null>(null);
    const scopeClassName = useScopeClassName(triggerRef, state.isOpen);

    useImperativeHandle(
      userRef,
      () => ({
        open: () => state.open(),
        close: () => state.close(),
        toggle: () => state.toggle(),
      }),
      [state]
    );

    const onTriggerClick = useCallback(() => {
      safeToggle();
    }, [safeToggle]);

    return (
      <>
        <div
          ref={triggerRef}
          className={className}
          onClick={onTriggerClick}
          style={{ cursor: 'pointer' }}
          aria-haspopup="dialog"
          aria-expanded={state.isOpen}
        >
          {trigger}
        </div>
        <CanvasPortal open={state.isOpen} scopeClassName={scopeClassName}>
          <ModalContents
            content={content}
            dismissOnBackdrop={dismissOnBackdrop}
            dismissOnEscape={dismissOnEscape}
            preventScroll={preventScroll}
            safeClose={safeClose}
            triggerRef={triggerRef}
            inCanvas={inCanvas}
          />
        </CanvasPortal>
      </>
    );
  }
);

ModalWrapper.displayName = 'ModalWrapper';

export default ModalWrapper;
