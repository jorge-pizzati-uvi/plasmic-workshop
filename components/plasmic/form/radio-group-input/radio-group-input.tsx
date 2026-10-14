'use client';

// RadioGroupInput — native <input type="radio"> group wired to
// react-hook-form. Group gets role="radiogroup" + aria-labelledby via
// FormField label; each radio shares the same `name` (react-hook-form
// tracks selected value).

import React, { useId } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useFormFieldContext } from '../_shared/form-context';

export type RadioOption = { label: string; value: string };

export type RadioGroupInputProps = {
  className?: string;
  name?: string;
  options?: RadioOption[];
  disabled?: boolean;
  /** Layout direction of the radio list. */
  direction?: 'row' | 'column';
};

export default function RadioGroupInput({
  className,
  name: nameOverride,
  options = [],
  disabled,
  direction = 'column',
}: RadioGroupInputProps) {
  const ctx = useFormFieldContext();
  const form = useFormContext();
  const name = nameOverride ?? ctx?.name ?? '';
  const groupId = useId();

  const renderRadio = (
    opt: RadioOption,
    value: string,
    onChange: (v: string) => void
  ) => (
    <label
      key={opt.value}
      style={{ display: direction === 'row' ? 'inline-flex' : 'flex' }}
    >
      <input
        type="radio"
        name={name || groupId}
        value={opt.value}
        checked={value === opt.value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        aria-describedby={
          [ctx?.describedById, ctx?.errorId].filter(Boolean).join(' ') ||
          undefined
        }
      />
      <span>{opt.label}</span>
    </label>
  );

  if (!form || !name) {
    return (
      <div
        className={className}
        role="radiogroup"
        style={{
          display: 'flex',
          flexDirection: direction,
          gap: '8px',
        }}
      >
        {options.map(opt =>
          renderRadio(opt, '', () => {
            // No-op outside form context.
          })
        )}
      </div>
    );
  }

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <div
          className={className}
          role="radiogroup"
          aria-invalid={ctx?.hasError || undefined}
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
          {options.map(opt =>
            renderRadio(opt, (field.value as string | undefined) ?? '', v =>
              field.onChange(v)
            )
          )}
        </div>
      )}
    />
  );
}
