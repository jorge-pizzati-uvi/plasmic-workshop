'use client';

// SelectInput — native <select>. Fully accessible by default (keyboard,
// screen reader, mobile picker). Author styles the outer wrapper + option
// list via Plasmic. For typeahead / custom-styled dropdowns, use a future
// ComboboxInput (react-aria) instead.
//
// Options are provided via the `options` array prop; each item is a
// { label, value } pair. Author can also use a JSON-encoded string list.

import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useFormFieldContext } from '../_shared/form-context';

export type SelectOption = { label: string; value: string };

export type SelectInputProps = {
  className?: string;
  name?: string;
  options?: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
};

export default function SelectInput({
  className,
  name: nameOverride,
  options = [],
  placeholder,
  disabled,
}: SelectInputProps) {
  const ctx = useFormFieldContext();
  const form = useFormContext();
  const name = nameOverride ?? ctx?.name ?? '';

  const renderOptions = () => (
    <>
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </>
  );

  if (!form || !name) {
    return (
      <select className={className} disabled={disabled} defaultValue="">
        {renderOptions()}
      </select>
    );
  }

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <select
          className={className}
          id={ctx?.fieldId}
          name={field.name}
          value={(field.value as string | undefined) ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          ref={field.ref}
          disabled={disabled}
          required={ctx?.required}
          aria-invalid={ctx?.hasError || undefined}
          aria-describedby={
            [ctx?.describedById, ctx?.errorId].filter(Boolean).join(' ') ||
            undefined
          }
        >
          {renderOptions()}
        </select>
      )}
    />
  );
}
