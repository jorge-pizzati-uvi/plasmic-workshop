'use client';

// CheckboxGroupInput — multi-select checkbox list wired to react-hook-form
// as `string[]`. Author supplies an `options` array + an `itemTemplate` slot
// which Plasmic clones per option via `repeatedElement`. Each iteration
// exposes `$ctx.checkboxOption.{label,value,checked,toggle}` so the author
// can bind text, style checked state, and wire the toggle to a click
// handler.
//
// Rendering-only shell — no native <input type="checkbox"> per iteration
// unless the author places one inside the itemTemplate. For a fully-native
// group, use RadioGroupInput or per-field CheckboxInput.

import { DataProvider, repeatedElement } from '@plasmicapp/host';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useFormFieldContext } from '../_shared/form-context';

export type CheckboxGroupOption = { label: string; value: string };

export type CheckboxGroupInputProps = {
  className?: string;
  name?: string;
  options?: CheckboxGroupOption[];
  disabled?: boolean;
  /** Layout direction of the option list. */
  direction?: 'row' | 'column';
  /** Template repeated per option — bind text/state via $ctx.checkboxOption. */
  itemTemplate?: React.ReactNode;
};

type OptionContext = {
  label: string;
  value: string;
  checked: boolean;
  toggle: () => void;
};

export default function CheckboxGroupInput({
  className,
  name: nameOverride,
  options = [],
  disabled,
  direction = 'column',
  itemTemplate,
}: CheckboxGroupInputProps) {
  const ctx = useFormFieldContext();
  const form = useFormContext();
  const name = nameOverride ?? ctx?.name ?? '';

  const renderList = (values: string[], onChange: (next: string[]) => void) => (
    <div
      className={className}
      role="group"
      data-invalid={ctx?.hasError ? 'true' : undefined}
      aria-describedby={
        [ctx?.describedById, ctx?.errorId].filter(Boolean).join(' ') ||
        undefined
      }
      style={{
        display: 'flex',
        flexDirection: direction,
        gap: '8px',
      }}
    >
      {options.map((opt, i) => {
        const checked = values.includes(opt.value);
        const toggle = () => {
          if (disabled) {
            return;
          }
          onChange(
            checked
              ? values.filter(v => v !== opt.value)
              : [...values, opt.value]
          );
        };
        const optionCtx: OptionContext = {
          label: opt.label,
          value: opt.value,
          checked,
          toggle,
        };

        return (
          <DataProvider key={opt.value} name="checkboxOption" data={optionCtx}>
            {repeatedElement(i, itemTemplate)}
          </DataProvider>
        );
      })}
    </div>
  );

  // Fallback: no options at all — render a placeholder for canvas UX.
  if (!options.length) {
    return (
      <div
        className={className}
        style={{ display: 'flex', flexDirection: direction }}
      >
        <em style={{ opacity: 0.6 }}>Add options to see the checkbox list</em>
      </div>
    );
  }

  if (!form || !name) {
    // Uncontrolled fallback for canvas placement outside a form.
    return renderList([], () => {
      // No-op — no form context to write to.
    });
  }

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => {
        const values = Array.isArray(field.value)
          ? (field.value as string[])
          : [];

        return renderList(values, next => field.onChange(next));
      }}
    />
  );
}
