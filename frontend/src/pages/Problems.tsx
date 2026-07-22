import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import ViewSolutionModal from "../components/ViewSolutionModal";
import {
  Search, Star, CheckCircle, Circle, Tag, HelpCircle,
  Loader2, ArrowLeft, ChevronLeft, ChevronRight, FileCode, CheckCircle2, XCircle, User, X
} from "lucide-react";

interface Problem {
  contestId: number;
  index: string;
  name: string;
  type: string;
  rating?: number;
  tags: string[];
  solveCount?: number;
}

interface UserState {
  problem_id: string;
  contest_id: number;
  is_read: boolean;
  is_starred: boolean;
}

interface CFUserSubmission {
  problemId: string;
  contestId: number;
  index: string;
  submissionId: number;
  verdict: string;
  language: string;
  timeConsumedMillis: number;
  memoryConsumedBytes: number;
  creationTimeSeconds: number;
  passedTestCount: number;
}

const POPULAR_TAGS = [
  "implementation", "math", "greedy", "dp", "data structures",
  "brute force", "constructive algorithms", "graphs", "sortings",
  "binary search font", "trees", "strings",
  "number theory", "two pointers", "geometry"
];

export default function Problems() {
  const [searchParams] = useSearchParams();
  const contestIdParam = searchParams.get("contestId");
  const queryClient = useQueryClient();

  const [cfHandle, setCfHandle] = useState<string>(() => localStorage.getItem("cf_user_handle") || "");
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<string>("");
  const [maxRating, setMaxRating] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [activeSolutionModal, setActiveSolutionModal] = useState<{
    contestId: number;
    submissionId: number;
    problemName: string;
    problemIndex: string;
    verdict: string;
  } | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setCfHandle(localStorage.getItem("cf_user_handle") || "");
    };
    window.addEventListener("cf_handle_changed", handleUpdate);
    return () => window.removeEventListener("cf_handle_changed", handleUpdate);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedTags, minRating, maxRating, statusFilter, cfHandle]);

  // Record opened contest to localStorage history
  useEffect(() => {
    if (contestIdParam) {
      try {
        const cId = parseInt(contestIdParam);
        if (!isNaN(cId)) {
          const saved = localStorage.getItem("cf_contest_history");
          const list = saved ? JSON.parse(saved) : [];
          const filtered = list.filter((item: any) => item.id !== cId);
          const newItem = {
            id: cId,
            name: `Codeforces Contest #${cId}`,
            lastOpened: Date.now(),
          };
          const updated = [newItem, ...filtered].slice(0, 50);
          localStorage.setItem("cf_contest_history", JSON.stringify(updated));
        }
      } catch (err) {
        console.error("Failed to update contest history", err);
      }
    }
  }, [contestIdParam]);


  // Toggle multiple tags
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearTags = () => {
    setSelectedTags([]);
  };

  // Query user internal database state
  const { data: userStates = [] } = useQuery<UserState[]>({
    queryKey: ["userStates"],
    queryFn: async () => {
      const res = await api.get("/user/states");
      return res.data;
    }
  });

  // Query Codeforces submissions
  const { data: cfSubmissions = {}, isLoading: isCfLoading } = useQuery<Record<string, CFUserSubmission>>({
    queryKey: ["cfSubmissions", cfHandle],
    queryFn: async () => {
      if (!cfHandle.trim()) return {};
      const res = await api.get(`/user/cf-submissions/${cfHandle.trim()}`);
      return res.data;
    },
    enabled: Boolean(cfHandle.trim()),
  });

  // Query problems
  const { data: problems = [], isLoading: isProblemsLoading, error } = useQuery<Problem[]>({
    queryKey: ["problems", contestIdParam],
    queryFn: async () => {
      if (contestIdParam) {
        const res = await api.get(`/contest/${contestIdParam}/problems`);
        return res.data;
      } else {
        const res = await api.get("/problems");
        return res.data;
      }
    }
  });

  const toggleStateMutation = useMutation({
    mutationFn: async (payload: { problem_id: string; contest_id: number; is_read?: boolean; is_starred?: boolean }) => {
      const res = await api.post("/user/problem-state", payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<UserState[]>(["userStates"], (old = []) => {
        const exists = old.some((s) => s.problem_id === data.problem_id);
        if (exists) return old.map((s) => s.problem_id === data.problem_id ? data : s);
        return [...old, data];
      });
    }
  });

  const getProblemState = (contestId: number, index: string) => {
    const id = `${contestId}-${index}`;
    return userStates.find((s) => s.problem_id === id) || { is_read: false, is_starred: false };
  };

  const handleToggleStar = (e: React.MouseEvent, problem: Problem) => {
    e.preventDefault();
    e.stopPropagation();
    const state = getProblemState(problem.contestId, problem.index);
    toggleStateMutation.mutate({
      problem_id: `${problem.contestId}-${problem.index}`,
      contest_id: problem.contestId,
      is_starred: !state.is_starred
    });
  };

  const handleToggleRead = (e: React.MouseEvent, problem: Problem) => {
    e.preventDefault();
    e.stopPropagation();
    const state = getProblemState(problem.contestId, problem.index);
    toggleStateMutation.mutate({
      problem_id: `${problem.contestId}-${problem.index}`,
      contest_id: problem.contestId,
      is_read: !state.is_read
    });
  };

  // Filter problems logic
  const filteredProblems = problems.filter((prob) => {
    const pId = `${prob.contestId}-${prob.index}`;
    const state = getProblemState(prob.contestId, prob.index);
    const cfSub = cfSubmissions[pId];

    const matchesSearch =
      prob.name.toLowerCase().includes(search.toLowerCase()) ||
      pId.toLowerCase().includes(search.toLowerCase());

    // Multi-tag matching: problem matches if selectedTags is empty OR matches ANY of selected tags
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((st) => prob.tags.some((t) => t.toLowerCase() === st.toLowerCase()));

    const rating = prob.rating || 0;
    const matchesMinRating = minRating === "" || rating >= parseInt(minRating);
    const matchesMaxRating = maxRating === "" || (rating > 0 && rating <= parseInt(maxRating));
    
    let matchesStatus = true;
    if (statusFilter === "Solved") matchesStatus = cfSub?.verdict === "OK";
    else if (statusFilter === "Attempted") matchesStatus = Boolean(cfSub && cfSub.verdict !== "OK");
    else if (statusFilter === "Unsolved") matchesStatus = !cfSub || cfSub.verdict !== "OK";
    else if (statusFilter === "Read") matchesStatus = state.is_read;
    else if (statusFilter === "Unread") matchesStatus = !state.is_read;
    else if (statusFilter === "Starred") matchesStatus = state.is_starred;

    return matchesSearch && matchesTags && matchesMinRating && matchesMaxRating && matchesStatus;
  });

  const totalPages = Math.ceil(filteredProblems.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProblems = filteredProblems.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const isLoading = isProblemsLoading || (Boolean(cfHandle) && isCfLoading);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {contestIdParam && (
              <Link
                to="/contests"
                className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
            )}
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {contestIdParam ? `Contest #${contestIdParam} Problems` : "Problem Set"}
            </h1>
          </div>
          <p className="text-slate-700 dark:text-slate-400 text-sm mt-1 font-medium">
            {contestIdParam
              ? "Explore contest tasks, solve status, and accepted solutions"
              : "Search Codeforces problems with multi-tag filtering, solve tracking, and solution inspection"}
          </p>
        </div>

        {/* Handle Badge Info */}
        <div className="flex items-center gap-2">
          {cfHandle ? (
            <div className="px-3.5 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-slate-800 dark:text-slate-300 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Tracking handle: <strong className="text-slate-900 dark:text-white font-mono">{cfHandle}</strong></span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Add CF Handle in top header to track your solves & solutions!</span>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="glass p-5 rounded-xl space-y-4 border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by problem name or ID (e.g. 2247-A)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all text-sm font-medium"
          />
        </div>

        {/* Multi-Tag & Category Selection Bar */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Filter by Tags / Categories (Select Multiple):
            </span>

            {selectedTags.length > 0 && (
              <button
                onClick={clearTags}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Clear Selected Tags ({selectedTags.length})
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
            {POPULAR_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {tag} {isSelected && "✓"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rating Range & Status Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap">Min Rating:</span>
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">Any Min</option>
              {Array.from({ length: 28 }, (_, i) => 800 + i * 100).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap">Max Rating:</span>
            <select
              value={maxRating}
              onChange={(e) => setMaxRating(e.target.value)}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">Any Max</option>
              {Array.from({ length: 28 }, (_, i) => 800 + i * 100).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="All">All Problems</option>
              <option value="Solved">🟢 Solved ({cfHandle || "CF"})</option>
              <option value="Attempted">🟡 Attempted ({cfHandle || "CF"})</option>
              <option value="Unsolved">⚪ Unsolved</option>
              <option value="Starred">⭐ Starred</option>
              <option value="Read">✔ Marked Read</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Fetching problems & solve history...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass p-6 text-center py-12 rounded-xl border border-slate-200 dark:border-slate-800">
          <HelpCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Failed to load problem set</h3>
          <p className="text-slate-500 text-sm mt-1">There was an error communicating with Codeforces API. Please retry.</p>
        </div>
      )}

      {/* Problems list */}
      {!isLoading && !error && (
        <>
          {filteredProblems.length === 0 ? (
            <div className="glass p-12 text-center rounded-xl border border-slate-200 dark:border-slate-800">
              <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No problems found</h3>
              <p className="text-slate-500 text-sm mt-1">No tasks matched your active search or tag filter settings.</p>
            </div>
          ) : (
            <div className="glass rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-slate-800 dark:text-slate-300">
                  <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-4 px-4 w-12 text-center">Star</th>
                      <th className="py-4 px-3 w-12 text-center">Read</th>
                      <th className="py-4 px-4 w-32">CF Solve</th>
                      <th className="py-4 px-4 w-28">ID</th>
                      <th className="py-4 px-4">Name</th>
                      <th className="py-4 px-4 w-24">Rating</th>
                      <th className="py-4 px-4">Tags</th>
                      <th className="py-4 px-4 w-32 text-right">My Solution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {currentProblems.map((problem) => {
                      const state = getProblemState(problem.contestId, problem.index);
                      const problemId = `${problem.contestId}-${problem.index}`;
                      const cfSub = cfSubmissions[problemId];
                      const isSolved = cfSub?.verdict === "OK";
                      const isAttempted = Boolean(cfSub && !isSolved);

                      return (
                        <tr key={problemId} className="hover:bg-blue-50/60 dark:hover:bg-blue-950/20 transition-colors group">
                          {/* Star Toggle */}
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={(e) => handleToggleStar(e, problem)}
                              className="focus:outline-none text-slate-400 hover:text-amber-400 transition-colors"
                            >
                              <Star className={`w-4 h-4 ${state.is_starred ? "fill-amber-400 text-amber-400" : ""}`} />
                            </button>
                          </td>

                          {/* Read Toggle */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={(e) => handleToggleRead(e, problem)}
                              className="focus:outline-none text-slate-400 hover:text-emerald-500 transition-colors"
                            >
                              {state.is_read ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* CF Solve Status Badge */}
                          <td className="py-3 px-4">
                            {isSolved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold font-mono">
                                <CheckCircle2 className="w-3 h-3" /> Solved
                              </span>
                            ) : isAttempted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-bold font-mono">
                                <XCircle className="w-3 h-3" /> Tried
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs font-mono">-</span>
                            )}
                          </td>

                          {/* ID */}
                          <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{problemId}</td>

                          {/* Name / Link */}
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            <Link to={`/contest/${problem.contestId}/problem/${problem.index}`} className="block py-1">
                              {problem.name}
                            </Link>
                          </td>

                          {/* Rating */}
                          <td className="py-3 px-4">
                            {problem.rating ? (
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                problem.rating >= 2400 ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                : problem.rating >= 1900 ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                : problem.rating >= 1600 ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                : problem.rating >= 1200 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20"
                              }`}>
                                {problem.rating}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>

                          {/* Tags */}
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1.5 max-w-md">
                              {problem.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-800 text-[10px] whitespace-nowrap font-medium">
                                  {tag}
                                </span>
                              ))}
                              {problem.tags.length > 3 && (
                                <span className="text-[10px] text-slate-500 font-medium px-1">+{problem.tags.length - 3}</span>
                              )}
                            </div>
                          </td>

                          {/* My Solution Button */}
                          <td className="py-3 px-4 text-right">
                            {cfSub ? (
                              <button
                                onClick={() =>
                                  setActiveSolutionModal({
                                    contestId: problem.contestId,
                                    submissionId: cfSub.submissionId,
                                    problemName: problem.name,
                                    problemIndex: problem.index,
                                    verdict: cfSub.verdict,
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white dark:text-blue-400 border border-blue-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all ml-auto"
                              >
                                <FileCode className="w-3.5 h-3.5" />
                                Solution
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                Showing <span className="font-bold text-slate-900 dark:text-slate-200">{indexOfFirstItem + 1}</span> to{" "}
                <span className="font-bold text-slate-900 dark:text-slate-200">{Math.min(indexOfLastItem, filteredProblems.length)}</span>{" "}
                of <span className="font-bold text-slate-900 dark:text-slate-200">{filteredProblems.length}</span> problems
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 disabled:opacity-40 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-300 font-mono px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 disabled:opacity-40 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Solution Modal Viewer */}
      {activeSolutionModal && (
        <ViewSolutionModal
          contestId={activeSolutionModal.contestId}
          submissionId={activeSolutionModal.submissionId}
          problemName={activeSolutionModal.problemName}
          problemIndex={activeSolutionModal.problemIndex}
          handle={cfHandle}
          verdict={activeSolutionModal.verdict}
          onClose={() => setActiveSolutionModal(null)}
        />
      )}
    </div>
  );
}
