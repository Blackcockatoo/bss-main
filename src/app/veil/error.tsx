"use client";

import { useEffect } from "react";

const SAFE_MESSAGES: Record<string, string> = {
  "Failed to fetch":
    "A network error occurred. Check your connection and try again.",
  NetworkError:
    "A network error occurred. Check your connection and try again.",
  ChunkLoadError:
    "A resource failed to load. Refreshing the page should fix this.",
  "Loading chunk":
    "A resource failed to load. Refreshing the page should fix this.",
};

function getSafeMessage(error: Error): string {
  for (const [key, friendly] of Object.entries(SAFE_MESSAGES)) {
    if (error.message.includes(key)) {
      return friendly;
    }
  }
  // Don't expose raw JS engine messages (TypeErrors, stack traces, etc.) in production
  if (process.env.NODE_ENV === "development") {
    return error.message;
  }
  return "Something went wrong. Please try again or return to the main app.";
}

export default function VeilError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production, send to an error reporting service instead of console
    if (process.env.NODE_ENV === "development") {
      console.error("[Veil] Error boundary caught:", error);
    }
  }, [error]);

  const safeMessage = getSafeMessage(error);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-6 shadow-xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10">
          <svg
            className="h-6 w-6 text-cyan-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-base font-semibold text-cyan-100">
          Teacher Hub Error
        </h2>

        <p className="mb-5 text-sm text-slate-300 leading-relaxed">
          {safeMessage}
        </p>

        {error.digest && process.env.NODE_ENV === "development" && (
          <p className="mb-4 font-mono text-[11px] text-slate-500">
            ref: {error.digest}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            Try again
          </button>
          <a
            href="/pet"
            className="flex-1 rounded-lg border border-slate-600/60 bg-slate-800/50 px-4 py-2 text-center text-sm font-medium text-slate-300 transition hover:bg-slate-700/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Student app
          </a>
        </div>
      </div>
    </div>
  );
}
