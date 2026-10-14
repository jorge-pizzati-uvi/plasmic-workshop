'use client';

// Studio-time actions for SliderCarousel — rendered in Plasmic
// Studio's action panel (right sidebar). Ports the same UX as
// @plasmicpkgs/react-slick: current-slide dropdown, prev/next buttons,
// append + delete slide, outline hint.

import type { ActionProps } from '@plasmicapp/host/registerComponent';
import React, { type ChangeEvent } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = {
  children?: any;
  rows?: number;
  slidesPerRow?: number;
  initialSlide?: number;
};

// Detect children authoring shape:
//  - Direct authoring: children = array of N elements
//  - Slot forwarding: children = single wrapper element containing N inner
//    children (Plasmic wraps forwarded slot content)
// Mirrors component's `prepareChildren` unwrap logic so action count
// stays in sync with what's actually rendered as slides.
export function isSlotForwarded(children: unknown): boolean {
  const arr = React.Children.toArray(children as React.ReactNode);

  if (arr.length !== 1 || !React.isValidElement(arr[0])) {
    return false;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inner = (arr[0].props as any)?.children;

  if (inner === undefined || inner === null) {
    return false;
  }

  return React.Children.toArray(inner).length > 1;
}

function countSlides(children: unknown): number {
  const arr = React.Children.toArray(children as React.ReactNode);

  if (arr.length === 1 && React.isValidElement(arr[0])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inner = (arr[0].props as any)?.children;
    const innerArr =
      inner !== undefined && inner !== null
        ? React.Children.toArray(inner)
        : [];

    if (innerArr.length > 1) {
      return innerArr.length;
    }
  }

  return arr.length;
}

function getSlideInfo({
  rows = 1,
  slidesPerRow = 1,
  initialSlide = 0,
  children,
}: Props) {
  const slidesCnt = countSlides(children);
  const slidesPerDot = rows * slidesPerRow;
  const dotCount = Math.ceil(slidesCnt / slidesPerDot);
  const currentDotIndex =
    initialSlide >= dotCount ? dotCount - 1 : initialSlide;

  return {
    currentDotIndex,
    slidesPerDot,
    dotCount,
    totalSlides: slidesCnt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CurrentSlideDropdown({
  componentProps,
  studioOps,
}: ActionProps<any>) {
  const { dotCount, currentDotIndex } = getSlideInfo(componentProps);
  const options = Array.from({ length: dotCount }, (_, i) => i).map(i => (
    <option key={i} value={i.toString()}>
      Slide {i}
    </option>
  ));
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    studioOps.updateStates({ currentSlide: Number(e.target.value) });
  };

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        gap: '10px',
        justifyContent: 'space-between',
      }}
    >
      <div>Current slide:</div>
      <select
        defaultValue={currentDotIndex.toString()}
        style={{ width: '100%' }}
        onChange={handleChange}
        value={currentDotIndex.toString()}
      >
        {options}
      </select>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function NavigateSlides({
  componentProps,
  studioOps,
}: ActionProps<any>) {
  const { dotCount, currentDotIndex } = getSlideInfo(componentProps);
  const btnStyles = {
    width: '100%',
    backgroundColor: '#f3f3f2',
    borderRadius: 6,
  };

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        gap: '10px',
        justifyContent: 'space-between',
      }}
    >
      <button
        type="button"
        style={btnStyles}
        onClick={() => {
          const prevSlide =
            currentDotIndex === 0
              ? dotCount - 1
              : (currentDotIndex - 1) % dotCount;

          studioOps.updateStates({ currentSlide: prevSlide });
        }}
      >
        Prev slide
      </button>
      <button
        type="button"
        style={btnStyles}
        onClick={() => {
          const nextSlide = (currentDotIndex + 1) % dotCount;

          studioOps.updateStates({ currentSlide: nextSlide });
        }}
      >
        Next slide
      </button>
    </div>
  );
}

export function OutlineMessage() {
  return <div>* To re-arrange slides, use the Outline panel</div>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function appendSlide({ componentProps, studioOps }: ActionProps<any>) {
  const { dotCount, slidesPerDot, totalSlides } = getSlideInfo(componentProps);
  const currentSlide = totalSlides % slidesPerDot ? dotCount - 1 : dotCount;

  studioOps.appendToSlot(
    {
      type: 'img',
      src: '',
      styles: {
        maxWidth: '100%',
      },
    },
    'children'
  );
  studioOps.updateStates({ currentSlide });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deleteCurrentSlide({
  componentProps,
  studioOps,
}: ActionProps<any>) {
  const { currentDotIndex, dotCount, slidesPerDot, totalSlides } =
    getSlideInfo(componentProps);

  studioOps.removeFromSlotAt(currentDotIndex * slidesPerDot, 'children');
  let newPos = currentDotIndex;

  if (dotCount === 1) {
    newPos = 0;
  } else if (currentDotIndex !== dotCount - 1) {
    if (slidesPerDot === 1) {
      newPos = currentDotIndex - 1;
    } else {
      newPos = currentDotIndex;
    }
  } else {
    newPos =
      totalSlides % slidesPerDot === 1 ? currentDotIndex - 1 : currentDotIndex;
  }
  studioOps.updateStates({
    currentSlide: newPos,
  });
}
