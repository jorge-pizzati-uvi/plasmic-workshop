'use client';

// FormContainer — Plasmic code component. Root of a react-hook-form form.
// Establishes FormProvider so nested FormField / *Input components share
// state. Exposes `$ctx.form.{isSubmitting,isValid,errors}` for Studio
// bindings + refActions `submit` / `reset` for Interactions.
//
// Zero-dep on brands-ui / rebrand-ui. Uses react-hook-form + zod resolver.

import { DataProvider } from '@plasmicapp/loader-nextjs';
import { zodResolver } from '@hookform/resolvers/zod';
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  type FormEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import type { ZodTypeAny } from 'zod';

export type FormContainerMethods = {
  submit: () => void;
  reset: () => void;
};

export type FormContainerProps = {
  className?: string;
  children?: ReactNode;
  /** Optional zod schema for validation. */
  schema?: ZodTypeAny;
  /** Initial field values. */
  defaultValues?: Record<string, unknown>;
  /**
   * Called on successful submit with validated values. Author-wired
   * (Interactions) to backend submit / navigation / state updates.
   */
  onValidSubmit?: (values: Record<string, unknown>) => void;
  /** Called on submit when validation fails. */
  onInvalidSubmit?: (errors: Record<string, unknown>) => void;
  /** react-hook-form validation trigger mode. */
  mode?: 'onSubmit' | 'onBlur' | 'onChange' | 'onTouched' | 'all';
};

const FormContainer = forwardRef<FormContainerMethods, FormContainerProps>(
  (props, userRef: Ref<FormContainerMethods>) => {
    const {
      className,
      children,
      schema,
      defaultValues,
      onValidSubmit,
      onInvalidSubmit,
      mode = 'onSubmit',
    } = props;

    const methods = useForm({
      mode,
      defaultValues,
      resolver: schema ? zodResolver(schema) : undefined,
    });

    const {
      handleSubmit,
      reset,
      formState: { isSubmitting, isValid, errors },
    } = methods;

    const onSubmit = useCallback(
      (e: FormEvent<HTMLFormElement>) => {
        handleSubmit(
          values => onValidSubmit?.(values),
          errs => onInvalidSubmit?.(errs as Record<string, unknown>)
        )(e);
      },
      [handleSubmit, onValidSubmit, onInvalidSubmit]
    );

    useImperativeHandle(
      userRef,
      () => ({
        submit: () => {
          handleSubmit(
            values => onValidSubmit?.(values),
            errs => onInvalidSubmit?.(errs as Record<string, unknown>)
          )();
        },
        reset: () => reset(),
      }),
      [handleSubmit, onValidSubmit, onInvalidSubmit, reset]
    );

    const ctx = useMemo(
      () => ({
        isSubmitting,
        isValid,
        errors,
      }),
      [isSubmitting, isValid, errors]
    );

    return (
      <DataProvider name="form" data={ctx}>
        <FormProvider {...methods}>
          <form className={className} onSubmit={onSubmit} noValidate>
            {children}
          </form>
        </FormProvider>
      </DataProvider>
    );
  }
);

FormContainer.displayName = 'FormContainer';

export default FormContainer;
