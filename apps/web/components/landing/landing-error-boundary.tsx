"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import Link from "next/link";

interface Props {
  children: ReactNode;
  fallbackSection?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class LandingErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Landing] Section error:", this.props.fallbackSection, error, info);
  }

  render() {
    if (this.state.hasError) {
      // Render nothing for individual section failures — page still shows
      return null;
    }
    return this.props.children;
  }
}

// Full-page error boundary used in layout
export class FullPageErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Landing] Fatal error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center max-w-md px-6 py-16">
            <div className="text-5xl mb-6">🚀</div>
            <h1 className="text-2xl font-bold mb-3">Isysocial</h1>
            <p className="text-muted-foreground mb-8">
              La plataforma de gestión de redes sociales para agencias de marketing.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 text-sm font-medium transition-colors"
              >
                Iniciar sesión
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent h-10 px-6 text-sm font-medium transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
