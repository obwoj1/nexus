"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Flame } from "lucide-react";
import { createHabitAction, deleteHabitAction, toggleHabitLogAction } from "@/app/actions/tracking";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Habit { id: string; name: string; color: string; }
interface HabitLog { habit_id: string; date: string; }

const COLORS = ["#C8900A", "#4ADE80", "#60A5FA", "#F87171", "#A78BFA", "#FB923C", "#34D399", "#F472B6"];

function getLast7Days(today: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
}

function getStreak(logs: Set<string>, today: string): number {
  let streak = 0;
  const d = new Date(today);
  while (logs.has(d.toISOString().split("T")[0])) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function HabitsSection({ today, habits: initial, habitLogs }: {
  today: string; habits: Habit[]; habitLogs: HabitLog[];
}) {
  const [habits, setHabits] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [logs, setLogs] = useState<Set<string>>(
    new Set(habitLogs.map((l) => `${l.habit_id}|${l.date}`))
  );

  const days = getLast7Days(today);

  const thirtyAgoStr = (() => {
    const d = new Date(today); d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  })();
  const habitChartData = habits.map((h) => {
    const count = [...logs].filter((k) => k.startsWith(h.id + "|") && k.split("|")[1] >= thirtyAgoStr).length;
    return { name: h.name.length > 11 ? h.name.slice(0, 11) + "…" : h.name, rate: Math.round((count / 30) * 100), color: h.color };
  });

  function isLogged(habitId: string, date: string) {
    return logs.has(`${habitId}|${date}`);
  }

  function handleToggle(habitId: string, date: string) {
    const key = `${habitId}|${date}`;
    const nowCompleted = !logs.has(key);
    setLogs((prev) => {
      const next = new Set(prev);
      if (nowCompleted) next.add(key); else next.delete(key);
      return next;
    });
    startTransition(() => toggleHabitLogAction(habitId, date, nowCompleted));
  }

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const res = await createHabitAction(newName.trim(), newColor);
      if ("error" in res) return;
      setHabits((prev) => [...prev, { id: res.id, name: newName.trim(), color: newColor }]);
      setNewName(""); setShowForm(false);
    });
  }

  function handleDelete(id: string) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    startTransition(() => deleteHabitAction(id));
  }

  const logsPerHabit = (habitId: string) =>
    new Set([...logs].filter((k) => k.startsWith(habitId + "|")).map((k) => k.split("|")[1]));

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>Habits</h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>
            Daily streaks — {today}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
          style={{ background: "rgba(200,144,10,0.12)", border: "1px solid rgba(200,144,10,0.3)", color: "#C8900A" }}
        >
          <Plus className="w-3.5 h-3.5" /> New habit
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-6 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,235,180,0.1)" }}>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Habit name…"
            className="w-full bg-transparent text-sm outline-none mb-3"
            style={{ color: "#F5F0E8" }}
          />
          <div className="flex items-center gap-2 mb-3">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setNewColor(c)}
                className="w-5 h-5 rounded-full transition-all"
                style={{ background: c, outline: newColor === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
              style={{ background: "rgba(200,144,10,0.2)", color: "#C8900A" }}>
              Add
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{ color: "rgba(245,240,232,0.4)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Day headers */}
      {habits.length > 0 && (
        <div className="flex items-center mb-2 gap-4">
          <div className="flex-1" />
          <div className="flex gap-2">
            {days.map((d) => (
              <div key={d} className="w-7 text-center text-[9px] uppercase tracking-wider"
                style={{ color: d === today ? "#C8900A" : "rgba(245,240,232,0.25)" }}>
                {new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
              </div>
            ))}
          </div>
          <div className="w-16 text-center text-[9px] uppercase tracking-wider"
            style={{ color: "rgba(245,240,232,0.25)" }}>Streak</div>
          <div className="w-6" />
        </div>
      )}

      {/* Habit rows */}
      <div className="flex flex-col gap-2">
        {habits.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Flame className="w-8 h-8" style={{ color: "rgba(245,240,232,0.1)" }} />
            <p className="text-sm" style={{ color: "rgba(245,240,232,0.25)" }}>No habits yet — add one to start your streak</p>
          </div>
        )}
        {habits.map((habit) => {
          const habitLogSet = logsPerHabit(habit.id);
          const streak = getStreak(habitLogSet, today);
          return (
            <div key={habit.id}
              className="group flex items-center gap-4 px-4 py-3 rounded-2xl transition-colors"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
              {/* Color dot + name */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: habit.color }} />
                <span className="text-sm truncate" style={{ color: "#F5F0E8" }}>{habit.name}</span>
              </div>
              {/* 7-day dots */}
              <div className="flex gap-2">
                {days.map((d) => {
                  const done = isLogged(habit.id, d);
                  const isToday = d === today;
                  return (
                    <button key={d} onClick={() => handleToggle(habit.id, d)}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: done ? habit.color : "rgba(255,255,255,0.05)",
                        border: isToday && !done ? `1px solid ${habit.color}40` : "1px solid transparent",
                        opacity: d > today ? 0.3 : 1,
                      }}
                      disabled={d > today}>
                      {done && <span className="text-[10px]" style={{ color: "#000" }}>✓</span>}
                    </button>
                  );
                })}
              </div>
              {/* Streak */}
              <div className="w-16 text-center">
                <span className="text-sm font-semibold" style={{ color: streak > 0 ? "#C8900A" : "rgba(245,240,232,0.25)" }}>
                  {streak > 0 ? `🔥 ${streak}` : "—"}
                </span>
              </div>
              {/* Delete */}
              <button onClick={() => handleDelete(habit.id)}
                className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10">
                <Trash2 className="w-3 h-3" style={{ color: "rgba(248,113,113,0.5)" }} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      {habits.length > 0 && (
        <div className="mt-10">
          <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "rgba(245,240,232,0.25)" }}>30-day completion</p>
          <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={habitChartData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,235,180,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "rgba(245,240,232,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "rgba(245,240,232,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: "#0D0C0A", border: "1px solid rgba(200,144,10,0.25)", borderRadius: 8, padding: "6px 10px" }}
                  labelStyle={{ color: "rgba(245,240,232,0.5)", fontSize: 10 }}
                  formatter={(v) => [`${v}%`, "Completion"]}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar dataKey="rate" radius={[3, 3, 0, 0]} maxBarSize={36}>
                  {habitChartData.map((entry, i) => <Cell key={i} fill={entry.color} fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
