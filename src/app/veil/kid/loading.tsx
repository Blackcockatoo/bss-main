export default function KidLoading() {
  return (
    <div className="mx-auto flex min-h-[40vh] w-full max-w-3xl items-center justify-center p-4">
      <div className="text-center">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-purple-500/30 border-t-purple-400" />
        <p className="text-sm text-slate-400">Loading kid flow...</p>
      </div>
    </div>
  );
}
