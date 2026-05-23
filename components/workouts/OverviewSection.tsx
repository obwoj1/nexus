"use client";

import { useMemo } from "react";
import { Dumbbell, Flame, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface SetRow { reps: number | null; weight_lbs: number | null; exercise_id: string; exercises: { muscle_group: string }; }
interface Session { id: string; name: string; date: string; session_sets: SetRow[]; }

const MUSCLE_COLORS: Record<string, string> = {
  Chest: "#C8900A", Back: "#60A5FA", Legs: "#4ADE80",
  Shoulders: "#F87171", Arms: "#A78BFA", Core: "#FB923C", Cardio: "#34D399",
};

export function OverviewSection({
  todaySession, recentSessions, today,
}: {
  todaySession: Session | null;
  recentSessions: Session[];
  today: string;
}) {
  const allSessions = useMemo(() => {
    const arr = [...recentSessions];
    if (todaySession) arr.unshift(todaySession as Session);
    return arr;
  }, [todaySession, recentSessions]);

  // ── This-week stats ───────────────────────────────────────────────────────
  const weekAgo = useMemo(() => {
    const d = new Date(today); d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  }, [today]);

  const thisWeekSessions = allSessions.filter((s) => s.date >= weekAgo);
  const thisWeekVolume = thisWeekSessions.reduce((sum, s) =>
    sum + s.session_sets.reduce((a, r) => a + (r.weight_lbs ?? 0) * (r.reps ?? 0), 0), 0);

  const totalSessions = allSessions.length;
  const totalVolume = allSessions.reduce((sum, s) =>
    sum + s.session_sets.reduce((a, r) => a + (r.weight_lbs ?? 0) * (r.reps ?? 0), 0), 0);

  // ── Muscle group breakdown (all time) ─────────────────────────────────────
  const muscleData = useMemo(() => {
    const map: Record<string, number> = {};
    allSessions.forEach((s) =>
      s.session_sets.forEach((set) => {
        const mg = set.exercises?.muscle_group ?? "Other";
        map[mg] = (map[mg] ?? 0) + (set.weight_lbs ?? 0) * (set.reps ?? 0);
      }),
    );
    return Object.entries(map)
      .map(([name, volume]) => ({ name, volume: Math.round(volume) }))
      .sort((a, b) => b.volume - a.volume);
  }, [allSessions]);

  // ── Workout streak (consecutive days ending today) ────────────────────────
  const streak = useMemo(() => {
    const dates = new Set(allSessions.map((s) => s.date));
    let count = 0;
    const d = new Date(today);
    while (dates.has(d.toISOString().split("T")[0])) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [allSessions, today]);

  // ── Weekly frequency (last 8 weeks) ──────────────────────────────────────
  const weeklyFreq = useMemo(() => {
    const weeks: { label: string; sessions: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date(today); start.setDate(start.getDate() - i * 7);
      const end = new Date(today); end.setDate(end.getDate() - (i - 1) * 7 + (i === 0 ? 1 : 0));
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];
      const count = allSessions.filter((s) => s.date >= startStr && s.date < endStr).length;
      const label = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      weeks.push({ label, sessions: count });
    }
    return weeks;
  }, [allSessions, today]);

  const tooltipStyle = {
    contentStyle: { background: "#0D0C0A", border: "1px solid rgba(200,144,10,0.25)", borderRadius: 8, padding: "6px 10px" },
    labelStyle: { color: "rgba(245,240,232,0.5)", fontSize: 10 },
  };

  if (allSessions.length === 0) {
    return (
      <div className="p-4 md:p-8 max-w-3xl w-full">
        <h2 className="text-xl font-semibold tracking-tight mb-1" style={{ color: "#F5F0E8" }}>Overview</h2>
        <p className="text-xs mb-8" style={{ color: "rgba(245,240,232,0.35)" }}>Your workout analytics</p>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Dumbbell className="w-10 h-10" style={{ color: "rgba(245,240,232,0.08)" }} />
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.25)" }}>Log your first workout to see analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl w-full">
      <h2 className="text-xl font-semibold tracking-tight mb-1" style={{ color: "#F5F0E8" }}>Overview</h2>
      <p className="text-xs mb-8" style={{ color: "rgba(245,240,232,0.35)" }}>Last 90 days</p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        {[
          { label: "Streak", value: `${streak}`, sub: streak === 1 ? "day" : "days" },
          { label: "This week", value: `${thisWeekSessions.length}`, sub: "sessions" },
          { label: "Total", value: `${totalSessions}`, sub: "sessions" },
          { label: "Total volume", value: `${totalVolume > 0 ? (totalVolume / 1000).toFixed(0) + "k" : "0"}`, sub: "lbs moved" },
        ].map((s, i) => (
          <div key={i} className="px-4 py-4 rounded-2xl"
            style={{ background: "rgba(200,144,10,0.06)", border: "1px solid rgba(200,144,10,0.15)" }}>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(200,144,10,0.6)" }}>{s.label}</p>
            <p className="text-2xl font-semibold" style={{ color: "#F5F0E8" }}>{s.value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Muscle group breakdown */}
        {muscleData.length > 0 && (
          <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
            <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "rgba(200,144,10,0.6)" }}>Volume by muscle</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={muscleData} dataKey="volume" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                  {muscleData.map((entry, i) => (
                    <Cell key={i} fill={MUSCLE_COLORS[entry.name] ?? "#C8900A"} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(v) => [`${(v as number).toLocaleString()} lbs`, ""]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {muscleData.map((d) => (
                <div key={d.name} className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: MUSCLE_COLORS[d.name] ?? "#C8900A" }} />
                  <span className="text-[10px]" style={{ color: "rgba(245,240,232,0.45)" }}>{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly frequency */}
        <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
          <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "rgba(200,144,10,0.6)" }}>Sessions per week</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyFreq} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,235,180,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "rgba(245,240,232,0.35)", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "rgba(245,240,232,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} formatter={(v) => [v, "Sessions"]} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="sessions" fill="#C8900A" fillOpacity={0.8} radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Most trained muscle */}
      {muscleData[0] && (
        <div className="flex items-center gap-4 p-4 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${MUSCLE_COLORS[muscleData[0].name] ?? "#C8900A"}20` }}>
            <Flame className="w-4 h-4" style={{ color: MUSCLE_COLORS[muscleData[0].name] ?? "#C8900A" }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "#F5F0E8" }}>
              Most trained: <span style={{ color: MUSCLE_COLORS[muscleData[0].name] ?? "#C8900A" }}>{muscleData[0].name}</span>
            </p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>
              {muscleData[0].volume.toLocaleString()} lbs volume · {muscleData.length} muscle groups hit
            </p>
          </div>
          <TrendingUp className="w-4 h-4 ml-auto shrink-0" style={{ color: "rgba(245,240,232,0.2)" }} />
        </div>
      )}
    </div>
  );
}
