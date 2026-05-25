export default function NotesLoading() {
  return (
    <div className="flex h-full animate-pulse">
      {/* sidebar */}
      <div className="w-56 shrink-0 border-r p-4 flex flex-col gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="h-8 rounded-xl mb-2" style={{ background: "rgba(255,255,255,0.06)" }} />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }} />
        ))}
      </div>
      {/* editor */}
      <div className="flex-1 p-8">
        <div className="h-8 w-64 rounded-xl mb-6" style={{ background: "rgba(255,255,255,0.06)" }} />
        {[100, 80, 90, 60].map((w, i) => (
          <div key={i} className="h-4 rounded-lg mb-3" style={{ width: `${w}%`, background: "rgba(255,255,255,0.04)" }} />
        ))}
      </div>
    </div>
  );
}
