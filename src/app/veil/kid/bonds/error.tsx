'use client';

export default function KidFlowError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <div className="rounded-xl border border-rose-500/30 bg-rose-950/10 p-4">
        <p className="text-sm text-rose-300">{error.message || 'Kid flow crashed.'}</p>
        <button
          className="mt-2 rounded border border-rose-400/40 px-2 py-1 text-xs text-rose-200"
          onClick={reset}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
