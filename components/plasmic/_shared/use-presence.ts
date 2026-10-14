'use client';

// use-presence — keeps a node mounted long enough to animate out, and hands
// the author a phase to bind a Plasmic variant to.
//
// The code here never sets opacity, scale, duration or easing: it only says
// *when* a node is in `enter`, `open` or `exit`. All visual values are
// authored in Studio against `$ctx.<thing>.phase` (or the `data-phase`
// attribute in CSS).
//
// The enter flip: React renders a node in its final state, the browser
// computes style once, and a CSS transition has nothing to interpolate. So a
// node renders in `enter` (the "from" styles) and flips to `open` only after
// the browser has painted that state.
//
// Two nested rAFs, not one: a single rAF callback runs *before* the paint of
// the frame it was scheduled in, so flipping there can land in the same frame
// as the `enter` render and the browser only ever paints the end state — the
// transition is skipped. That is invisible on mount (the mount paints first)
// but breaks every later change, e.g. a card that should re-fade when the
// selection moves. The second rAF lands after that paint.
//
// The flip is batched module-wide: with 20 markers entering at once this stays
// two frames and one reflow, not twenty.

import { useEffect, useRef, useState } from 'react';

import type { Phase } from './presence';

export type { Phase } from './presence';

const pending = new Set<() => void>();

let flipScheduled = false;
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

// How long to wait before flipping without a frame. Only reached when rAF
// never fires — a backgrounded tab, a test that tears down its timers — where
// the alternative is nodes stuck at their `enter` styles forever.
const FLIP_FALLBACK_MS = 50;

function runFlips() {
  flipScheduled = false;
  if (fallbackTimer !== null) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }

  // One style + layout flush for the whole batch, so every pending node's
  // `enter` styles are committed before any of them flips to `open`.
  if (typeof document !== 'undefined') {
    void document.body?.offsetHeight;
  }

  const fns = Array.from(pending);

  pending.clear();
  fns.forEach(f => f());
}

function scheduleFlip(fn: () => void) {
  pending.add(fn);

  if (!flipScheduled) {
    flipScheduled = true;
    if (typeof requestAnimationFrame === 'function') {
      // Second frame: the first one still runs before the `enter` paint.
      requestAnimationFrame(() => requestAnimationFrame(() => runFlips()));
    }
  }

  // Re-armed on every call, not just the first: `flipScheduled` can be left
  // true by a frame that never arrived, and without this every later flip
  // would wait on it forever. Whichever of the frame and this timer comes
  // first runs the batch and cancels the other.
  if (fallbackTimer !== null) {
    clearTimeout(fallbackTimer);
  }
  fallbackTimer = setTimeout(runFlips, FLIP_FALLBACK_MS);
}

function cancelFlip(fn: () => void) {
  pending.delete(fn);
}

// Note: plain effects throughout, deliberately. The flip is deferred to the
// next frame by the scheduler anyway, so a layout effect would buy nothing —
// and useLayoutEffect warns whenever the tree is server-rendered.

// Phase only — the caller owns mount/unmount.
export function usePhase(open: boolean): Phase {
  const [phase, setPhase] = useState<Phase>(() => (open ? 'enter' : 'exit'));
  const phaseRef = useRef(phase);

  phaseRef.current = phase;

  useEffect(() => {
    if (!open) {
      if (phaseRef.current !== 'exit') {
        setPhase('exit');
      }

      return undefined;
    }

    // Re-opened mid-exit: go straight to `open` so a running transition
    // continues from where it is instead of snapping back to the `from` frame.
    if (phaseRef.current === 'exit') {
      setPhase('open');

      return undefined;
    }

    if (phaseRef.current === 'open') {
      return undefined;
    }

    const flip = () => setPhase('open');

    scheduleFlip(flip);

    return () => cancelFlip(flip);
  }, [open]);

  return phase;
}

// Phase for content that swaps in place rather than mounting/unmounting: a
// card whose bindings change when the selection moves. `key` identifies the
// content; whenever it changes the phase re-enters ('enter' on that very
// commit — derived during render, so the incoming content never paints in its
// final state first — then 'open' on the next frame). `exiting` wins over
// everything while the content is on its way out.
export function useSwapPhase(
  key: string,
  exiting = false,
  // How long to stay in `enter`. 0 flips on the next frame, which is what a
  // CSS transition needs: it wants a painted "from" state and then a change to
  // transition towards. A keyframe animation needs the opposite — the variant
  // carrying it has to stay applied for the whole run — so pass its duration.
  //
  // Plasmic forces this choice: "the transitions style is always applied to
  // the Base variant", so an `enter` variant cannot turn the transition off.
  // Without that, re-entering transitions *towards* the from-state and flips
  // back a frame later, which is a ~2% dip nobody can see. Animations are
  // per-variant, so they are the way to make a swap visible.
  holdMs = 0
): Phase {
  const [phase, setPhase] = useState<Phase>('enter');
  const keyRef = useRef(key);

  if (keyRef.current !== key) {
    keyRef.current = key;

    if (phase !== 'enter') {
      setPhase('enter');
    }
  }

  useEffect(() => {
    if (phase !== 'enter') {
      return undefined;
    }

    if (holdMs > 0) {
      const timer = setTimeout(() => setPhase('open'), holdMs);

      return () => clearTimeout(timer);
    }

    const flip = () => setPhase('open');

    scheduleFlip(flip);

    return () => cancelFlip(flip);
  }, [phase, key, holdMs]);

  return exiting ? 'exit' : phase;
}

export type Presence = {
  // Whether the caller should render the node at all.
  mounted: boolean;
  phase: Phase;
};

// Phase + "keep mounted for `exitDuration` ms after `open` goes false".
// `exitDuration <= 0` unmounts synchronously, i.e. the pre-animation behaviour.
export function usePresence(open: boolean, exitDuration = 0): Presence {
  const [mounted, setMounted] = useState(open);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (open) {
      clearTimer();
      setMounted(true);

      return undefined;
    }

    if (exitDuration <= 0) {
      clearTimer();
      setMounted(false);

      return undefined;
    }

    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setMounted(false);
    }, exitDuration);

    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, exitDuration]);

  useEffect(() => clearTimer, []);

  const phase = usePhase(open);

  return { mounted: open || mounted, phase };
}
