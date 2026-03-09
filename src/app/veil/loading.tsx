export default function VeilLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-400">Loading Teacher Hub&hellip;</p>
      </div>
    </div>
  );
}
