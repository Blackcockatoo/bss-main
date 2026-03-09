"use client";

import { useEffect } from "react";

// Messages shown to kids must be friendly and devoid of raw JS error text.
const KID_SAFE_MESSAGE =
  "Oops, something went a bit wonky! Try tapping the button below to fix it.";

const DEV_SAFE_MESSAGES: Record<string, string> = {
  "Failed to fetch": "Network hiccup — check your connection.",
  NetworkError: "Network hiccup — check your connection.",
  ChunkLoadError: "A page resource failed to load. Refresh the page.",
  "Loading chunk": "A page resource failed to load. Refresh the page.",
};

function getDisplayMessage(error: Error): string {
  // In development show something useful to the developer
  if (process.env.NODE_ENV === "development") {
    for (const [key, msg] of Object.entries(DEV_SAFE_MESSAGES)) {
      if (error.message.includes(key)) return msg;
    }
    return error.message;
  }
  // In production always show the kid-safe generic message
  return KID_SAFE_MESSAGE;
}

export default function KidError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Do not log raw errors to the browser console in production —
    // forward to an error reporting service here when one exists.
    if (process.env.NODE_ENV === "development") {
      console.error("[Veil/Kid] Error boundary caught:", error);
    }
  }, [error]);

  const message = getDisplayMessage(error);

  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-rose-400/30 bg-rose-500/10">
          <svg
            className="h-5 w-5 text-rose-300"
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

        <h2 className="mb-2 text-base font-semibold text-rose-200">
          Something went wrong
        </h2>

        <p className="mb-5 text-sm text-rose-100/70 leading-relaxed">
          {message}
        </p>

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            Try again
          </button>
          <a
            href="/pet"
            className="rounded-lg border border-slate-600/40 bg-slate-800/40 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Back to my pet
          </a>
        </div>
      </div>
    </div>
  );
}
