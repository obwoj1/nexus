export default function TrackingLoading() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full animate-pulse">
      <div className="h-5 w-32 rounded-xl mb-8" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="flex gap-2 mb-6">
        {[80, 96, 72, 88, 64, 80].map((w, i) => (
          <div key={i} className="h-8 rounded-full" style={{ width: w, background: "rgba(255,255,255,0.05)" }} />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
        ))}
      </div>
    </div>
  );
}
