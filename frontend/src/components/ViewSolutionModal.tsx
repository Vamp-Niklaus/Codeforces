import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { X, Copy, Check, ExternalLink, Loader2, Award, FileCode } from "lucide-react";

interface Props {
  contestId: number;
  submissionId: number;
  problemName?: string;
  problemIndex?: string;
  handle?: string;
  verdict?: string;
  onClose: () => void;
}

export default function ViewSolutionModal({
  contestId,
  submissionId,
  problemName,
  problemIndex,
  handle,
  verdict,
  onClose,
}: Props) {
  const [copied, setCopied] = React.useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["submissionCode", contestId, submissionId],
    queryFn: async () => {
      const res = await api.get(`/submission/${contestId}/${submissionId}/code`);
      return res.data;
    },
    enabled: Boolean(contestId && submissionId),
  });

  const handleCopy = async () => {
    if (data?.code) {
      try {
        await navigator.clipboard.writeText(data.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error("Failed to copy code", e);
      }
    }
  };

  const isAccepted = verdict === "OK";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-lg">
                  {problemIndex ? `${contestId}${problemIndex} - ` : ""}
                  {problemName || `Submission #${submissionId}`}
                </h3>
                {verdict && (
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono border ${
                      isAccepted
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {isAccepted ? "ACCEPTED" : verdict}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Codeforces Submission #{submissionId}</span>
                {handle && <span className="text-blue-400 font-medium">by {handle}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://codeforces.com/contest/${contestId}/submission/${submissionId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all text-xs flex items-center gap-1.5"
              title="Open on Codeforces"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Codeforces</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Code Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm">Retrieving source code from Codeforces...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-16 space-y-3">
              <Award className="w-10 h-10 text-rose-400 mx-auto" />
              <p className="text-rose-200 text-sm font-semibold">Failed to fetch source code</p>
              <a
                href={`https://codeforces.com/contest/${contestId}/submission/${submissionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline"
              >
                View directly on Codeforces <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {data && !isLoading && (
            <div className="relative group">
              <button
                onClick={handleCopy}
                className="absolute right-4 top-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium backdrop-blur transition-all shadow-lg"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    Copy Code
                  </>
                )}
              </button>

              <pre className="text-sm font-mono text-slate-200 bg-slate-900 border border-slate-800 p-5 rounded-xl overflow-x-auto whitespace-pre leading-relaxed scrollbar-thin">
                <code>{data.code}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
