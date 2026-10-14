'use client';

import React, { type ReactNode } from 'react';

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { error: Error | null };

// Minimal error boundary: one throwing Plasmic component must not take down
// the whole page. Logs to console; renders `fallback` (default: nothing).
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[error-boundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? null;
    }

    return this.props.children;
  }
}
