'use client';

// TextInput — Plasmic code component. Native <input> / <textarea> wired to
// react-hook-form via Controller. Reads `name` + id/aria wiring from the
// enclosing FormField context; also accepts explicit `name` prop for
// standalone use.
//
// WCAG 2.1 AA: label association via id; aria-invalid + aria-describedby
// come from FormField; native input events accessible.

import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useFormFieldContext } from '../_shared/form-context';

export type TextInputType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'password'
  | 'url'
  | 'search'
  | 'textarea';

export type TextInputProps = {
  className?: string;
  /** Override the FormField name. Usually left blank. */
  name?: string;
  type?: TextInputType;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  readOnly?: boolean;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
};

export default function TextInput({
  className,
  name: nameOverride,
  type = 'text',
  placeholder,
  autoComplete,
  disabled,
  readOnly,
  rows,
  min,
  max,
  step,
}: TextInputProps) {
  const ctx = useFormFieldContext();
  const form = useFormContext();
  const name = nameOverride ?? ctx?.name ?? '';

  if (!form || !name) {
    // Fallback: render an uncontrolled input so Studio canvas doesn't crash
    // when placed outside a FormContainer/FormField.
    const commonProps = {
      className,
      placeholder,
      autoComplete,
      disabled,
      readOnly,
    };

    if (type === 'textarea') {
      return <textarea {...commonProps} rows={rows} />;
    }

    return (
      <input {...commonProps} type={type} min={min} max={max} step={step} />
    );
  }

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => {
        const commonProps = {
          className,
          id: ctx?.fieldId,
          name: field.name,
          value: (field.value as string | undefined) ?? '',
          onChange: field.onChange,
          onBlur: field.onBlur,
          ref: field.ref,
          placeholder,
          autoComplete,
          disabled,
          readOnly,
          required: ctx?.required,
          'aria-invalid': ctx?.hasError || undefined,
          'aria-describedby':
            [ctx?.describedById, ctx?.errorId].filter(Boolean).join(' ') ||
            undefined,
        };

        if (type === 'textarea') {
          return <textarea {...commonProps} rows={rows} />;
        }

        return (
          <input {...commonProps} type={type} min={min} max={max} step={step} />
        );
      }}
    />
  );
}
