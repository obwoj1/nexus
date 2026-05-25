export default function WorkoutsLoading() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div className="h-5 w-28 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="h-8 w-32 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }} />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }} />
        ))}
      </div>
    </div>
  );
}
