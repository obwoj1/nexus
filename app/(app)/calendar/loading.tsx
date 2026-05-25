export default function CalendarLoading() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-5 w-36 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }} />
          <div className="h-8 w-8 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }} />
        </div>
      </div>
      {/* week row */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }} />
        ))}
      </div>
      {/* event rows */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }} />
        ))}
      </div>
    </div>
  );
}
