export default function MailLoading() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-5 w-24 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="h-8 w-28 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }} />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 h-16 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="w-8 h-8 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="flex-1">
              <div className="h-3 rounded-lg mb-1.5" style={{ width: "40%", background: "rgba(255,255,255,0.06)" }} />
              <div className="h-2.5 rounded-lg" style={{ width: "70%", background: "rgba(255,255,255,0.03)" }} />
            </div>
            <div className="h-2.5 w-12 rounded-lg shrink-0" style={{ background: "rgba(255,255,255,0.04)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
