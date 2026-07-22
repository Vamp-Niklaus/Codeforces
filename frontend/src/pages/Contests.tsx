import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import {
  Search, Calendar, Clock, Trophy, ChevronLeft, ChevronRight,
  Loader2, Award, ExternalLink, Zap, Radio, Star, History, Bookmark
} from "lucide-react";

interface Contest {
  id: number;
  name: string;
  type: string;
  phase: string;
  frozen: boolean;
  durationSeconds: number;
  startTimeSeconds: number;
  relativeTimeSeconds: number;
}

import { useUserHistory } from "../hooks/useUserHistory";

export default function Contests() {
  const [activePhaseTab, setActivePhaseTab] = useState<"FINISHED" | "BEFORE" | "CODING">("FINISHED");
  const [mainSection, setMainSection] = useState<"ALL" | "HISTORY" | "BOOKMARKS">("ALL");
  const [search, setSearch] = useState("");
  const [selectedDiv, setSelectedDiv] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const { contestHistory: history, recordContestView, clearHistory } = useUserHistory();

  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("cf_bookmarked_contests");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Toggle Bookmark
  const toggleBookmark = (e: React.MouseEvent, contestId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setBookmarks((prev) => {
      const exists = prev.includes(contestId);
      const updated = exists ? prev.filter((id) => id !== contestId) : [...prev, contestId];
      localStorage.setItem("cf_bookmarked_contests", JSON.stringify(updated));
      return updated;
    });
  };

  // React Query to fetch contest list
  const { data: contests = [], isLoading, error } = useQuery<Contest[]>({
    queryKey: ["contests", activePhaseTab],
    queryFn: async () => {
      const res = await api.get(`/contests?phase=${activePhaseTab}`);
      return res.data;
    },
  });

  // Format helpers
  const formatDuration = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (hours === 0) return `${mins} mins`;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hrs`;
  };

  const formatDate = (secs: number) => {
    if (!secs) return "TBD";
    return new Date(secs * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatHistoryDate = (ms: number) => {
    return new Date(ms).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCountdown = (startTimeSecs: number) => {
    const diff = startTimeSecs - Math.floor(Date.now() / 1000);
    if (diff <= 0) return "Starting now";
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    if (days > 0) return `in ${days}d ${hours}h`;
    if (hours > 0) return `in ${hours}h ${mins}m`;
    return `in ${mins} mins`;
  };

  const getDivStyle = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("div. 1")) {
      return { text: "Div 1", bg: "bg-red-500/10 text-red-500 border-red-500/20" };
    } else if (lower.includes("div. 2")) {
      return { text: "Div 2", bg: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
    } else if (lower.includes("div. 3")) {
      return { text: "Div 3", bg: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
    } else if (lower.includes("div. 4")) {
      return { text: "Div 4", bg: "bg-teal-500/10 text-teal-500 border-teal-500/20" };
    } else if (lower.includes("educational")) {
      return { text: "Edu", bg: "bg-purple-500/10 text-purple-500 border-purple-500/20" };
    }
    return { text: "Other", bg: "bg-slate-500/10 text-slate-500 border-slate-500/20" };
  };

  // Filtered contests logic
  const filteredContests = contests.filter((c) => {
    if (mainSection === "BOOKMARKS" && !bookmarks.includes(c.id)) return false;
    
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toString().includes(search);

    if (selectedDiv === "All") return matchesSearch;
    if (selectedDiv === "Div 1") return matchesSearch && c.name.toLowerCase().includes("div. 1");
    if (selectedDiv === "Div 2") return matchesSearch && c.name.toLowerCase().includes("div. 2");
    if (selectedDiv === "Div 3") return matchesSearch && c.name.toLowerCase().includes("div. 3");
    if (selectedDiv === "Div 4") return matchesSearch && c.name.toLowerCase().includes("div. 4");
    if (selectedDiv === "Educational")
      return matchesSearch && c.name.toLowerCase().includes("educational");

    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredContests.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentContests = filteredContests.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header & Main Section Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Codeforces Contests
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Browse upcoming contests, live matches, recently viewed history, and favorites
          </p>
        </div>

        {/* Top-Level Section Switcher (All / History / Bookmarks) */}
        <div className="flex bg-slate-200 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-300 dark:border-slate-800">
          <button
            onClick={() => setMainSection("ALL")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              mainSection === "ALL"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            All Contests
          </button>

          <button
            onClick={() => setMainSection("HISTORY")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              mainSection === "HISTORY"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Recent History ({history.length})
          </button>

          <button
            onClick={() => setMainSection("BOOKMARKS")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              mainSection === "BOOKMARKS"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            Bookmarked ({bookmarks.length})
          </button>
        </div>
      </div>

      {/* RECENT HISTORY VIEW */}
      {mainSection === "HISTORY" && (
        <div className="glass p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              Recently Viewed Contests History
            </h2>
            <button
              onClick={() => {
                clearHistory("CONTEST");
              }}
              className="text-xs text-rose-500 hover:underline font-semibold"
            >
              Clear History
            </button>
          </div>

          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">No recent contest history recorded yet.</p>
              <p className="text-xs mt-1">Open any contest problem set to automatically build your view history.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item: any) => (
                <div
                  key={item.id}
                  className="glass-card p-4 rounded-xl border flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono mb-2">
                      <span>Contest #{item.id}</span>
                      <span className="text-[11px]">{formatHistoryDate(item.lastOpened)}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">
                      {item.name}
                    </h3>
                  </div>
                  <Link
                    to={`/problems?contestId=${item.id}`}
                    onClick={() => recordContestView(item)}
                    className="mt-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow"
                  >
                    Resume Problem Set
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ALL CONTESTS & BOOKMARKS VIEW */}
      {mainSection !== "HISTORY" && (
        <>
          {/* Phase Filter Tabs & Search Toolbar */}
          <div className="glass p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
            {/* Search Input */}
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search contest by name or ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all text-sm"
              />
            </div>

            {/* Division Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {["All", "Div 1", "Div 2", "Div 3", "Div 4", "Educational"].map((div) => (
                <button
                  key={div}
                  onClick={() => {
                    setSelectedDiv(div);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md border text-xs font-semibold transition-all ${
                    selectedDiv === div
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>

            {/* Phase Sub-Tabs: Upcoming / Live / Finished */}
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  setActivePhaseTab("BEFORE");
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
                  activePhaseTab === "BEFORE"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Upcoming
              </button>

              <button
                onClick={() => {
                  setActivePhaseTab("CODING");
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
                  activePhaseTab === "CODING"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Radio className="w-3.5 h-3.5 animate-pulse text-amber-300" />
                Live Now
              </button>

              <button
                onClick={() => {
                  setActivePhaseTab("FINISHED");
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
                  activePhaseTab === "FINISHED"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                Finished
              </button>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Fetching contests from Codeforces...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="glass p-6 rounded-xl border-red-500/10 text-center py-12 space-y-3">
              <Award className="w-12 h-12 text-red-500 mx-auto" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Failed to load contests</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                We had trouble retrieving contests from Codeforces. Check your connection or retry.
              </p>
            </div>
          )}

          {/* Contests Grid */}
          {!isLoading && !error && (
            <>
              {currentContests.length === 0 ? (
                <div className="glass p-12 text-center rounded-xl">
                  <Trophy className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No contests found</h3>
                  <p className="text-slate-500 text-sm mt-1">Try adjusting your search query or filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {currentContests.map((contest) => {
                    const divTag = getDivStyle(contest.name);
                    const isUpcoming = activePhaseTab === "BEFORE";
                    const isLive = activePhaseTab === "CODING";
                    const isBookmarked = bookmarks.includes(contest.id);

                    return (
                      <div
                        key={contest.id}
                        className="glass-card p-5 rounded-xl flex flex-col justify-between hover:shadow-lg transition-all border group"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${divTag.bg}`}>
                              {divTag.text}
                            </span>

                            <div className="flex items-center gap-2">
                              {/* Bookmark Star Toggle */}
                              <button
                                onClick={(e) => toggleBookmark(e, contest.id)}
                                className="focus:outline-none p-1 text-slate-400 hover:text-amber-400 transition-colors"
                                title={isBookmarked ? "Remove Bookmark" : "Bookmark Contest"}
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    isBookmarked ? "fill-amber-400 text-amber-400" : ""
                                  }`}
                                />
                              </button>

                              {isUpcoming ? (
                                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-bold font-mono">
                                  {getCountdown(contest.startTimeSeconds)}
                                </span>
                              ) : isLive ? (
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold font-mono animate-pulse">
                                  ● LIVE NOW
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-500 font-mono font-medium">
                                  #{contest.id}
                                </span>
                              )}
                            </div>
                          </div>

                          <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-2 text-base leading-tight">
                            {contest.name}
                          </h3>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {formatDate(contest.startTimeSeconds)}
                            </span>
                            <span className="flex items-center gap-1.5 font-mono">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {formatDuration(contest.durationSeconds)}
                            </span>
                          </div>

                          {isUpcoming || isLive ? (
                            <a
                              href={`https://codeforces.com/contest/${contest.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-500/30 rounded-lg flex items-center justify-center gap-2 transition-all text-xs font-semibold"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              {isLive ? "Enter Contest on Codeforces" : "View on Codeforces"}
                            </a>
                          ) : (
                            <Link
                              to={`/problems?contestId=${contest.id}`}
                              onClick={() => recordContestView(contest)}
                              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2 transition-all text-xs font-semibold shadow"
                            >
                              <Trophy className="w-3.5 h-3.5" />
                              Explore Problems
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-500">
                    Showing <span className="font-medium text-slate-900 dark:text-slate-200">{indexOfFirstItem + 1}</span> to{" "}
                    <span className="font-medium text-slate-900 dark:text-slate-200">
                      {Math.min(indexOfLastItem, filteredContests.length)}
                    </span>{" "}
                    of <span className="font-medium text-slate-900 dark:text-slate-200">{filteredContests.length}</span> contests
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 disabled:opacity-40 transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono px-3">
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
        </>
      )}
    </div>
  );
}
