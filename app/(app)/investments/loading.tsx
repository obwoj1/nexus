export default function InvestmentsLoading() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full animate-pulse">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="h-5 w-32 rounded-xl mb-2" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="h-3 w-20 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }} />
        </div>
        <div className="flex gap-2">
          {[64, 48, 80].map((w, i) => (
            <div key={i} className="h-8 rounded-xl" style={{ width: w, background: "rgba(255,255,255,0.05)" }} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="h-28 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
        <div className="h-28 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }} />
        ))}
      </div>
    </div>
  );
}
