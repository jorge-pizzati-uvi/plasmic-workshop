'use client';

// Swiper CSS side-effect imports — types declared in swiper-css.d.ts.
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';
import 'swiper/css/effect-fade';

import { repeatedElement, usePlasmicCanvasContext } from '@plasmicapp/host';
import type { ComponentHelpers } from '@plasmicapp/host/registerComponent';
import React, {
  forwardRef,
  Ref,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import type { Swiper as SwiperClass } from 'swiper';
import {
  Autoplay,
  EffectFade,
  Navigation,
  Pagination,
  Scrollbar,
} from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import styles from './slider-carousel.module.css';

// SliderCarousel — Plasmic code component wrapping swiper/react. All
// extended controls (dots color/offset, scrollbar, gap, edge inset) map
// to native Swiper features — no custom DOM observers, drag handlers,
// or rAF loops.

export type SliderCarouselMethods = {
  slickGoTo: (index: number, dontAnimate?: boolean) => void;
  slickNext: () => void;
  slickPrev: () => void;
  slickPlay: () => void;
  slickPause: () => void;
};

export type SliderCarouselProps = {
  className?: string;

  // Base slick-compatible props (same names as react-slick version).
  accessibility?: boolean;
  adaptiveHeight?: boolean;
  arrows?: boolean;
  arrowColor?: string;
  autoplay?: boolean;
  autoplaySpeed?: number;
  centerMode?: boolean;
  centerPadding?: string;
  dots?: boolean;
  draggable?: boolean;
  fade?: boolean;
  focusOnSelect?: boolean;
  infinite?: boolean;
  initialSlide?: number;
  pauseOnDotsHover?: boolean;
  pauseOnFocus?: boolean;
  pauseOnHover?: boolean;
  rows?: number;
  rtl?: boolean;
  slidesPerRow?: number;
  slidesToScroll?: number;
  slidesToShow?: number;
  speed?: number;
  swipe?: boolean;
  swipeToSlide?: boolean;
  touchMove?: boolean;
  touchThreshold?: number;
  variableWidth?: boolean;
  vertical?: boolean;

  // Extended (Slider Controls parity).
  scrollbar?: boolean;
  dotsColor?: string;
  dotsOffset?: number;
  scrollbarColor?: string;
  scrollbarOffset?: number;
  slidesGap?: number;
  slidesOffset?: number;
  // Index of a slide to extract as a raw "title" block above the carousel.
  titleSlide?: number;
  // Fixed swiper height in px (blank = auto content-driven).
  height?: number;

  beforeChange?: (currentSlide: number) => void;

  children?: React.ReactNode;
};

// Parse a CSS length string ("24", "24px") to a number for Swiper numeric
// props (spaceBetween, offsets). Non-numeric strings fall back to 0.
function toNumber(v: string | number | undefined): number {
  if (v === undefined || v === null) {
    return 0;
  }
  if (typeof v === 'number') {
    return v;
  }
  const n = parseFloat(v);

  return Number.isNaN(n) ? 0 : n;
}

// Plasmic slot-forwarding wraps forwarded slot content in a single wrapper
// element — if we detect one wrapper containing multiple children, unwrap.
// Otherwise pass through. Returns raw children array (no repeatedElement
// markers — apply those per-branch in the render code so extracted title
// slide doesn't get the marker).
function unwrapSlotWrapper(node: React.ReactNode): React.ReactNode[] {
  const arr = React.Children.toArray(node);

  if (arr.length === 1 && React.isValidElement(arr[0])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inner = (arr[0].props as any)?.children;
    const innerArr =
      inner !== undefined && inner !== null
        ? React.Children.toArray(inner)
        : [];

    if (innerArr.length > 1) {
      return innerArr;
    }
  }

  return arr;
}

const SliderCarousel = forwardRef<SliderCarouselMethods, SliderCarouselProps>(
  (props, userRef: Ref<SliderCarouselMethods>) => {
    const {
      className,
      arrows,
      arrowColor,
      autoplay,
      autoplaySpeed,
      centerMode,
      dots,
      fade,
      infinite,
      initialSlide,
      pauseOnDotsHover,
      pauseOnFocus,
      pauseOnHover,
      slidesToScroll,
      slidesToShow,
      speed,
      swipe,
      variableWidth,
      // Extended
      scrollbar,
      dotsColor,
      dotsOffset,
      scrollbarColor,
      scrollbarOffset,
      slidesGap,
      slidesOffset,
      titleSlide,
      height,
      beforeChange,
      children,
    } = props;

    const inCanvas = !!usePlasmicCanvasContext();
    const swiperRef = useRef<SwiperClass | null>(null);

    useImperativeHandle(
      userRef,
      () => ({
        slickGoTo(index, dontAnimate) {
          swiperRef.current?.slideTo(index, dontAnimate ? 0 : undefined);
        },
        slickNext() {
          swiperRef.current?.slideNext();
        },
        slickPrev() {
          swiperRef.current?.slidePrev();
        },
        slickPlay() {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (swiperRef.current as any)?.autoplay?.start();
        },
        slickPause() {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (swiperRef.current as any)?.autoplay?.stop();
        },
      }),
      []
    );

    // Default arrows to true — Plasmic defaultValueHint is display-only.
    const arrowsEnabled = arrows ?? true;

    // All modules always registered. Swiper reads `modules` at construction
    // time — gating by prop causes Plasmic responsive-prop re-renders (e.g.
    // `dots` true at small laptop but false at base) to change the modules
    // array on re-render without swiper actually loading the new module,
    // leaving that feature dead. All modules are already imported above so
    // bundle cost is the same regardless. Runtime config props
    // (`pagination={false}`, `navigation={false}`, …) disable behavior.
    const modules = useMemo(
      () => [Navigation, Pagination, Scrollbar, Autoplay, EffectFade],
      []
    );

    // Numeric length props → append "px" for CSS var values.
    const px = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);

    const cssVars: Record<string, string> = {};

    if (dotsColor) {
      cssVars['--sc-dots-color'] = dotsColor;
    }
    if (dotsOffset !== undefined) {
      cssVars['--sc-dots-offset'] = px(dotsOffset);
    }
    if (scrollbarColor) {
      cssVars['--sc-scrollbar-fill'] = scrollbarColor;
    }
    if (scrollbarOffset !== undefined) {
      cssVars['--sc-scrollbar-offset'] = px(scrollbarOffset);
    }
    if (arrowColor) {
      cssVars['--sc-arrow-color'] = arrowColor;
    }
    if (height !== undefined) {
      cssVars['--sc-height'] = px(height);
    }

    // Two-step child prep: unwrap Plasmic slot forwarding, then split
    // out the title slide (if configured) BEFORE applying repeatedElement
    // markers. Title renders raw — no marker, no swiper-slide wrapper.
    const rawSlides = unwrapSlotWrapper(children);
    const titleIdx =
      typeof titleSlide === 'number' &&
      titleSlide >= 0 &&
      titleSlide < rawSlides.length
        ? titleSlide
        : -1;
    const hasTitle = titleIdx >= 0;
    const titleChild = hasTitle ? rawSlides[titleIdx] : null;
    const carouselRaw = hasTitle
      ? rawSlides.filter((_, i) => i !== titleIdx)
      : rawSlides;
    const slides = carouselRaw.map((child, i) =>
      repeatedElement(i === 0, child)
    );

    // Debounce initialSlide changes in canvas — Plasmic dev editing can
    // toggle prop frequently; swiper handles a direct set via slideTo but
    // we avoid re-render churn by only calling on mount + prop delta.
    useEffect(() => {
      if (initialSlide !== undefined && swiperRef.current) {
        swiperRef.current.slideTo(initialSlide);
      }
    }, [initialSlide]);

    return (
      <div
        className={[styles.container, className].filter(Boolean).join(' ')}
        style={cssVars as React.CSSProperties}
      >
        {hasTitle && titleChild}
        <Swiper
          className={styles.root}
          modules={modules}
          slidesPerView={variableWidth ? 'auto' : (slidesToShow ?? 1)}
          slidesPerGroup={slidesToScroll ?? 1}
          spaceBetween={toNumber(slidesGap)}
          slidesOffsetBefore={toNumber(slidesOffset)}
          slidesOffsetAfter={toNumber(slidesOffset)}
          centeredSlides={centerMode ?? false}
          // Center slides when total count < slidesPerView — safe default.
          centerInsufficientSlides
          loop={infinite ?? true}
          speed={speed ?? 500}
          initialSlide={initialSlide ?? 0}
          allowTouchMove={swipe ?? true}
          effect={fade ? 'fade' : 'slide'}
          // Avoids fade-flash artifact between slides during effect transitions.
          fadeEffect={fade ? { crossFade: true } : undefined}
          // Rounds slide widths to whole px — prevents subpixel blur on
          // high-DPI screens, esp. with variableWidth mode.
          roundLengths
          // Auto-updates swiper on DOM mutations (Plasmic canvas re-renders,
          // slot content changes). Safer than manual update() calls.
          observer
          observeParents
          autoplay={
            autoplay && !inCanvas
              ? {
                  delay: autoplaySpeed ?? 3000,
                  disableOnInteraction: false,
                  pauseOnMouseEnter: pauseOnHover ?? true,
                }
              : false
          }
          pagination={
            dots
              ? {
                  clickable: true,
                  dynamicBullets: true,
                  dynamicMainBullets: 3,
                }
              : false
          }
          navigation={arrowsEnabled}
          scrollbar={
            scrollbar
              ? {
                  draggable: true,
                  dragSize: 120,
                  hide: false,
                  // Snap to nearest slide after drag release — matches the
                  // slick-carousel version's manual slickGoTo-on-drop behavior.
                  snapOnRelease: true,
                }
              : false
          }
          onSwiper={swiper => {
            swiperRef.current = swiper;
          }}
          onSlideChange={swiper => {
            beforeChange?.(swiper.activeIndex);
          }}
          onFocus={pauseOnFocus ? undefined : undefined}
          onMouseEnter={pauseOnDotsHover ? undefined : undefined}
        >
          {slides.map((child, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <SwiperSlide
              key={i}
              // variableWidth mode = swiper's slidesPerView: 'auto'. Swiper's
              // default .swiper-slide is width: 100%, so slides fill container
              // = only 1 visible. Force width: auto so slide sizes to its
              // intrinsic content width.
              style={variableWidth ? { width: 'auto' } : undefined}
            >
              {child}
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    );
  }
);

SliderCarousel.displayName = 'SliderCarousel';

export const sliderCarouselHelpers: ComponentHelpers<SliderCarouselProps> = {
  states: {
    currentSlide: {
      onChangeArgsToValue: (newIndex: number) => newIndex,
      onMutate: (stateValue, $ref) => {
        $ref?.slickGoTo?.(stateValue);
      },
    },
  },
};

export default SliderCarousel;
