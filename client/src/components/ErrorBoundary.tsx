import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-4">An unexpected error occurred.</h2>

            <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
              <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                {this.state.error?.stack}
              </pre>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all",
                  "bg-primary text-primary-foreground shadow-lg shadow-primary/20",
                  "hover:scale-105 active:scale-95 cursor-pointer"
                )}
              >
                <RotateCcw size={18} />
                Recarregar Página
              </button>

              <button
                onClick={() => {
                  if (window.confirm("Isso irá limpar o cache local e deslogar você para resolver erros persistentes. Continuar?")) {
                    sessionStorage.clear();
                    localStorage.clear();
                    // Tentar remover service workers
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.getRegistrations().then(registrations => {
                        for (let registration of registrations) {
                          registration.unregister();
                        }
                      });
                    }
                    window.location.href = "/";
                  }
                }}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all",
                  "bg-destructive/10 text-destructive border border-destructive/20",
                  "hover:bg-destructive hover:text-white cursor-pointer"
                )}
              >
                Limpar Cache e Sair
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
