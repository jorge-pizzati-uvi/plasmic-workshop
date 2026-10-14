'use client';

// useCanvasOverlay — shared overlay state hook for Plasmic code components
// (Modal, Tooltip, future Popover/Drawer). Mirrors Plasmic's own
// `useIsOpen` behavior from plasmicpkgs/react-aria/utils.ts:
//
//   - In preview: use the `open` prop as-is.
//   - In canvas: overlay is always controlled. Force-open when the
//     component is selected in the outline (except when the selected slot
//     is the trigger itself — selecting the trigger doesn't imply the
//     author wants the overlay content shown).
//   - When auto-opening, invoke Studio's injected
//     `plasmicNotifyAutoOpenedContent` callback so Studio maintains
//     selection focus on the auto-opened content.
//   - Author clicks in canvas are never allowed to write `false` back
//     through a controlled `open` binding (safeClose / safeToggle are
//     no-ops in canvas).

import {
  usePlasmicCanvasComponentInfo,
  usePlasmicCanvasContext,
} from '@plasmicapp/host';
import { useCallback } from 'react';
import { useOverlayTriggerState } from 'react-stately';

export type UseCanvasOverlayOptions = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Name of the slot considered the "trigger". When the author selects an
  // element inside this slot, the overlay does NOT force-open (matches
  // Plasmic native — selecting the trigger button shouldn't reveal the
  // dialog it opens).
  triggerSlotName?: string;
};

export type CanvasOverlay = {
  state: ReturnType<typeof useOverlayTriggerState>;
  inCanvas: boolean;
  lockOpenInCanvas: boolean;
  isAutoOpenedBySelection: boolean;
  selectedSlotName: string | null;
  safeClose: () => void;
  safeToggle: () => void;
};

// Plasmic Studio-injected props on code components. Not part of the
// component's declared prop surface — arrive at runtime only in Studio.
type StudioInjectedProps = {
  plasmicNotifyAutoOpenedContent?: () => void;
};

export function useCanvasOverlay(
  options: UseCanvasOverlayOptions,
  // Pass the component's full props object. Plasmic Studio injects
  // `__plasmic_selection_prop__` and `plasmicNotifyAutoOpenedContent`
  // onto code-component instances; both are read from this object.
  ownerProps?: Record<string, unknown>
): CanvasOverlay {
  const { open, onOpenChange, triggerSlotName } = options;

  const inCanvas = !!usePlasmicCanvasContext();
  const canvasInfo = usePlasmicCanvasComponentInfo(ownerProps ?? {});
  const isSelected = !!canvasInfo?.isSelected;
  const selectedSlotName = canvasInfo?.selectedSlotName ?? null;

  const isTriggerSlotSelected =
    !!triggerSlotName && selectedSlotName === triggerSlotName;
  const isAutoOpenedBySelection =
    inCanvas && isSelected && !isTriggerSlotSelected;

  const notify = (ownerProps as StudioInjectedProps | undefined)
    ?.plasmicNotifyAutoOpenedContent;

  if (isAutoOpenedBySelection && !open) {
    notify?.();
  }

  const lockOpenInCanvas = inCanvas;

  // In canvas the overlay is always controlled. `useOverlayTriggerState`
  // treats a defined `isOpen` as controlled; outside canvas we pass the
  // author's `open` through unchanged (undefined → uncontrolled).
  const controlledOpen = inCanvas
    ? Boolean(isAutoOpenedBySelection || open)
    : open;

  const state = useOverlayTriggerState({
    isOpen: controlledOpen,
    onOpenChange,
  });

  const safeClose = useCallback(() => {
    if (lockOpenInCanvas) {
      return;
    }
    state.close();
  }, [lockOpenInCanvas, state]);

  const safeToggle = useCallback(() => {
    if (lockOpenInCanvas) {
      return;
    }
    state.toggle();
  }, [lockOpenInCanvas, state]);

  return {
    state,
    inCanvas,
    lockOpenInCanvas,
    isAutoOpenedBySelection,
    selectedSlotName,
    safeClose,
    safeToggle,
  };
}
