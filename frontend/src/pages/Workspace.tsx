import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Editor from "@monaco-editor/react";
import { api } from "../lib/api";
import { useUserHistory } from "../hooks/useUserHistory";
import { useTheme } from "../context/ThemeContext";
import { 
  ArrowLeft, Star, CheckCircle, Circle, Copy, Check, 
  ZoomIn, ZoomOut, Loader2, AlertCircle, Search, Filter,
  ExternalLink, Columns, PanelLeft, PanelRight, Layers,
  Code2, FileCode
} from "lucide-react";

interface Solution {
  submission_id: number;
  author: string;
  lang_name: string;
  time_ms: number;
  memory_kb: number;
  creation_time?: number;
  code: string;
  codeforces_url?: string;
}

interface SolutionsResponse {
  cpp: Solution[];
  python: Solution[];
  java: Solution[];
}

interface UserState {
  problem_id: string;
  contest_id: number;
  is_read: boolean;
  is_starred: boolean;
}

export default function Workspace() {
  const { contestId, index } = useParams<{ contestId: string; index: string }>();
  const queryClient = useQueryClient();
  const { theme } = useTheme();

  // Layout states: "split" | "left-only" | "right-only"
  const [layoutMode, setLayoutMode] = useState<"split" | "left-only" | "right-only">("split");
  const [activeTab, setActiveTab] = useState<"CODE" | "SUBMISSIONS">("CODE");
  const [leftWidthPercent, setLeftWidthPercent] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Submissions search & star filter states
  const [handleSearch, setHandleSearch] = useState<string>("");
  const [submissionsLangFilter, setSubmissionsLangFilter] = useState<string>("ALL");
  const [showStarredOnly, setShowStarredOnly] = useState<boolean>(false);

  // Starred solutions in localStorage (submission_ids)
  const [starredSolutions, setStarredSolutions] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("cf_starred_solutions");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleStarSolution = (subId: number) => {
    setStarredSolutions((prev) => {
      const updated = prev.includes(subId)
        ? prev.filter((id) => id !== subId)
        : [...prev, subId];
      localStorage.setItem("cf_starred_solutions", JSON.stringify(updated));
      return updated;
    });
  };

  // Workspace settings states
  const [selectedLang, setSelectedLang] = useState<"cpp" | "python" | "java">("cpp");
  const [selectedSolutionIndex, setSelectedSolutionIndex] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(14);
  const [showMinimap, setShowMinimap] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const problemId = `${contestId}-${index}`;
  const cfProblemUrl = `https://codeforces.com/contest/${contestId}/problem/${index}`;

  const { recordProblemView } = useUserHistory();

  // Record opened problem to history
  useEffect(() => {
    if (contestId && index) {
      recordProblemView({
        problemId: `${contestId}-${index}`,
        contestId: parseInt(contestId),
        index: index,
        name: `Problem ${contestId}-${index}` // Ideally we'd pass actual problem name if available, but keeping existing behavior
      });
    }
  }, [contestId, index]);


  // Query: Fetch problem statement HTML
  const { data: statementData, isLoading: isStatementLoading, error: statementError } = useQuery<{ html: string }>({
    queryKey: ["problemStatement", contestId, index],
    queryFn: async () => {
      const res = await api.get(`/contest/${contestId}/problem/${index}/statement`);
      return res.data;
    },
    enabled: Boolean(contestId && index),
  });

  // Re-run MathJax typesetting for LaTeX formulas whenever problem statement updates
  useEffect(() => {
    if (statementData?.html) {
      setTimeout(() => {
        const anyWin = window as any;
        if (anyWin.MathJax && anyWin.MathJax.typesetPromise) {
          anyWin.MathJax.typesetPromise().catch(() => {});
        }
      }, 150);
    }
  }, [statementData]);


  // Query: Fetch problem solutions
  const { data: solutions = { cpp: [], python: [], java: [] }, isLoading: isSolutionsLoading } = useQuery<SolutionsResponse>({
    queryKey: ["problemSolutions", contestId, index],
    queryFn: async () => {
      const res = await api.get(`/problem/${contestId}/${index}/solutions`);
      return res.data;
    },
    enabled: Boolean(contestId && index),
  });

  // Combine all solutions into a single flat list for the Submissions tab
  const allSubmissionsList: Solution[] = React.useMemo(() => {
    const list: Solution[] = [];
    if (solutions.cpp) list.push(...solutions.cpp);
    if (solutions.python) list.push(...solutions.python);
    if (solutions.java) list.push(...solutions.java);
    return list;
  }, [solutions]);

  // Filtered submissions for the Submissions tab
  const filteredSubmissions = React.useMemo(() => {
    return allSubmissionsList.filter((s) => {
      if (showStarredOnly && !starredSolutions.includes(s.submission_id)) return false;
      if (handleSearch.trim() && !s.author.toLowerCase().includes(handleSearch.trim().toLowerCase())) return false;
      if (submissionsLangFilter === "CPP" && !s.lang_name.toLowerCase().includes("c++")) return false;
      if (submissionsLangFilter === "PYTHON" && !s.lang_name.toLowerCase().includes("python") && !s.lang_name.toLowerCase().includes("pypy")) return false;
      if (submissionsLangFilter === "JAVA" && !s.lang_name.toLowerCase().includes("java")) return false;
      return true;
    });
  }, [allSubmissionsList, handleSearch, submissionsLangFilter, showStarredOnly, starredSolutions]);

  // Query: Fetch User Problem States (Read/Starred)
  const { data: userStates = [] } = useQuery<UserState[]>({
    queryKey: ["userStates"],
    queryFn: async () => {
      try {
        const res = await api.get("/user/states");
        return res.data;
      } catch {
        return [];
      }
    }
  });

  // Mutation: Update User State (Read/Starred)
  const toggleStateMutation = useMutation({
    mutationFn: async (payload: { problem_id: string; contest_id: number; is_read?: boolean; is_starred?: boolean }) => {
      const res = await api.post("/user/problem-state", payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<UserState[]>(["userStates"], (old = []) => {
        const exists = old.some((s) => s.problem_id === data.problem_id);
        if (exists) {
          return old.map((s) => (s.problem_id === data.problem_id ? data : s));
        } else {
          return [...old, data];
        }
      });
    }
  });

  // Get active state for this problem
  const activeState = userStates.find((s) => s.problem_id === problemId) || { is_read: false, is_starred: false };

  const handleToggleStar = () => {
    if (!contestId) return;
    toggleStateMutation.mutate({
      problem_id: problemId,
      contest_id: parseInt(contestId),
      is_starred: !activeState.is_starred
    });
  };

  const handleToggleRead = () => {
    if (!contestId) return;
    toggleStateMutation.mutate({
      problem_id: problemId,
      contest_id: parseInt(contestId),
      is_read: !activeState.is_read
    });
  };

  // Drag Resizing Logic for Split View
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const percentage = (relativeX / rect.width) * 100;
      setLeftWidthPercent(Math.min(Math.max(percentage, 20), 80));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Reset selected solution index when language changes
  useEffect(() => {
    setSelectedSolutionIndex(0);
  }, [selectedLang]);

  const activeSolutionsList = solutions[selectedLang] || [];
  const activeSolution = activeSolutionsList[selectedSolutionIndex];

  const handleCopyCode = () => {
    if (!activeSolution?.code) return;
    navigator.clipboard.writeText(activeSolution.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-3 font-sans">
      {/* Workspace Sub-Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-4">
          <Link
            to="/problems"
            className="p-2 rounded-xl bg-slate-200 dark:bg-slate-900 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 transition-all text-xs font-bold flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Problems</span>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-mono">
                  {problemId}
                </span>
              </h1>

              {activeState.is_starred && (
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              )}
            </div>
          </div>
        </div>

        {/* Layout Mode Toggles & Submissions Tab Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800">
            <button
              onClick={() => setActiveTab("CODE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === "CODE"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Editor & Solutions</span>
            </button>

            <button
              onClick={() => setActiveTab("SUBMISSIONS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === "SUBMISSIONS"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Accepted Runs ({allSubmissionsList.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800">
            <button
              onClick={() => setLayoutMode("split")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                layoutMode === "split"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
              title="Split View"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Split</span>
            </button>

            <button
              onClick={() => setLayoutMode("left-only")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                layoutMode === "left-only"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
              title="Maximize Problem Statement"
            >
              <PanelLeft className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Problem Only</span>
            </button>

            <button
              onClick={() => setLayoutMode("right-only")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                layoutMode === "right-only"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
              title="Maximize Solution Panel"
            >
              <PanelRight className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Panel Only</span>
            </button>
          </div>
        </div>

        {/* User state action bar */}
        <div className="flex items-center gap-2">
          {/* Read status toggle */}
          <button
            onClick={handleToggleRead}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeState.is_read
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-slate-200 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {activeState.is_read ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                Read
              </>
            ) : (
              <>
                <Circle className="w-3.5 h-3.5" />
                Mark Read
              </>
            )}
          </button>

          {/* Star toggle */}
          <button
            onClick={handleToggleStar}
            className={`p-1.5 rounded-lg border transition-all ${
              activeState.is_starred
                ? "bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400"
                : "bg-slate-200 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
            title={activeState.is_starred ? "Starred" : "Star problem"}
          >
            <Star className={`w-4 h-4 ${activeState.is_starred ? "fill-amber-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Workspace Main Resizable Split View Container */}
      <div
        ref={containerRef}
        className="flex-1 flex overflow-hidden relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
      >
        {/* Left Pane: Problem Statement */}
        {(layoutMode === "split" || layoutMode === "left-only") && (
          <div
            style={{
              width: layoutMode === "left-only" ? "100%" : `${leftWidthPercent}%`,
            }}
            className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800"
          >
            {/* Header */}
            <div className="bg-slate-100 dark:bg-slate-950 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Problem Statement
              </span>

              <div className="flex items-center gap-2">
                <a
                  href={cfProblemUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open on Codeforces
                </a>
              </div>
            </div>

            {/* Problem Statement Body */}
            <div className="flex-1 overflow-y-auto p-6 select-text">
              {isStatementLoading && (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-sm font-medium">Scraping problem statement from Codeforces...</p>
                </div>
              )}

              {(statementError || statementData?.html?.includes("403 Forbidden")) && (
                <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-4 my-auto">
                  <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Codeforces Statement Link</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1">
                      View the complete problem statement directly on official Codeforces page.
                    </p>
                  </div>
                  <a
                    href={cfProblemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Statement on Codeforces
                  </a>
                </div>
              )}

              {!isStatementLoading && !statementError && statementData && !statementData.html.includes("403 Forbidden") && (
                <div 
                  className="problem-statement-container text-slate-900 dark:text-slate-200"
                  dangerouslySetInnerHTML={{ __html: statementData.html }} 
                />
              )}
            </div>
          </div>
        )}

        {/* Drag Resize Handle (only in split mode) */}
        {layoutMode === "split" && (
          <div
            onMouseDown={handleMouseDown}
            className="w-2 bg-slate-200 dark:bg-slate-950 hover:bg-blue-600 cursor-col-resize flex items-center justify-center border-x border-slate-300 dark:border-slate-800 transition-colors z-20 group"
            title="Drag to resize panels"
          >
            <div className="w-0.5 h-8 bg-slate-400 dark:bg-slate-700 group-hover:bg-white rounded-full" />
          </div>
        )}

        {/* Right Pane: Solution & Monaco Code Viewer OR Submissions Tab */}
        {(layoutMode === "split" || layoutMode === "right-only") && (
          <div
            style={{
              width: layoutMode === "right-only" ? "100%" : `${100 - leftWidthPercent}%`,
            }}
            className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900"
          >
            {activeTab === "SUBMISSIONS" ? (
              /* TAB 2: ACCEPTED SUBMISSIONS TABLE & STARRED SOLUTIONS */
              <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
                {/* Search & Filter Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
                    {/* Handle Search */}
                    <div className="relative flex-1 min-w-[160px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search by handle (e.g. tourist)..."
                        value={handleSearch}
                        onChange={(e) => setHandleSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Language Filter */}
                    <select
                      value={submissionsLangFilter}
                      onChange={(e) => setSubmissionsLangFilter(e.target.value)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Languages ({allSubmissionsList.length})</option>
                      <option value="CPP">C++ ({solutions.cpp?.length || 0})</option>
                      <option value="PYTHON">Python ({solutions.python?.length || 0})</option>
                      <option value="JAVA">Java ({solutions.java?.length || 0})</option>
                    </select>
                  </div>

                  {/* Starred Only Toggle */}
                  <button
                    onClick={() => setShowStarredOnly((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
                      showStarredOnly
                        ? "bg-amber-500 text-white border-amber-600 shadow-md"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:text-amber-500"
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${showStarredOnly ? "fill-white" : ""}`} />
                    <span>Starred Only ({starredSolutions.length})</span>
                  </button>
                </div>

                {/* Submissions Table */}
                <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  {isSolutionsLoading ? (
                    <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <p className="text-xs font-semibold">Loading accepted submissions from Codeforces...</p>
                    </div>
                  ) : filteredSubmissions.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">
                      <Filter className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No submissions match your filter</h4>
                      <p className="text-xs text-slate-500 mt-1">Try clearing handle search or language filters.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                          <th className="py-2.5 px-3">⭐</th>
                          <th className="py-2.5 px-3 font-mono">Submission ID</th>
                          <th className="py-2.5 px-3">Author</th>
                          <th className="py-2.5 px-3">Language</th>
                          <th className="py-2.5 px-3 font-mono">Time</th>
                          <th className="py-2.5 px-3 font-mono">Memory</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                        {filteredSubmissions.map((sol) => {
                          const isStarred = starredSolutions.includes(sol.submission_id);
                          return (
                            <tr
                              key={sol.submission_id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors group"
                            >
                              <td className="py-2.5 px-3">
                                <button
                                  onClick={() => toggleStarSolution(sol.submission_id)}
                                  className="text-slate-400 hover:text-amber-500 transition-colors"
                                  title={isStarred ? "Unstar solution" : "Star solution"}
                                >
                                  <Star className={`w-4 h-4 ${isStarred ? "fill-amber-400 text-amber-400" : ""}`} />
                                </button>
                              </td>

                              <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                                #{sol.submission_id}
                              </td>

                              <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white font-mono">
                                {sol.author}
                              </td>

                              <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                                <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[11px]">
                                  {sol.lang_name}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                                {sol.time_ms} ms
                              </td>

                              <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                                {sol.memory_kb} KB
                              </td>

                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      const langKey = sol.lang_name.toLowerCase().includes("c++")
                                        ? "cpp"
                                        : sol.lang_name.toLowerCase().includes("python")
                                        ? "python"
                                        : "java";
                                      setSelectedLang(langKey);
                                      const list = solutions[langKey] || [];
                                      const foundIdx = list.findIndex((item) => item.submission_id === sol.submission_id);
                                      if (foundIdx !== -1) setSelectedSolutionIndex(foundIdx);
                                      setActiveTab("CODE");
                                    }}
                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold text-[11px] transition-all shadow"
                                  >
                                    Inspect Code
                                  </button>

                                  <a
                                    href={sol.codeforces_url || `https://codeforces.com/contest/${contestId}/submission/${sol.submission_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all"
                                    title="Open solution directly on Codeforces"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              /* TAB 1: CODE EDITOR & SOLUTIONS VIEW */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="bg-slate-100 dark:bg-slate-950 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  {/* Language & Solution selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider hidden xl:inline">
                      Language:
                    </span>
                    
                    {/* Language Dropdown */}
                    <select
                      value={selectedLang}
                      onChange={(e) => setSelectedLang(e.target.value as any)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200 px-3 py-1.5 focus:outline-none focus:border-blue-500 text-xs font-semibold cursor-pointer"
                    >
                      <option value="cpp">C++ Solutions ({solutions.cpp?.length || 0})</option>
                      <option value="python">Python Solutions ({solutions.python?.length || 0})</option>
                      <option value="java">Java Solutions ({solutions.java?.length || 0})</option>
                    </select>

                    {/* Submissions pills for active language */}
                    {activeSolutionsList.length > 0 && (
                      <div className="flex bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-300 dark:border-slate-800 overflow-x-auto max-w-[280px]">
                        {activeSolutionsList.slice(0, 10).map((sol, idx) => (
                          <button
                            key={sol.submission_id}
                            onClick={() => setSelectedSolutionIndex(idx)}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all shrink-0 ${
                              selectedSolutionIndex === idx
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                            }`}
                          >
                            #{sol.submission_id}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Monaco Controls */}
                  <div className="flex items-center gap-2">
                    {/* External link to Codeforces submission */}
                    {activeSolution && (
                      <a
                        href={activeSolution.codeforces_url || `https://codeforces.com/contest/${contestId}/submission/${activeSolution.submission_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-all text-xs flex items-center gap-1.5"
                        title="Open solution on Codeforces"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">CF Submission</span>
                      </a>
                    )}

                    {/* Copy button */}
                    {activeSolution && (
                      <button
                        onClick={handleCopyCode}
                        className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5 text-xs font-semibold"
                        title="Copy code to clipboard"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Font adjustments */}
                    <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 overflow-hidden">
                      <button
                        onClick={() => setFontSize(Math.max(10, fontSize - 2))}
                        className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all"
                        title="Decrease font size"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 px-1">
                        {fontSize}px
                      </span>
                      <button
                        onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                        className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all"
                        title="Increase font size"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Minimap toggle button */}
                    <button
                      onClick={() => setShowMinimap((prev) => !prev)}
                      className={`px-2 py-1 rounded-lg border text-xs font-semibold transition-all ${
                        showMinimap
                          ? "bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white"
                      }`}
                      title={showMinimap ? "Disable Minimap" : "Enable Minimap"}
                    >
                      Minimap
                    </button>
                  </div>
                </div>

                {/* Monaco Viewer Area */}
                <div className="flex-1 overflow-hidden relative">
                  {isSolutionsLoading && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3 text-slate-500">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <p className="text-sm font-medium">Fetching community accepted solutions from Codeforces...</p>
                    </div>
                  )}

                  {!isSolutionsLoading && activeSolutionsList.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-3">
                      <Code2 className="w-12 h-12 text-slate-400 animate-pulse mx-auto" />
                      <h3 className="font-semibold text-slate-800 dark:text-slate-300 text-sm">No solutions available</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                        No public accepted {selectedLang.toUpperCase()} submissions found for this problem. Try switching languages or view directly on Codeforces.
                      </p>
                      <a
                        href={`https://codeforces.com/contest/${contestId}/status`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                      >
                        Explore Contest Status on Codeforces <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {!isSolutionsLoading && activeSolution && (
                    <div className="w-full h-full flex flex-col">
                      {/* Submission metadata header */}
                      <div className="bg-slate-100 dark:bg-slate-950 px-5 py-2 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-3 shrink-0">
                        <span className="flex items-center gap-1.5">
                          Author: <strong className="text-slate-900 dark:text-white font-mono">{activeSolution.author}</strong>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold font-mono ml-2">
                            ACCEPTED
                          </span>
                        </span>

                        <div className="flex items-center gap-4 font-mono text-[11px]">
                          <span>Lang: <strong className="text-slate-800 dark:text-slate-300">{activeSolution.lang_name}</strong></span>
                          <span>Time: <strong className="text-slate-800 dark:text-slate-300">{activeSolution.time_ms} ms</strong></span>
                          <span>Memory: <strong className="text-slate-800 dark:text-slate-300">{activeSolution.memory_kb} KB</strong></span>
                        </div>
                      </div>

                      {/* Monaco Editor Component */}
                      <div className="flex-1">
                        <Editor
                          height="100%"
                          language={selectedLang === "cpp" ? "cpp" : selectedLang === "python" ? "python" : "java"}
                          theme={theme === "dark" ? "vs-dark" : "light"}
                          value={activeSolution.code}
                          options={{
                            readOnly: true,
                            domReadOnly: true,
                            fontSize: fontSize,
                            minimap: { enabled: showMinimap },
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            lineNumbers: "on",
                            padding: { top: 12, bottom: 12 },
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
