"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Scale } from "lucide-react";
import { upsertBodyMetricAction, deleteBodyMetricAction } from "@/app/actions/workouts";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Metric { id: string; date: string; weight_lbs: number | null; body_fat_pct: number | null; notes: string | null; }

export function BodyMetricsSection({ metrics: initial, today }: { metrics: Metric[]; today: string }) {
  const [metrics, setMetrics] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const sorted = [...metrics].sort((a, b) => a.date.localeCompare(b.date));
  const chartData = sorted.map((m) => ({
    date: new Date(m.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    weight: m.weight_lbs ?? undefined,
    bodyFat: m.body_fat_pct ?? undefined,
  }));

  function handleSave() {
    const w = weight ? parseFloat(weight) : null;
    const bf = bodyFat ? parseFloat(bodyFat) : null;
    if (!w && !bf) return;
    const optimistic: Metric = { id: crypto.randomUUID(), date, weight_lbs: w, body_fat_pct: bf, notes: notes || null };
    setMetrics((prev) => {
      const filtered = prev.filter((m) => m.date !== date);
      return [optimistic, ...filtered];
    });
    setShowForm(false); setWeight(""); setBodyFat(""); setNotes(""); setDate(today);
    startTransition(() => { void upsertBodyMetricAction(date, w, bf, notes || null); });
  }

  function handleDelete(metric: Metric) {
    setMetrics((prev) => prev.filter((m) => m.id !== metric.id));
    startTransition(() => deleteBodyMetricAction(metric.id));
  }

  const latest = [...metrics].sort((a, b) => b.date.localeCompare(a.date))[0];
  const tooltipStyle = {
    contentStyle: { background: "#0D0C0A", border: "1px solid rgba(200,144,10,0.25)", borderRadius: 8, padding: "6px 10px" },
    labelStyle: { color: "rgba(245,240,232,0.5)", fontSize: 10 },
  };

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>Body Metrics</h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>
            {metrics.length} entr{metrics.length !== 1 ? "ies" : "y"} · weight + body fat over time
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
          style={{ background: "rgba(200,144,10,0.12)", border: "1px solid rgba(200,144,10,0.3)", color: "#C8900A" }}>
          <Plus className="w-3.5 h-3.5" /> Log
        </button>
      </div>

      {/* Log form */}
      {showForm && (
        <div className="mb-6 p-5 rounded-2xl flex flex-col gap-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,144,10,0.2)" }}>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Date", type: "date", value: date, set: setDate, colorScheme: "dark" },
              { label: "Weight (lbs)", type: "number", value: weight, set: setWeight, placeholder: "e.g. 175.5" },
              { label: "Body fat (%)", type: "number", value: bodyFat, set: setBodyFat, placeholder: "e.g. 15.2" },
            ].map(({ label, type, value, set, placeholder, colorScheme }) => (
              <div key={label}>
                <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: "rgba(245,240,232,0.35)" }}>{label}</label>
                <input type={type} value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder}
                  className="w-full bg-transparent text-sm outline-none px-3 py-1.5 rounded-lg"
                  style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)", colorScheme: colorScheme as "dark" | undefined }} />
              </div>
            ))}
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: "rgba(245,240,232,0.35)" }}>Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Morning, fasted"
              className="w-full bg-transparent text-sm outline-none px-3 py-1.5 rounded-lg"
              style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)" }} />
          </div>
          <div className="flex gap-2 mt-1">
            <button onClick={handleSave} disabled={isPending}
              className="px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
              style={{ background: "rgba(200,144,10,0.2)", border: "1px solid rgba(200,144,10,0.3)", color: "#C8900A" }}>
              {isPending ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-xs"
              style={{ color: "rgba(245,240,232,0.4)" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {metrics.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Scale className="w-10 h-10" style={{ color: "rgba(245,240,232,0.08)" }} />
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.25)" }}>No body metrics logged yet</p>
        </div>
      )}

      {/* Latest snapshot */}
      {latest && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { label: "Current weight", value: latest.weight_lbs != null ? `${latest.weight_lbs} lbs` : "—" },
            { label: "Body fat", value: latest.body_fat_pct != null ? `${latest.body_fat_pct}%` : "—" },
          ].map((s) => (
            <div key={s.label} className="px-4 py-4 rounded-2xl"
              style={{ background: "rgba(200,144,10,0.06)", border: "1px solid rgba(200,144,10,0.15)" }}>
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(200,144,10,0.6)" }}>{s.label}</p>
              <p className="text-2xl font-semibold" style={{ color: "#F5F0E8" }}>{s.value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>
                {new Date(latest.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Weight trend chart */}
      {chartData.filter((d) => d.weight != null).length >= 2 && (
        <div className="p-5 rounded-2xl mb-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
          <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "rgba(200,144,10,0.6)" }}>Weight trend (lbs)</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,235,180,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "rgba(245,240,232,0.35)", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(245,240,232,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip {...tooltipStyle} formatter={(v) => [`${v} lbs`, "Weight"]} />
              <Line type="monotone" dataKey="weight" stroke="#C8900A" strokeWidth={2.5} connectNulls
                dot={{ fill: "#C8900A", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: "#F5CE58" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Log table */}
      {metrics.length > 0 && (
        <div className="flex flex-col gap-2">
          {[...metrics].sort((a, b) => b.date.localeCompare(a.date)).map((m) => (
            <div key={m.id} className="flex items-center gap-4 px-4 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: "#F5F0E8" }}>
                  {new Date(m.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  {m.weight_lbs != null && <span className="text-xs font-mono" style={{ color: "rgba(245,240,232,0.5)" }}>{m.weight_lbs} lbs</span>}
                  {m.body_fat_pct != null && <span className="text-xs font-mono" style={{ color: "rgba(245,240,232,0.5)" }}>{m.body_fat_pct}% BF</span>}
                  {m.notes && <span className="text-xs italic truncate" style={{ color: "rgba(245,240,232,0.3)" }}>{m.notes}</span>}
                </div>
              </div>
              <button onClick={() => handleDelete(m)} disabled={isPending}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-all shrink-0">
                <Trash2 className="w-3.5 h-3.5" style={{ color: "rgba(248,113,113,0.4)" }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
