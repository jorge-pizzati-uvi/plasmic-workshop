'use client';

// ComboboxInput — searchable single-select. Client-side substring filter
// on a static `options` array. Fully accessible: role=combobox, arrow-key
// nav in listbox, Enter/Space to select, Escape to close, outside-click
// dismiss.
//
// Scope: static options only. For async typeahead (fetch on query), add
// an async loader prop in a later phase.

import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useInteractOutside } from 'react-aria';
import { Controller, useFormContext } from 'react-hook-form';
import { useCanvasOverlay } from '../../_shared';
import { useFormFieldContext } from '../_shared/form-context';

export type ComboboxOption = { label: string; value: string };

export type ComboboxInputProps = {
  className?: string;
  name?: string;
  options?: ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  /** Empty-state message when no options match. */
  noResultsLabel?: string;
};

type ComboboxCoreProps = ComboboxInputProps & {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  fieldId?: string;
  hasError?: boolean;
  describedBy?: string;
};

function ComboboxCore({
  className,
  options = [],
  placeholder,
  disabled,
  noResultsLabel = 'No results',
  value,
  onChange,
  onBlur,
  fieldId,
  hasError,
  describedBy,
}: ComboboxCoreProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useId();
  const optionIdPrefix = `${listboxId}-opt`;

  const selectedOption = options.find(o => o.value === value);
  const [query, setQuery] = useState(selectedOption?.label ?? '');
  const { state, inCanvas, safeClose } = useCanvasOverlay({});
  const isOpen = state.isOpen;
  const [highlightIndex, setHighlightIndex] = useState(0);

  // Sync query text when the external value changes (e.g. form reset).
  useEffect(() => {
    setQuery(selectedOption?.label ?? '');
  }, [selectedOption?.label]);

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const closeAndRestore = useCallback(() => {
    safeClose();
    setQuery(selectedOption?.label ?? '');
  }, [safeClose, selectedOption?.label]);

  useInteractOutside({
    ref: rootRef,
    isDisabled: inCanvas || !isOpen,
    onInteractOutside: closeAndRestore,
  });

  const selectAt = useCallback(
    (idx: number) => {
      const opt = filtered[idx];

      if (!opt) {
        return;
      }
      onChange(opt.value);
      setQuery(opt.label);
      state.close();
      inputRef.current?.focus();
    },
    [filtered, onChange, state]
  );

  const onInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            state.open();

            return;
          }
          setHighlightIndex(i =>
            filtered.length ? (i + 1) % filtered.length : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!isOpen) {
            state.open();

            return;
          }
          setHighlightIndex(i =>
            filtered.length ? (i - 1 + filtered.length) % filtered.length : 0
          );
          break;
        case 'Enter':
          if (isOpen && filtered.length) {
            e.preventDefault();
            selectAt(highlightIndex);
          }
          break;
        case 'Escape':
          if (isOpen) {
            e.preventDefault();
            closeAndRestore();
          }
          break;
        case 'Home':
          if (isOpen) {
            e.preventDefault();
            setHighlightIndex(0);
          }
          break;
        case 'End':
          if (isOpen) {
            e.preventDefault();
            setHighlightIndex(Math.max(0, filtered.length - 1));
          }
          break;
        default:
      }
    },
    [closeAndRestore, filtered, highlightIndex, isOpen, selectAt, state]
  );

  const activeDescendant =
    isOpen && filtered.length
      ? `${optionIdPrefix}-${highlightIndex}`
      : undefined;

  return (
    <div ref={rootRef} className={className} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        id={fieldId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={activeDescendant}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => state.open()}
        onChange={e => {
          setQuery(e.target.value);
          state.open();
          setHighlightIndex(0);
          // Clear the form value if the user has typed past a valid label.
          if (e.target.value === '') {
            onChange('');
          }
        }}
        onKeyDown={onInputKeyDown}
        onBlur={onBlur}
      />
      {isOpen ? (
        <ul
          id={listboxId}
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            zIndex: 10,
            background: 'white',
            border: '1px solid #ccc',
            maxHeight: '240px',
            overflowY: 'auto',
          }}
        >
          {filtered.length === 0 ? (
            <li
              role="option"
              aria-selected={false}
              aria-disabled="true"
              style={{ padding: '8px', opacity: 0.6 }}
            >
              {noResultsLabel}
            </li>
          ) : (
            filtered.map((opt, i) => {
              const highlighted = i === highlightIndex;
              const selected = opt.value === value;

              return (
                <li
                  key={opt.value}
                  id={`${optionIdPrefix}-${i}`}
                  role="option"
                  aria-selected={selected}
                  onMouseDown={e => {
                    // Prevent input blur before click fires.
                    e.preventDefault();
                    selectAt(i);
                  }}
                  onMouseEnter={() => setHighlightIndex(i)}
                  style={{
                    padding: '8px',
                    cursor: 'pointer',
                    background: highlighted ? '#f0f0f0' : 'transparent',
                    fontWeight: selected ? 600 : 400,
                  }}
                >
                  {opt.label}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}

export default function ComboboxInput({
  className,
  name: nameOverride,
  options,
  placeholder,
  disabled,
  noResultsLabel,
}: ComboboxInputProps) {
  const ctx = useFormFieldContext();
  const form = useFormContext();
  const name = nameOverride ?? ctx?.name ?? '';

  const describedBy =
    [ctx?.describedById, ctx?.errorId].filter(Boolean).join(' ') || undefined;

  if (!form || !name) {
    return (
      <ComboboxCore
        className={className}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        noResultsLabel={noResultsLabel}
        value=""
        onChange={() => {
          // No-op outside form context.
        }}
        fieldId={ctx?.fieldId}
        hasError={ctx?.hasError}
        describedBy={describedBy}
      />
    );
  }

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <ComboboxCore
          className={className}
          options={options}
          placeholder={placeholder}
          disabled={disabled}
          noResultsLabel={noResultsLabel}
          value={(field.value as string | undefined) ?? ''}
          onChange={next => field.onChange(next)}
          onBlur={field.onBlur}
          fieldId={ctx?.fieldId}
          hasError={ctx?.hasError}
          describedBy={describedBy}
        />
      )}
    />
  );
}
