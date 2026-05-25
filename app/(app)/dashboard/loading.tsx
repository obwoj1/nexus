export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full animate-pulse">
      <div className="h-6 w-40 rounded-xl mb-1" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="h-3 w-24 rounded-xl mb-8" style={{ background: "rgba(255,255,255,0.04)" }} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
        ))}
      </div>
    </div>
  );
}
