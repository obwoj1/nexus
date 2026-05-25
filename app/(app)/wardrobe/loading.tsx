export default function WardrobeLoading() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full animate-pulse">
      <div className="h-5 w-28 rounded-xl mb-8" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
        ))}
      </div>
    </div>
  );
}
