'use client';

import { createContext, useContext } from 'react';

// FormFieldContext — established by FormField, consumed by input primitives
// so they know which react-hook-form `name` they bind to. Lets authors
// nest any input inside a FormField without prop-drilling `name` twice.

export type FormFieldContextValue = {
  name: string;
  fieldId: string;
  describedById?: string;
  errorId?: string;
  hasError: boolean;
  required: boolean;
};

export const FormFieldContext = createContext<
  FormFieldContextValue | undefined
>(undefined);

export function useFormFieldContext(): FormFieldContextValue | undefined {
  return useContext(FormFieldContext);
}
