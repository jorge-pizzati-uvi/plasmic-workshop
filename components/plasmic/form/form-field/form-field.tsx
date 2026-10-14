'use client';

// FormField — attachment component. Wraps a single form field with:
//   - label + optional description slots
//   - error message rendered from react-hook-form state
//   - FormFieldContext so nested input primitives auto-wire name/id/aria
//
// Author DX: drop FormField inside FormContainer, set `name`, drop any
// input primitive (TextInput / SelectInput / CheckboxInput / …) inside.

import React, { useId, useMemo, type ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormFieldContext } from '../_shared/form-context';

export type FormFieldProps = {
  className?: string;
  /** react-hook-form field name (dot-notation supported). */
  name?: string;
  label?: ReactNode;
  description?: ReactNode;
  required?: boolean;
  children?: ReactNode;
};

export default function FormField({
  className,
  name,
  label,
  description,
  required = false,
  children,
}: FormFieldProps) {
  const formMethods = useFormContext();
  const generatedId = useId();
  const fieldId = `field-${generatedId}`;
  const descId = description ? `${fieldId}-desc` : undefined;
  const errorId = `${fieldId}-error`;

  const fieldName = name ?? '';
  const errorObj = fieldName
    ? // Support dot-notation via lodash-like get
      fieldName
        .split('.')
        .reduce<unknown>(
          (acc, key) =>
            acc && typeof acc === 'object' && key in (acc as object)
              ? (acc as Record<string, unknown>)[key]
              : undefined,
          formMethods?.formState.errors
        )
    : undefined;
  const errorMessage =
    errorObj && typeof errorObj === 'object' && 'message' in errorObj
      ? String((errorObj as { message?: unknown }).message ?? '')
      : '';
  const hasError = Boolean(errorMessage);

  const ctxValue = useMemo(
    () => ({
      name: fieldName,
      fieldId,
      describedById: descId,
      errorId: hasError ? errorId : undefined,
      hasError,
      required,
    }),
    [fieldName, fieldId, descId, errorId, hasError, required]
  );

  return (
    <FormFieldContext.Provider value={ctxValue}>
      <div className={className} data-invalid={hasError ? 'true' : 'false'}>
        {label !== undefined && label !== null ? (
          <label htmlFor={fieldId}>
            {label}
            {required ? <span aria-hidden="true"> *</span> : null}
          </label>
        ) : null}
        {description !== undefined && description !== null ? (
          <div id={descId}>{description}</div>
        ) : null}
        {children}
        {hasError ? (
          <div id={errorId} role="alert">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </FormFieldContext.Provider>
  );
}
