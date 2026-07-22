import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import ViewSolutionModal from "../components/ViewSolutionModal";
import {
  Filter, Loader2, FileCode, User, RefreshCw, Layers, ChevronDown
} from "lucide-react";

interface SubmissionItem {
  id: number;
  contestId: number;
  creationTimeSeconds: number;
  relativeTimeSeconds: number;
  problem: {
    index: string;
    name: string;
    rating?: number;
  };
  author: string;
  programmingLanguage: string;
  verdict: string;
  passedTestCount: number;
  timeConsumedMillis: number;
  memoryConsumedBytes: number;
}

const LANGUAGES = [
  { label: "All Languages", value: "all" },
  { label: "C++ (GNU / Clang)", value: "cpp" },
  { label: "Python (3 / PyPy)", value: "python" },
  { label: "Java / Kotlin", value: "java" },
  { label: "Rust", value: "rust" },
  { label: "Go", value: "go" },
];

const VERDICTS = [
  { label: "Accepted (OK)", value: "OK" },
  { label: "All Verdicts", value: "ALL" },
  { label: "Wrong Answer", value: "WRONG_ANSWER" },
  { label: "Time Limit Exceeded", value: "TIME_LIMIT_EXCEEDED" },
];

export default function Submissions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const contestIdParam = searchParams.get("contestId") || "2219";
  const problemIndexParam = searchParams.get("index") || "all";

  const [contestId, setContestId] = useState<string>(contestIdParam);
  const [problemIndex, setProblemIndex] = useState<string>(problemIndexParam);
  const [verdict, setVerdict] = useState<string>("OK"); // Default filter set to OK (Accepted)
  const [language, setLanguage] = useState<string>("all");
  const [handle, setHandle] = useState<string>(() => localStorage.getItem("cf_user_handle") || "");
  const [fromCount, setFromCount] = useState<number>(50);

  const [activeModal, setActiveModal] = useState<{
    contestId: number;
    submissionId: number;
    problemName: string;
    problemIndex: string;
    verdict: string;
    handle: string;
  } | null>(null);

  // Sync state if URL search params change
  useEffect(() => {
    if (searchParams.get("contestId")) {
      setContestId(searchParams.get("contestId")!);
    }
    if (searchParams.get("index")) {
      setProblemIndex(searchParams.get("index")!);
    }
  }, [searchParams]);

  // Query submissions list
  const { data: submissions = [], isLoading, isFetching, refetch } = useQuery<SubmissionItem[]>({
    queryKey: ["contestStatus", contestId, fromCount, verdict, language, handle, problemIndex],
    queryFn: async () => {
      const cId = parseInt(contestId) || 2219;
      const res = await api.get(`/contest/${cId}/status`, {
        params: {
          from: 1,
          count: fromCount,
          verdict,
          language,
          handle: handle.trim(),
          problemIndex: problemIndex === "all" ? undefined : problemIndex,
        },
      });
      return res.data;
    },
    enabled: Boolean(contestId),
  });

  // Helper: Format creation date
  const formatDate = (secs: number) => {
    if (!secs) return "-";
    return new Date(secs * 1000).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper: Verdict Badge Style
  const getVerdictStyle = (v: string) => {
    if (v === "OK") {
      return "verdict-ok text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    } else if (v === "WRONG_ANSWER") {
      return "verdict-wa text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20";
    } else if (v === "TIME_LIMIT_EXCEEDED") {
      return "verdict-tle text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
    }
    return "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20";
  };

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ contestId, index: problemIndex });
    refetch();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Problem Submissions
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            View live accepted runs and filter submissions directly from Codeforces
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh Live Status
        </button>
      </div>

      {/* Filter Toolbar */}
      <form onSubmit={handleApplyFilter} className="glass p-5 rounded-xl space-y-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Contest ID Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Contest ID:
            </label>
            <input
              type="number"
              value={contestId}
              onChange={(e) => setContestId(e.target.value)}
              placeholder="e.g. 2219"
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Problem Index */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Problem Index:
            </label>
            <select
              value={problemIndex}
              onChange={(e) => setProblemIndex(e.target.value)}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Problems (A-Z)</option>
              {["A", "B", "C", "D", "E", "F", "G", "H"].map((idx) => (
                <option key={idx} value={idx}>Problem {idx}</option>
              ))}
            </select>
          </div>

          {/* Verdict Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Verdict Filter:
            </label>
            <select
              value={verdict}
              onChange={(e) => setVerdict(e.target.value)}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {VERDICTS.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Language Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Language:
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* Handle Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              User Handle:
            </label>
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="e.g. tourist"
                className="w-full pl-8 pr-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow transition-all flex items-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" />
            Apply Filters
          </button>
        </div>
      </form>

      {/* Submissions List Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Fetching submissions from Codeforces...</p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
          {submissions.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileCode className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">No submissions found</h3>
              <p className="text-xs text-slate-500 mt-1">
                No runs matched your active filter settings for Contest #{contestId}.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4 w-28 font-mono">Run #</th>
                      <th className="py-3.5 px-4">When</th>
                      <th className="py-3.5 px-4">Author</th>
                      <th className="py-3.5 px-4">Problem</th>
                      <th className="py-3.5 px-4">Lang</th>
                      <th className="py-3.5 px-4">Verdict</th>
                      <th className="py-3.5 px-4 font-mono text-right">Time</th>
                      <th className="py-3.5 px-4 font-mono text-right">Memory</th>
                      <th className="py-3.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {submissions.map((sub) => {
                      const isAccepted = sub.verdict === "OK";
                      const verdictClass = getVerdictStyle(sub.verdict);

                      return (
                        <tr
                          key={sub.id}
                          className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                            #{sub.id}
                          </td>

                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {formatDate(sub.creationTimeSeconds)}
                          </td>

                          <td className="py-3 px-4 font-bold font-mono text-slate-800 dark:text-slate-200">
                            {sub.author}
                          </td>

                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                            <span className="font-mono text-blue-600 dark:text-blue-400 mr-1.5">
                              {sub.problem.index}
                            </span>
                            {sub.problem.name}
                          </td>

                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {sub.programmingLanguage}
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${verdictClass}`}
                            >
                              {isAccepted ? "Accepted" : sub.verdict}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-mono text-right text-slate-600 dark:text-slate-400">
                            {sub.timeConsumedMillis} ms
                          </td>

                          <td className="py-3 px-4 font-mono text-right text-slate-600 dark:text-slate-400">
                            {roundKb(sub.memoryConsumedBytes)} KB
                          </td>

                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() =>
                                setActiveModal({
                                  contestId: sub.contestId,
                                  submissionId: sub.id,
                                  problemName: sub.problem.name,
                                  problemIndex: sub.problem.index,
                                  verdict: sub.verdict,
                                  handle: sub.author,
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white dark:text-blue-400 border border-blue-500/20 text-xs font-semibold transition-all"
                            >
                              View Code
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Load More Button for Infinite Scroll / Pagination */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-center bg-slate-50 dark:bg-slate-950/40">
                <button
                  onClick={() => setFromCount((prev) => prev + 50)}
                  disabled={isFetching}
                  className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 mx-auto"
                >
                  {isFetching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      Loading more submissions...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Load More Submissions (Showing {submissions.length})
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Solution Code Modal */}
      {activeModal && (
        <ViewSolutionModal
          contestId={activeModal.contestId}
          submissionId={activeModal.submissionId}
          problemName={activeModal.problemName}
          problemIndex={activeModal.problemIndex}
          handle={activeModal.handle}
          verdict={activeModal.verdict}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}

function roundKb(bytes: number) {
  if (!bytes) return 0;
  return Math.round(bytes / 1024);
}
