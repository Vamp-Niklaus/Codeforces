import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Copy, Check, Terminal, ShieldAlert, Cpu } from "lucide-react";
import { isSupabaseConfigured } from "../lib/supabase";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
    showDetails: true,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleCopyDetails = async () => {
    const { error, errorInfo } = this.state;
    const diagnosticReport = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      errorName: error?.name,
      errorMessage: error?.message,
      errorStack: error?.stack,
      componentStack: errorInfo?.componentStack,
      environment: {
        isSupabaseConfigured,
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "not set",
      },
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnosticReport, null, 2));
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (e) {
      console.error("Failed to copy diagnostic report", e);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error("Failed to clear storage", e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const { error, errorInfo, copied, showDetails } = this.state;
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header Banner */}
            <div className="bg-rose-950/40 border-b border-rose-500/20 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    Application Error / Debug Dashboard
                  </h1>
                  <p className="text-xs text-rose-300/80">
                    A runtime exception was caught by React ErrorBoundary.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-xs font-mono font-medium text-rose-400">
                {error?.name || "Runtime Error"}
              </span>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
              {/* Primary Error Message */}
              <div className="bg-slate-950 border border-rose-500/30 rounded-xl p-4">
                <div className="text-xs font-mono uppercase tracking-wider text-rose-400 mb-1 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Exception Message
                </div>
                <p className="text-sm font-mono text-rose-200 font-semibold break-words">
                  {error?.message || "An unexpected error occurred during component rendering."}
                </p>
              </div>

              {/* System Diagnostic Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-blue-400" /> Supabase Connection
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-300">Status</span>
                    {isSupabaseConfigured ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold font-mono">
                        Configured
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold font-mono">
                        Missing Credentials
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-purple-400" /> Backend API Base URL
                  </div>
                  <p className="text-xs font-mono text-slate-300 truncate" title={apiBaseUrl}>
                    {apiBaseUrl}
                  </p>
                </div>
              </div>

              {/* Stack Traces */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Component Stacktrace
                  </span>
                  <button
                    onClick={() => this.setState({ showDetails: !showDetails })}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    {showDetails ? "Hide Stack Details" : "Show Stack Details"}
                  </button>
                </div>

                {showDetails && (
                  <div className="space-y-3">
                    {error?.stack && (
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                        <div className="text-xs font-mono text-slate-400 mb-2">Error Call Stack:</div>
                        <pre className="text-xs font-mono text-rose-300/90 whitespace-pre-wrap overflow-x-auto max-h-48 scrollbar-thin">
                          {error.stack}
                        </pre>
                      </div>
                    )}

                    {errorInfo?.componentStack && (
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                        <div className="text-xs font-mono text-slate-400 mb-2">React Component Stack:</div>
                        <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap overflow-x-auto max-h-48 scrollbar-thin">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Action Toolbar */}
            <div className="bg-slate-950/80 border-t border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={this.handleCopyDetails}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    Copy Diagnostic Details
                  </>
                )}
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={this.handleResetStorage}
                  className="px-4 py-2 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 rounded-xl text-xs font-medium border border-rose-800/40 transition-all"
                >
                  Clear Cache & Reload
                </button>

                <button
                  onClick={this.handleReload}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all"
                >
                  <RefreshCw className="w-4 h-4 animate-spin-slow" />
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
