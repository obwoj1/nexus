"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { upsertHealthAction } from "@/app/actions/tracking";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface HealthMetric {
  date: string; sleep_hours: number | null; water_oz: number | null;
  mood: number | null; weight_lbs: number | null;
}

const MOOD_LABELS = ["", "😞", "😕", "😐", "🙂", "😄"];

export function HealthSection({ today, healthRows }: { today: string; healthRows: HealthMetric[] }) {
  const todayRow = healthRows.find((r) => r.date === today) ?? null;
  const [form, setForm] = useState({
    sleep_hours: todayRow?.sleep_hours?.toString() ?? "",
    water_oz: todayRow?.water_oz?.toString() ?? "",
    mood: todayRow?.mood ?? 0,
    weight_lbs: todayRow?.weight_lbs?.toString() ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await upsertHealthAction({
        date: today,
        sleep_hours: form.sleep_hours ? parseFloat(form.sleep_hours) : null,
        water_oz: form.water_oz ? parseInt(form.water_oz) : null,
        mood: form.mood || null,
        weight_lbs: form.weight_lbs ? parseFloat(form.weight_lbs) : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  const recentRows = healthRows.slice(0, 7);

  const healthChartData = [...healthRows]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      date: new Date(r.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      sleep: r.sleep_hours ?? undefined,
      mood: r.mood ?? undefined,
      water: r.water_oz ?? undefined,
    }));

  return (
    <div className="p-4 md:p-8 max-w-2xl w-full">
      <div className="mb-8">
        <h2 className="text-xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>Health</h2>
        <p className="text-xs mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>Today — {today}</p>
      </div>

      {/* Today's entry */}
      <div className="p-6 rounded-2xl mb-8" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.08)" }}>
        <p className="text-xs uppercase tracking-widest mb-5" style={{ color: "rgba(200,144,10,0.6)" }}>Today's log</p>

        <div className="grid grid-cols-2 gap-5 mb-6">
          {[
            { key: "sleep_hours", label: "Sleep", unit: "hrs", placeholder: "7.5", type: "number", step: "0.5" },
            { key: "water_oz",    label: "Water",  unit: "oz",  placeholder: "64",  type: "number", step: "8" },
            { key: "weight_lbs",  label: "Weight", unit: "lbs", placeholder: "165", type: "number", step: "0.1" },
          ].map((field) => (
            <div key={field.key}>
              <label className="text-[10px] uppercase tracking-widest block mb-1.5" style={{ color: "rgba(245,240,232,0.35)" }}>
                {field.label}
              </label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,235,180,0.08)" }}>
                <input
                  type={field.type} step={field.step}
                  value={form[field.key as keyof typeof form] as string}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: "#F5F0E8" }}
                />
                <span className="text-xs" style={{ color: "rgba(245,240,232,0.3)" }}>{field.unit}</span>
              </div>
            </div>
          ))}

          {/* Mood */}
          <div>
            <label className="text-[10px] uppercase tracking-widest block mb-1.5" style={{ color: "rgba(245,240,232,0.35)" }}>
              Mood
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((m) => (
                <button key={m} onClick={() => setForm({ ...form, mood: m })}
                  className="w-8 h-8 rounded-lg text-base transition-all"
                  style={{
                    background: form.mood === m ? "rgba(200,144,10,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${form.mood === m ? "rgba(200,144,10,0.3)" : "rgba(255,235,180,0.06)"}`,
                    transform: form.mood === m ? "scale(1.15)" : "scale(1)",
                  }}>
                  {MOOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={isPending}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
          style={{ background: saved ? "rgba(74,222,128,0.15)" : "rgba(200,144,10,0.15)", border: `1px solid ${saved ? "rgba(74,222,128,0.3)" : "rgba(200,144,10,0.3)"}`, color: saved ? "#4ADE80" : "#C8900A" }}>
          {isPending ? "Saving…" : saved ? "Saved ✓" : "Save today's log"}
        </button>
      </div>

      {/* Recent history */}
      {recentRows.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "rgba(245,240,232,0.25)" }}>Recent</p>
          <div className="flex flex-col gap-2">
            {recentRows.map((row) => (
              <div key={row.date} className="flex items-center gap-4 px-4 py-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.05)" }}>
                <span className="text-xs w-24 shrink-0" style={{ color: "rgba(245,240,232,0.4)" }}>
                  {new Date(row.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </span>
                <div className="flex items-center gap-4 text-xs" style={{ color: "rgba(245,240,232,0.6)" }}>
                  {row.sleep_hours != null && <span>💤 {row.sleep_hours}h</span>}
                  {row.water_oz != null && <span>💧 {row.water_oz}oz</span>}
                  {row.mood != null && <span>{MOOD_LABELS[row.mood]}</span>}
                  {row.weight_lbs != null && <span>⚖️ {row.weight_lbs}lbs</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentRows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Heart className="w-8 h-8" style={{ color: "rgba(245,240,232,0.1)" }} />
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.25)" }}>Log today to start tracking</p>
        </div>
      )}

      {/* Chart */}
      {healthChartData.length >= 2 && (
        <div className="mt-10">
          <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "rgba(245,240,232,0.25)" }}>Trends</p>
          <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={healthChartData} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,235,180,0.06)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "rgba(245,240,232,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="sleep" domain={[0, 12]} tick={{ fill: "rgba(245,240,232,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
                <YAxis yAxisId="mood" orientation="right" domain={[0, 5]} tick={{ fill: "rgba(245,240,232,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} width={20} />
                <Tooltip
                  contentStyle={{ background: "#0D0C0A", border: "1px solid rgba(200,144,10,0.25)", borderRadius: 8, padding: "6px 10px" }}
                  labelStyle={{ color: "rgba(245,240,232,0.5)", fontSize: 10 }}
                  cursor={{ stroke: "rgba(255,235,180,0.1)" }}
                />
                <Legend
                  iconType="circle" iconSize={6}
                  formatter={(value) => <span style={{ color: "rgba(245,240,232,0.5)", fontSize: 10 }}>{value}</span>}
                />
                <Line yAxisId="sleep" type="monotone" dataKey="sleep" name="Sleep (h)" stroke="#C8900A" strokeWidth={2} dot={{ fill: "#C8900A", r: 3 }} connectNulls />
                <Line yAxisId="mood" type="monotone" dataKey="mood" name="Mood /5" stroke="#60A5FA" strokeWidth={2} dot={{ fill: "#60A5FA", r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
