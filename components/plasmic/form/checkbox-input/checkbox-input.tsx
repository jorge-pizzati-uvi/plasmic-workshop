'use client';

// CheckboxInput — native <input type="checkbox"> wired to react-hook-form.
// Author places label text either via the enclosing FormField's `label`
// prop OR inline via the `label` prop here (renders next to the box).

import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useFormFieldContext } from '../_shared/form-context';

export type CheckboxInputProps = {
  className?: string;
  name?: string;
  /** Inline label rendered next to the checkbox. */
  label?: React.ReactNode;
  disabled?: boolean;
};

export default function CheckboxInput({
  className,
  name: nameOverride,
  label,
  disabled,
}: CheckboxInputProps) {
  const ctx = useFormFieldContext();
  const form = useFormContext();
  const name = nameOverride ?? ctx?.name ?? '';

  if (!form || !name) {
    return (
      <label className={className}>
        <input type="checkbox" disabled={disabled} />
        {label !== undefined && label !== null ? <span>{label}</span> : null}
      </label>
    );
  }

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <label className={className}>
          <input
            type="checkbox"
            id={ctx?.fieldId}
            name={field.name}
            checked={Boolean(field.value)}
            onChange={e => field.onChange(e.target.checked)}
            onBlur={field.onBlur}
            ref={field.ref}
            disabled={disabled}
            aria-invalid={ctx?.hasError || undefined}
            aria-describedby={
              [ctx?.describedById, ctx?.errorId].filter(Boolean).join(' ') ||
              undefined
            }
          />
          {label !== undefined && label !== null ? <span>{label}</span> : null}
        </label>
      )}
    />
  );
}
