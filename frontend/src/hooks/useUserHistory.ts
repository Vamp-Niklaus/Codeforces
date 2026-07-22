import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";

export interface ProblemHistoryItem {
  problemId: string;
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  lastOpened: number;
}

export interface ContestHistoryItem {
  id: number;
  name: string;
  lastOpened: number;
}

export function useUserHistory() {
  const queryClient = useQueryClient();

  const { data: history = { problemHistory: [], contestHistory: [] }, isLoading } = useQuery({
    queryKey: ["user_history"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Fallback to localStorage if not logged in
      if (!session) {
        const localProblems = JSON.parse(localStorage.getItem("cf_problem_history") || "[]");
        const localContests = JSON.parse(localStorage.getItem("cf_contest_history") || "[]");
        return { problemHistory: localProblems, contestHistory: localContests };
      }

      // Logged in: Fetch from DB
      const res = await api.get("/user/history");
      
      const problemHistory = res.data
        .filter((h: any) => h.item_type === "PROBLEM")
        .map((h: any) => {
          let name = h.title;
          let index = h.item_id.split("-").pop() || "";
          let rating = undefined;
          try {
            const parsed = JSON.parse(h.title);
            name = parsed.name;
            index = parsed.index;
            rating = parsed.rating;
          } catch (e) {}
          return {
            problemId: h.item_id,
            contestId: h.contest_id,
            index,
            name,
            rating,
            lastOpened: new Date(h.updated_at).getTime(),
          };
        });

      const contestHistory = res.data
        .filter((h: any) => h.item_type === "CONTEST")
        .map((h: any) => ({
          id: parseInt(h.item_id),
          name: h.title,
          lastOpened: new Date(h.updated_at).getTime(),
        }));

      return { problemHistory, contestHistory };
    },
  });

  const recordProblemView = useMutation({
    mutationFn: async (problem: { problemId: string; contestId: number; index: string; name: string; rating?: number }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Save locally
        const prev = JSON.parse(localStorage.getItem("cf_problem_history") || "[]");
        const updated = [{ ...problem, lastOpened: Date.now() }, ...prev.filter((p: any) => p.problemId !== problem.problemId)].slice(0, 50);
        localStorage.setItem("cf_problem_history", JSON.stringify(updated));
        return;
      }
      
      await api.post("/user/history", {
        item_type: "PROBLEM",
        item_id: problem.problemId,
        title: JSON.stringify({ name: problem.name, index: problem.index, rating: problem.rating }),
        contest_id: problem.contestId,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user_history"] }),
  });

  const recordContestView = useMutation({
    mutationFn: async (contest: { id: number; name: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const prev = JSON.parse(localStorage.getItem("cf_contest_history") || "[]");
        const updated = [{ ...contest, lastOpened: Date.now() }, ...prev.filter((c: any) => c.id !== contest.id)].slice(0, 50);
        localStorage.setItem("cf_contest_history", JSON.stringify(updated));
        return;
      }
      
      await api.post("/user/history", {
        item_type: "CONTEST",
        item_id: contest.id.toString(),
        title: contest.name,
        contest_id: contest.id,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user_history"] }),
  });

  const deleteHistoryItem = useMutation({
    mutationFn: async ({ type, id }: { type: "PROBLEM" | "CONTEST"; id: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (type === "PROBLEM") {
          const prev = JSON.parse(localStorage.getItem("cf_problem_history") || "[]");
          localStorage.setItem("cf_problem_history", JSON.stringify(prev.filter((p: any) => p.problemId !== id)));
        } else {
          const prev = JSON.parse(localStorage.getItem("cf_contest_history") || "[]");
          localStorage.setItem("cf_contest_history", JSON.stringify(prev.filter((c: any) => c.id !== parseInt(id))));
        }
        return;
      }
      
      await api.delete(`/user/history/${type}/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user_history"] }),
  });

  const clearHistory = useMutation({
    mutationFn: async (type?: "PROBLEM" | "CONTEST") => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!type || type === "PROBLEM") localStorage.removeItem("cf_problem_history");
        if (!type || type === "CONTEST") localStorage.removeItem("cf_contest_history");
        return;
      }

      const url = type ? `/user/history?item_type=${type}` : "/user/history";
      await api.delete(url);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user_history"] }),
  });

  return {
    problemHistory: history.problemHistory,
    contestHistory: history.contestHistory,
    isLoading,
    recordProblemView: recordProblemView.mutate,
    recordContestView: recordContestView.mutate,
    deleteHistoryItem: deleteHistoryItem.mutate,
    clearHistory: clearHistory.mutate,
  };
}
