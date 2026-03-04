'use client';

import { useEffect } from 'react';

export default function KidError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4">
        <h2 className="text-base font-semibold text-rose-300">Kid flow failed</h2>
        <p className="mt-2 text-sm text-rose-200/80">{error.message}</p>
        <button
          onClick={reset}
          className="mt-3 rounded-lg border border-rose-400/40 px-3 py-1 text-xs text-rose-200 transition hover:bg-rose-500/10"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
