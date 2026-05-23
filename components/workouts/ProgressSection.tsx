"use client";

import { useState, useTransition } from "react";
import { TrendingUp } from "lucide-react";
import { getExerciseProgressAction } from "@/app/actions/workouts";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Exercise { id: string; name: string; muscle_group: string; equipment: string; type: string; }
interface ProgressPoint { date: string; maxWeight: number; totalVolume: number; est1RM: number; }

export function ProgressSection({ exercises }: { exercises: Exercise[] }) {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [progressData, setProgressData] = useState<ProgressPoint[]>([]);
  const [isPending, startTransition] = useTransition();

  const filtered = search
    ? exercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : exercises;

  function handleSelect(exercise: Exercise) {
    setSelectedExercise(exercise);
    setSearch(exercise.name);
    setShowDropdown(false);
    setProgressData([]);
    startTransition(async () => {
      const data = await getExerciseProgressAction(exercise.id);
      setProgressData(data);
    });
  }

  const tooltipStyle = {
    contentStyle: { background: "#0D0C0A", border: "1px solid rgba(200,144,10,0.25)", borderRadius: 8, padding: "6px 10px" },
    labelStyle: { color: "rgba(245,240,232,0.5)", fontSize: 10 },
    cursor: { stroke: "rgba(255,235,180,0.1)" },
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl w-full">
      <div className="mb-8">
        <h2 className="text-xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>Progress</h2>
        <p className="text-xs mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>Strength trends over time per exercise</p>
      </div>

      {/* Exercise search */}
      <div className="relative mb-8">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); setSelectedExercise(null); }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search an exercise…"
          className="w-full px-4 py-3 rounded-xl bg-transparent text-sm outline-none"
          style={{ color: "#F5F0E8", border: "1px solid rgba(200,144,10,0.2)" }}
        />
        {showDropdown && search && !selectedExercise && (
          <div className="absolute top-full mt-1 left-0 right-0 rounded-xl z-10 max-h-64 overflow-y-auto"
            style={{ background: "#0D0C0A", border: "1px solid rgba(200,144,10,0.2)" }}>
            {filtered.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "rgba(245,240,232,0.3)" }}>No results</p>
            ) : (
              filtered.slice(0, 12).map((e) => (
                <button key={e.id} onClick={() => handleSelect(e)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center justify-between"
                  style={{ color: "#F5F0E8" }}>
                  <span>{e.name}</span>
                  <span className="text-xs" style={{ color: "rgba(245,240,232,0.35)" }}>{e.muscle_group}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Empty state — no selection */}
      {!selectedExercise && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <TrendingUp className="w-8 h-8" style={{ color: "rgba(245,240,232,0.08)" }} />
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.25)" }}>Select an exercise to see your progress</p>
        </div>
      )}

      {/* Loading */}
      {selectedExercise && isPending && (
        <div className="flex items-center justify-center py-24">
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.3)" }}>Loading…</p>
        </div>
      )}

      {/* No data yet */}
      {selectedExercise && !isPending && progressData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <TrendingUp className="w-8 h-8" style={{ color: "rgba(245,240,232,0.08)" }} />
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.25)" }}>
            No sessions logged for {selectedExercise.name} yet
          </p>
        </div>
      )}

      {/* Charts */}
      {selectedExercise && !isPending && progressData.length > 0 && (
        <div className="flex flex-col gap-5">
          {/* Max weight */}
          <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
            <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "rgba(200,144,10,0.6)" }}>
              Max weight + est. 1RM per session (lbs)
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={progressData} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,235,180,0.06)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "rgba(245,240,232,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(245,240,232,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} formatter={(v, name) => [`${v} lbs`, name === "maxWeight" ? "Max weight" : "Est. 1RM"]} />
                <Line type="monotone" dataKey="maxWeight" stroke="#C8900A" strokeWidth={2.5}
                  dot={{ fill: "#C8900A", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: "#F5CE58" }} />
                <Line type="monotone" dataKey="est1RM" stroke="#F5CE58" strokeWidth={1.5} strokeDasharray="4 3"
                  dot={false} activeDot={{ r: 4, fill: "#F5CE58" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Total volume */}
          <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
            <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "rgba(200,144,10,0.6)" }}>
              Total volume per session (lbs × reps)
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={progressData} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,235,180,0.06)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "rgba(245,240,232,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(245,240,232,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${(v as number).toLocaleString()} lbs`, "Volume"]} />
                <Line type="monotone" dataKey="totalVolume" stroke="#4ADE80" strokeWidth={2}
                  dot={{ fill: "#4ADE80", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#4ADE80" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Personal bests */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Best weight", value: `${Math.max(...progressData.map((d) => d.maxWeight))} lbs` },
              { label: "Est. 1RM", value: `${Math.max(...progressData.map((d) => d.est1RM))} lbs`, gold: true },
              { label: "Best volume", value: `${Math.max(...progressData.map((d) => d.totalVolume)).toLocaleString()} lbs` },
            ].map((stat) => (
              <div key={stat.label} className="px-5 py-4 rounded-2xl"
                style={{ background: stat.gold ? "rgba(200,144,10,0.1)" : "rgba(200,144,10,0.06)", border: `1px solid rgba(200,144,10,${stat.gold ? "0.3" : "0.15"})` }}>
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(200,144,10,0.6)" }}>{stat.label}</p>
                <p className="text-xl font-semibold" style={{ color: "#F5F0E8" }}>{stat.value}</p>
                {stat.gold && <p className="text-[9px] mt-0.5" style={{ color: "rgba(200,144,10,0.5)" }}>Epley formula</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
