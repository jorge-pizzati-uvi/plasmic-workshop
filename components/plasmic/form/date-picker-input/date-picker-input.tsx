'use client';

// DatePickerInput — WCAG 2.1 AA date / date-range picker. Two modes:
//   - single: form value is an ISO date string (e.g. "2026-01-15")
//   - range:  form value is an object { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
//
// Trigger is a native <button>. Calendar opens in a popover by default,
// or a full-screen modal when the viewport is below `modalBreakpoint`
// (default 640px). Author styles trigger, popover/modal, and calendar
// grid via CSS classes on the outer div (className) and via the
// data-attrs the picker emits: [data-mode], [data-open], [data-mobile].
//
// Zero-dep on brands-ui / rebrand-ui. Uses react-aria calendar hooks.

import {
  CalendarDate,
  getLocalTimeZone,
  parseDate,
} from '@internationalized/date';
import React, { useId, useMemo, useRef, type KeyboardEvent } from 'react';
import {
  useButton,
  useCalendar,
  useCalendarCell,
  useCalendarGrid,
  useInteractOutside,
  useRangeCalendar,
} from 'react-aria';
import { Controller, useFormContext } from 'react-hook-form';
import { useCalendarState, useRangeCalendarState } from 'react-stately';
import { createCalendar } from '@internationalized/date';
import { useCanvasOverlay, useMediaQuery } from '../../_shared';
import { useFormFieldContext } from '../_shared/form-context';

export type DatePickerMode = 'single' | 'range';

export type DatePickerInputProps = {
  className?: string;
  name?: string;
  mode?: DatePickerMode;
  placeholder?: string;
  disabled?: boolean;
  /** ISO date lower bound (inclusive). */
  minValue?: string;
  /** ISO date upper bound (inclusive). */
  maxValue?: string;
  /**
   * Array of unavailable ISO dates (YYYY-MM-DD). Also accepts a JSON string
   * for authors binding from dynamic sources.
   */
  unavailableDates?: string[] | string;
  /** BCP-47 locale (e.g. `en-US`). Defaults to `en-US`. */
  locale?: string;
  /**
   * Viewport width (px) below which the calendar renders as a modal
   * instead of a popover. Set to 0 to always use a popover.
   */
  modalBreakpoint?: number;
};

type RangeValue = { start: string; end: string };

function parseUnavailable(input: string[] | string | undefined): Set<string> {
  if (!input) {
    return new Set();
  }
  if (Array.isArray(input)) {
    return new Set(input);
  }
  try {
    const parsed = JSON.parse(input);

    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((v): v is string => typeof v === 'string'));
    }
  } catch {
    // fall through
  }

  return new Set(
    input
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  );
}

function toCalendarDate(iso: string | undefined): CalendarDate | undefined {
  if (!iso) {
    return undefined;
  }
  try {
    return parseDate(iso);
  } catch {
    return undefined;
  }
}

function formatDate(date: CalendarDate, locale: string): string {
  const jsDate = date.toDate(getLocalTimeZone());

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(jsDate);
}

// ---- Calendar cell ------------------------------------------------------

type CellProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any;
  date: CalendarDate;
};

function CalendarCell({ state, date }: CellProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const {
    cellProps,
    buttonProps,
    isSelected,
    isOutsideVisibleRange,
    isDisabled,
    isUnavailable,
    formattedDate,
  } = useCalendarCell({ date }, state, ref);

  return (
    <td {...cellProps} style={{ padding: 0 }}>
      <div
        {...buttonProps}
        ref={ref}
        hidden={isOutsideVisibleRange}
        data-selected={isSelected || undefined}
        data-disabled={isDisabled || undefined}
        data-unavailable={isUnavailable || undefined}
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          borderRadius: '4px',
          background: isSelected ? '#007acc' : undefined,
          color: isSelected ? '#fff' : isDisabled ? '#bbb' : undefined,
          textDecoration: isUnavailable ? 'line-through' : undefined,
          outline: 'none',
        }}
      >
        {formattedDate}
      </div>
    </td>
  );
}

// ---- Calendar grid ------------------------------------------------------

type GridProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any;
};

function CalendarGrid({ state }: GridProps) {
  const { gridProps, headerProps, weekDays } = useCalendarGrid({}, state);
  const weeksInMonth = state.getDatesInWeek
    ? Array.from({ length: 6 }, (_, i) => i)
    : [];
  const monthStart = state.visibleRange.start;

  return (
    <table
      {...gridProps}
      cellPadding={0}
      style={{ borderCollapse: 'collapse' }}
    >
      <thead {...headerProps}>
        <tr>
          {weekDays.map((d, i) => (
            <th
              key={i}
              style={{ padding: '4px', fontSize: '12px', fontWeight: 600 }}
            >
              {d}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeksInMonth.map(weekIdx => (
          <tr key={weekIdx}>
            {state
              .getDatesInWeek(weekIdx, monthStart)
              .map((date: CalendarDate | null, i: number) =>
                date ? (
                  <CalendarCell key={i} state={state} date={date} />
                ) : (
                  <td key={i} />
                )
              )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---- Header nav (prev/next month + month label) -------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CalendarHeader({
  calendarProps,
  prevButtonProps,
  nextButtonProps,
  title,
}: any) {
  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const { buttonProps: prev } = useButton(prevButtonProps, prevRef);
  const { buttonProps: next } = useButton(nextButtonProps, nextRef);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 4px',
      }}
    >
      <button
        {...prev}
        ref={prevRef}
        type="button"
        style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
        aria-label={
          calendarProps['aria-label']
            ? `Previous, ${calendarProps['aria-label']}`
            : 'Previous'
        }
      >
        ‹
      </button>
      <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>{title}</h2>
      <button
        {...next}
        ref={nextRef}
        type="button"
        style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
        aria-label={
          calendarProps['aria-label']
            ? `Next, ${calendarProps['aria-label']}`
            : 'Next'
        }
      >
        ›
      </button>
    </div>
  );
}

// ---- Single-mode calendar ----------------------------------------------

type SingleProps = {
  value?: string;
  onChange: (value: string) => void;
  minValue?: CalendarDate;
  maxValue?: CalendarDate;
  unavailable: Set<string>;
  locale: string;
  onClose: () => void;
};

function SingleCalendar({
  value,
  onChange,
  minValue,
  maxValue,
  unavailable,
  locale,
  onClose,
}: SingleProps) {
  // Cast: react-aria bundles its own @internationalized/date copy, causing
  // #private-field type mismatch with our direct import. Runtime is fine
  // (identical version 3.12.2); TypeScript can't see it. Same treatment
  // below in RangeCalendar.
  const state = useCalendarState({
    value: toCalendarDate(value) ?? null,
    onChange: (d: CalendarDate | null) => {
      if (d) {
        onChange(d.toString());
        onClose();
      }
    },
    minValue,
    maxValue,
    isDateUnavailable: (d: CalendarDate) => unavailable.has(d.toString()),
    locale,
    createCalendar,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  const ref = useRef<HTMLDivElement | null>(null);
  const { calendarProps, prevButtonProps, nextButtonProps, title } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useCalendar({}, state as any);

  return (
    <div {...calendarProps} ref={ref}>
      <CalendarHeader
        state={state}
        calendarProps={calendarProps}
        prevButtonProps={prevButtonProps}
        nextButtonProps={nextButtonProps}
        title={title}
      />
      <CalendarGrid state={state} />
    </div>
  );
}

// ---- Range-mode calendar -----------------------------------------------

type RangeProps = {
  value?: RangeValue;
  onChange: (value: RangeValue) => void;
  minValue?: CalendarDate;
  maxValue?: CalendarDate;
  unavailable: Set<string>;
  locale: string;
  onClose: () => void;
};

function RangeCalendar({
  value,
  onChange,
  minValue,
  maxValue,
  unavailable,
  locale,
  onClose,
}: RangeProps) {
  const rangeValue = value
    ? {
        start: toCalendarDate(value.start),
        end: toCalendarDate(value.end),
      }
    : null;
  const state = useRangeCalendarState({
    value:
      rangeValue?.start && rangeValue?.end
        ? { start: rangeValue.start, end: rangeValue.end }
        : null,
    onChange: (v: { start: CalendarDate; end: CalendarDate } | null) => {
      if (v) {
        onChange({ start: v.start.toString(), end: v.end.toString() });
        onClose();
      }
    },
    minValue,
    maxValue,
    isDateUnavailable: (d: CalendarDate) => unavailable.has(d.toString()),
    locale,
    createCalendar,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  const ref = useRef<HTMLDivElement | null>(null);
  const { calendarProps, prevButtonProps, nextButtonProps, title } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useRangeCalendar({}, state as any, ref);

  return (
    <div {...calendarProps} ref={ref}>
      <CalendarHeader
        state={state}
        calendarProps={calendarProps}
        prevButtonProps={prevButtonProps}
        nextButtonProps={nextButtonProps}
        title={title}
      />
      <CalendarGrid state={state} />
    </div>
  );
}

// ---- Trigger + Overlay --------------------------------------------------

type CoreProps = {
  className?: string;
  mode: DatePickerMode;
  placeholder?: string;
  disabled?: boolean;
  minValue?: CalendarDate;
  maxValue?: CalendarDate;
  unavailable: Set<string>;
  locale: string;
  modalBreakpoint: number;
  fieldId?: string;
  hasError?: boolean;
  describedBy?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
};

function DatePickerCore({
  className,
  mode,
  placeholder,
  disabled,
  minValue,
  maxValue,
  unavailable,
  locale,
  modalBreakpoint,
  fieldId,
  hasError,
  describedBy,
  value,
  onChange,
  onBlur,
}: CoreProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { state, inCanvas, safeClose } = useCanvasOverlay({});
  const isOpen = state.isOpen;
  const isMobile = useMediaQuery(
    modalBreakpoint > 0 ? `(max-width: ${modalBreakpoint - 1}px)` : ''
  );
  const overlayId = useId();

  // Serialize / deserialize form value.
  const singleValue = mode === 'single' ? value : undefined;
  const rangeValue: RangeValue | undefined = useMemo(() => {
    if (mode !== 'range' || !value) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(value);

      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.start === 'string' &&
        typeof parsed.end === 'string'
      ) {
        return parsed;
      }
    } catch {
      // fall through
    }

    return undefined;
  }, [mode, value]);

  const displayLabel = (() => {
    if (mode === 'single') {
      const d = toCalendarDate(singleValue);

      return d ? formatDate(d, locale) : (placeholder ?? '');
    }
    const s = toCalendarDate(rangeValue?.start);
    const e = toCalendarDate(rangeValue?.end);

    if (s && e) {
      return `${formatDate(s, locale)} – ${formatDate(e, locale)}`;
    }

    return placeholder ?? '';
  })();

  const commitSingle = (iso: string) => onChange(iso);
  const commitRange = (r: RangeValue) => onChange(JSON.stringify(r));

  // Outside click closes when popover (mobile modal uses backdrop click).
  useInteractOutside({
    ref: rootRef,
    isDisabled: inCanvas || !isOpen || isMobile,
    onInteractOutside: () => safeClose(),
  });

  const onOverlayKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (inCanvas) {
      return;
    }
    if (e.key === 'Escape') {
      e.stopPropagation();
      safeClose();
    }
  };

  // Also update the header component ref (state param was unused).
  const overlayContent =
    mode === 'single' ? (
      <SingleCalendar
        value={singleValue}
        onChange={commitSingle}
        minValue={minValue}
        maxValue={maxValue}
        unavailable={unavailable}
        locale={locale}
        onClose={() => state.close()}
      />
    ) : (
      <RangeCalendar
        value={rangeValue}
        onChange={commitRange}
        minValue={minValue}
        maxValue={maxValue}
        unavailable={unavailable}
        locale={locale}
        onClose={() => state.close()}
      />
    );

  return (
    <div
      ref={rootRef}
      className={className}
      data-mode={mode}
      data-open={isOpen || undefined}
      data-mobile={isMobile || undefined}
      style={{ position: 'relative' }}
    >
      <button
        type="button"
        id={fieldId}
        onClick={() => !disabled && state.toggle()}
        onBlur={onBlur}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? overlayId : undefined}
        aria-describedby={describedBy}
        data-invalid={hasError ? 'true' : undefined}
        style={{
          width: '100%',
          padding: '8px 12px',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
        }}
      >
        {displayLabel || (placeholder ?? 'Pick a date')}
      </button>
      {isOpen ? (
        isMobile ? (
          <div
            role="dialog"
            aria-modal="true"
            id={overlayId}
            onKeyDown={onOverlayKeyDown}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={e => {
              // Close when backdrop clicked (not when calendar clicked).
              if (e.target === e.currentTarget) {
                safeClose();
              }
            }}
          >
            <div
              style={{
                background: 'white',
                padding: '16px',
                borderRadius: '8px',
                maxWidth: '95vw',
                maxHeight: '95vh',
                overflow: 'auto',
              }}
            >
              {overlayContent}
            </div>
          </div>
        ) : (
          <div
            role="dialog"
            id={overlayId}
            onKeyDown={onOverlayKeyDown}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              padding: '12px',
              zIndex: 10,
              background: 'white',
              border: '1px solid #ccc',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            {overlayContent}
          </div>
        )
      ) : null}
    </div>
  );
}

export default function DatePickerInput({
  className,
  name: nameOverride,
  mode = 'single',
  placeholder,
  disabled,
  minValue,
  maxValue,
  unavailableDates,
  locale = 'en-US',
  modalBreakpoint = 640,
}: DatePickerInputProps) {
  const ctx = useFormFieldContext();
  const form = useFormContext();
  const name = nameOverride ?? ctx?.name ?? '';
  const unavailable = useMemo(
    () => parseUnavailable(unavailableDates),
    [unavailableDates]
  );
  const min = useMemo(() => toCalendarDate(minValue), [minValue]);
  const max = useMemo(() => toCalendarDate(maxValue), [maxValue]);
  const describedBy =
    [ctx?.describedById, ctx?.errorId].filter(Boolean).join(' ') || undefined;

  const commonCoreProps = {
    className,
    mode,
    placeholder,
    disabled,
    minValue: min,
    maxValue: max,
    unavailable,
    locale,
    modalBreakpoint,
    fieldId: ctx?.fieldId,
    hasError: ctx?.hasError,
    describedBy,
  };

  if (!form || !name) {
    return (
      <DatePickerCore
        {...commonCoreProps}
        value=""
        onChange={() => {
          // No-op outside form context.
        }}
      />
    );
  }

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <DatePickerCore
          {...commonCoreProps}
          value={(field.value as string | undefined) ?? ''}
          onChange={next => field.onChange(next)}
          onBlur={field.onBlur}
        />
      )}
    />
  );
}
