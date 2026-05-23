"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { createReadingItemAction, updateReadingStatusAction, deleteReadingItemAction } from "@/app/actions/tracking";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface ReadingItem {
  id: string; title: string; author: string | null; type: string;
  status: string; rating: number | null; notes: string | null;
}

const STATUSES = [
  { key: "to-read", label: "To Read",  color: "rgba(245,240,232,0.3)" },
  { key: "reading", label: "Reading",  color: "#60A5FA" },
  { key: "done",    label: "Done",     color: "#4ADE80" },
] as const;

export function ReadingSection({ reading: initial }: { reading: ReadingItem[] }) {
  const [items, setItems] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", author: "", type: "book" as "book" | "article" });

  function handleCreate() {
    if (!form.title.trim()) return;
    startTransition(async () => {
      const res = await createReadingItemAction(form.title.trim(), form.author, form.type);
      if ("error" in res) return;
      setItems((prev) => [...prev, { id: res.id, title: form.title.trim(), author: form.author || null, type: form.type, status: "to-read", rating: null, notes: null }]);
      setForm({ title: "", author: "", type: "book" });
      setShowForm(false);
    });
  }

  function handleStatus(id: string, status: "to-read" | "reading" | "done") {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
    startTransition(() => updateReadingStatusAction(id, status));
  }

  function handleRating(id: string, rating: number) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, rating } : i));
    startTransition(() => updateReadingStatusAction(id, "done", rating));
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    startTransition(() => deleteReadingItemAction(id));
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>Reading List</h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>
            {items.filter((i) => i.status === "reading").length} reading · {items.filter((i) => i.status === "done").length} done
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
          style={{ background: "rgba(200,144,10,0.12)", border: "1px solid rgba(200,144,10,0.3)", color: "#C8900A" }}>
          <Plus className="w-3.5 h-3.5" /> Add book / article
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,235,180,0.1)" }}>
          <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Title…" className="w-full bg-transparent text-sm outline-none mb-2"
            style={{ color: "#F5F0E8" }} />
          <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })}
            placeholder="Author (optional)…" className="w-full bg-transparent text-xs outline-none mb-3"
            style={{ color: "rgba(245,240,232,0.5)" }} />
          <div className="flex gap-2 mb-3">
            {(["book", "article"] as const).map((t) => (
              <button key={t} onClick={() => setForm({ ...form, type: t })}
                className="px-3 py-1 rounded-lg text-xs transition-all"
                style={{
                  background: form.type === t ? "rgba(200,144,10,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${form.type === t ? "rgba(200,144,10,0.3)" : "rgba(255,235,180,0.08)"}`,
                  color: form.type === t ? "#C8900A" : "rgba(245,240,232,0.4)",
                }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
              style={{ background: "rgba(200,144,10,0.2)", color: "#C8900A" }}>Add</button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-xs"
              style={{ color: "rgba(245,240,232,0.4)" }}>Cancel</button>
          </div>
        </div>
      )}

      {items.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <BookOpen className="w-8 h-8" style={{ color: "rgba(245,240,232,0.1)" }} />
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.25)" }}>Start building your reading list</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {STATUSES.map(({ key, label, color }) => {
            const col = items.filter((i) => i.status === key);
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>
                    {label} · {col.length}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {col.map((item) => (
                    <div key={item.id} className="group p-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium leading-snug" style={{ color: "#F5F0E8" }}>{item.title}</p>
                          {item.author && <p className="text-[10px] mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>{item.author}</p>}
                          <span className="text-[9px] uppercase tracking-wider"
                            style={{ color: "rgba(245,240,232,0.2)" }}>{item.type}</span>
                        </div>
                        <button onClick={() => handleDelete(item.id)}
                          className="opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 rounded p-0.5">
                          <Trash2 className="w-3 h-3" style={{ color: "rgba(248,113,113,0.5)" }} />
                        </button>
                      </div>
                      {/* Status buttons */}
                      <div className="flex gap-1 mt-2">
                        {STATUSES.filter((s) => s.key !== key).map((s) => (
                          <button key={s.key} onClick={() => handleStatus(item.id, s.key as "to-read" | "reading" | "done")}
                            className="text-[9px] px-1.5 py-0.5 rounded-full transition-colors hover:opacity-80"
                            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(245,240,232,0.35)" }}>
                            → {s.label}
                          </button>
                        ))}
                      </div>
                      {/* Rating for done items */}
                      {key === "done" && (
                        <div className="flex gap-0.5 mt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} onClick={() => handleRating(item.id, star)}
                              className="text-sm transition-all hover:scale-110"
                              style={{ color: (item.rating ?? 0) >= star ? "#C8900A" : "rgba(245,240,232,0.15)" }}>
                              ★
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Charts */}
      {items.length > 0 && (() => {
        const statusData = [
          { name: "To Read", value: items.filter((i) => i.status === "to-read").length, color: "rgba(245,240,232,0.4)" },
          { name: "Reading",  value: items.filter((i) => i.status === "reading").length, color: "#60A5FA" },
          { name: "Done",     value: items.filter((i) => i.status === "done").length,    color: "#4ADE80" },
        ].filter((d) => d.value > 0);

        const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        items.filter((i) => i.status === "done" && i.rating).forEach((i) => { ratingCounts[i.rating!]++; });
        const ratingData = Object.entries(ratingCounts).map(([star, count]) => ({ star: `${"★".repeat(Number(star))}`, count }));
        const hasRatings = ratingData.some((r) => r.count > 0);

        return (
          <div className="mt-10 grid grid-cols-2 gap-5">
            {statusData.length > 1 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "rgba(245,240,232,0.25)" }}>Library split</p>
                <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={4}>
                        {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#0D0C0A", border: "1px solid rgba(200,144,10,0.25)", borderRadius: 8, padding: "6px 10px" }}
                        formatter={(v, name) => [v, name]}
                        labelStyle={{ color: "#F5F0E8", fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-1">
                    {statusData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
                        <span className="text-[10px]" style={{ color: "rgba(245,240,232,0.45)" }}>{d.name} ({d.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {hasRatings && (
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "rgba(245,240,232,0.25)" }}>Ratings</p>
                <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={ratingData} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,235,180,0.06)" vertical={false} />
                      <XAxis dataKey="star" tick={{ fill: "rgba(245,240,232,0.5)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: "rgba(245,240,232,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "#0D0C0A", border: "1px solid rgba(200,144,10,0.25)", borderRadius: 8, padding: "6px 10px" }}
                        formatter={(v) => [v, "Books"]}
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      />
                      <Bar dataKey="count" fill="#C8900A" fillOpacity={0.8} radius={[3, 3, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
