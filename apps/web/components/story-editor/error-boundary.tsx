"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  basePath: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class StoryEditorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[Isystory Studio Error]", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoBack = () => {
    window.location.href = this.props.basePath;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
          <div className="max-w-md mx-auto text-center space-y-6 p-8">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold">
                Error en Isystory Studio
              </h2>
              <p className="text-muted-foreground text-sm">
                Ocurrió un error al cargar el editor. Esto puede deberse a un
                problema temporal con el navegador o la conexión.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3 text-left font-mono break-all">
                {this.state.error?.message || "Error desconocido"}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={this.handleGoBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Contenido
              </Button>
              <Button onClick={this.handleRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Si el error persiste, intenta recargar la página con{" "}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                Ctrl+Shift+R
              </kbd>{" "}
              o limpiar la caché del navegador.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
