import { useState } from "react";
import { Link } from "react-router-dom";
import { History, FileCode, Trophy, Trash2, X, ExternalLink, ArrowRight } from "lucide-react";

interface ProblemHistoryItem {
  problemId: string;
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  lastOpened: number;
}

interface ContestHistoryItem {
  id: number;
  name: string;
  lastOpened: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"PROBLEMS" | "CONTESTS">("PROBLEMS");

  // Load problem history from localStorage
  const [problemHistory, setProblemHistory] = useState<ProblemHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem("cf_problem_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load contest history from localStorage
  const [contestHistory, setContestHistory] = useState<ContestHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem("cf_contest_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Dismiss a single problem entry
  const handleDismissProblem = (problemId: string) => {
    setProblemHistory((prev) => {
      const updated = prev.filter((item) => item.problemId !== problemId);
      localStorage.setItem("cf_problem_history", JSON.stringify(updated));
      return updated;
    });
  };

  // Dismiss a single contest entry
  const handleDismissContest = (contestId: number) => {
    setContestHistory((prev) => {
      const updated = prev.filter((item) => item.id !== contestId);
      localStorage.setItem("cf_contest_history", JSON.stringify(updated));
      return updated;
    });
  };

  // Clear all problem history
  const handleClearProblemHistory = () => {
    setProblemHistory([]);
    localStorage.removeItem("cf_problem_history");
  };

  // Clear all contest history
  const handleClearContestHistory = () => {
    setContestHistory([]);
    localStorage.removeItem("cf_contest_history");
  };

  const formatDate = (ms: number) => {
    if (!ms) return "Recently";
    return new Date(ms).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 font-sans max-w-6xl mx-auto">
      {/* Main Recent History Dashboard */}
      <div className="glass rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
        {/* Header & Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Opened Activity History
            </h1>
          </div>

          {/* Two Nested Tabs: Problems (default) & Contests */}
          <div className="flex bg-slate-200 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-300 dark:border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab("PROBLEMS")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "PROBLEMS"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileCode className="w-4 h-4" />
              Opened Problems ({problemHistory.length})
            </button>

            <button
              onClick={() => setActiveTab("CONTESTS")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "CONTESTS"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              Opened Contests ({contestHistory.length})
            </button>
          </div>
        </div>

        {/* NESTED TAB 1: RECENTLY OPENED PROBLEMS */}
        {activeTab === "PROBLEMS" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Problems you opened in past practice sessions. Click any row to resume immediately.
              </p>

              {problemHistory.length > 0 && (
                <button
                  onClick={handleClearProblemHistory}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All Problem History
                </button>
              )}
            </div>

            {problemHistory.length === 0 ? (
              <div className="py-16 text-center text-slate-500 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                <FileCode className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No recently opened problems
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  When you open any problem statement in the workspace, it will appear here for easy resume.
                </p>
                <Link
                  to="/problems"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 transition-all shadow"
                >
                  Explore Problem Set <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {problemHistory.map((item) => (
                  <div
                    key={item.problemId}
                    className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-blue-500/40 transition-all group"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-mono font-bold text-blue-600 dark:text-blue-400 text-xs shrink-0">
                        {item.index}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                            #{item.problemId}
                          </span>
                          {item.rating && (
                            <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 font-mono text-[10px] font-bold">
                              {item.rating}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500 ml-auto hidden sm:inline">
                            Opened {formatDate(item.lastOpened)}
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-sm truncate mt-0.5">
                          {item.name}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/contest/${item.contestId}/problem/${item.index}`}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5"
                      >
                        Resume <ExternalLink className="w-3 h-3" />
                      </Link>

                      {/* Dismiss button on the far right */}
                      <button
                        onClick={() => handleDismissProblem(item.problemId)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                        title="Dismiss from history"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NESTED TAB 2: RECENTLY OPENED CONTESTS */}
        {activeTab === "CONTESTS" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Contests you opened in past practice sessions. Click any row to view problem set.
              </p>

              {contestHistory.length > 0 && (
                <button
                  onClick={handleClearContestHistory}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All Contest History
                </button>
              )}
            </div>

            {contestHistory.length === 0 ? (
              <div className="py-16 text-center text-slate-500 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                <Trophy className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No recently opened contests
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  When you open any contest set, it will appear here for easy access.
                </p>
                <Link
                  to="/contests"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 transition-all shadow"
                >
                  Browse Contests <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {contestHistory.map((item) => (
                  <div
                    key={item.id}
                    className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-blue-500/40 transition-all group"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-mono font-bold text-xs shrink-0">
                        #{item.id}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-sm truncate">
                          {item.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Opened {formatDate(item.lastOpened)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/problems?contestId=${item.id}`}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5"
                      >
                        Explore Problems <ExternalLink className="w-3 h-3" />
                      </Link>

                      {/* Dismiss button on the far right */}
                      <button
                        onClick={() => handleDismissContest(item.id)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                        title="Dismiss from history"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
