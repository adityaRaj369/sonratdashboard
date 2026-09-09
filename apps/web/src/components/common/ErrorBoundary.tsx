"use client";

import React from "react";

type ErrorBoundaryProps = {
  children?: React.ReactNode;
  title?: string;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Keep console error for debugging
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  override render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-start justify-center p-8">
          <div className="w-full max-w-3xl rounded-2xl border border-rose-200 bg-white shadow-sm p-6">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-600">
              Something crashed
            </div>
            <h1 className="mt-2 text-lg font-black text-slate-900">{this.props.title || "Page error"}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              This is a dev-only error boundary to avoid a white screen.
            </p>
            <div className="mt-4 rounded-xl bg-slate-900 text-slate-50 p-4 overflow-auto">
              <pre className="text-xs leading-relaxed whitespace-pre-wrap">{String(error?.stack || error?.message || error)}</pre>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
