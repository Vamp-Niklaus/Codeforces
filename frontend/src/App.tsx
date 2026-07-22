import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "./lib/supabase";
import { Session } from "@supabase/supabase-js";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Contests from "./pages/Contests";
import Problems from "./pages/Problems";
import Workspace from "./pages/Workspace";
import Submissions from "./pages/Submissions";
import { Trophy, HelpCircle, LogOut, Terminal, Sparkles, Layers, Sun, Moon, Home as HomeIcon } from "lucide-react";

// Initialize Query Client for caching API states
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cfHandle, setCfHandle] = useState<string>(() => localStorage.getItem("cf_user_handle") || "");
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [tempHandle, setTempHandle] = useState("");
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = () => {
    supabase.auth.signOut();
  };

  const handleSaveHandle = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = tempHandle.trim();
    setCfHandle(clean);
    localStorage.setItem("cf_user_handle", clean);
    window.dispatchEvent(new Event("cf_handle_changed"));
    setIsEditingHandle(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-500 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm font-semibold tracking-wider">Establishing secure session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
      {/* Navigation Header */}
      <header className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shadow">
              <Terminal className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 text-lg">
              CF Companion <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                location.pathname === "/"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              }`}
            >
              <span className="flex items-center gap-2">
                <HomeIcon className="w-4 h-4" />
                Home
              </span>
            </Link>

            <Link
              to="/contests"
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                location.pathname.startsWith("/contests")
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              }`}
            >
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Contests
              </span>
            </Link>

            <Link
              to="/problems"
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                location.pathname.startsWith("/problems") && !location.pathname.includes("problem")
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              }`}
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Problems
              </span>
            </Link>

            <Link
              to="/submissions"
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                location.pathname.startsWith("/submissions")
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              }`}
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Submissions
              </span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm flex items-center gap-1.5 text-xs font-semibold"
            title={`Switch to ${theme === "light" ? "Dark" : "Codeforces Light"} Mode`}
          >
            {theme === "light" ? (
              <>
                <Moon className="w-4 h-4 text-purple-600" />
                <span className="hidden lg:inline text-slate-700">Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden lg:inline text-slate-200">CF Light</span>
              </>
            )}
          </button>

          {/* Codeforces Handle Badge / Input */}
          {isEditingHandle ? (
            <form onSubmit={handleSaveHandle} className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                placeholder="CF Handle (e.g. tourist)..."
                value={tempHandle}
                onChange={(e) => setTempHandle(e.target.value)}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-blue-500 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none w-36 font-mono"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-500 transition-all"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditingHandle(false)}
                className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-lg hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              onClick={() => {
                setTempHandle(cfHandle);
                setIsEditingHandle(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 text-xs font-semibold transition-all group"
              title="Click to change Codeforces Handle"
            >
              <span className="text-[10px] uppercase font-mono tracking-wider">CF:</span>
              <span className="font-mono font-bold group-hover:underline">
                {cfHandle || "+ Add Handle"}
              </span>
            </button>
          )}

          {/* Active Email display */}
          <span className="text-xs font-semibold font-mono text-slate-500 dark:text-slate-400 max-w-[160px] truncate hidden lg:inline-block">
            {session.user.email}
          </span>

          {/* Sign out button */}
          <button
            onClick={handleSignOut}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all shadow-sm"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Study Workspace */}
      <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/contests" element={<Contests />} />
          <Route path="/problems" element={<Problems />} />
          <Route path="/submissions" element={<Submissions />} />
          <Route path="/contest/:contestId/problem/:index" element={<Workspace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
