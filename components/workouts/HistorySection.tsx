"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Trash2, History } from "lucide-react";
import { deleteSessionAction } from "@/app/actions/workouts";

interface Exercise { id: string; name: string; muscle_group: string; }
interface SetRow { id: string; set_number: number; reps: number | null; weight_lbs: number | null; exercise_id: string; exercises: Exercise; }
interface Session { id: string; name: string; date: string; duration_minutes: number | null; notes?: string | null; session_sets: SetRow[]; }

export function HistorySection({ sessions: initial }: { sessions: Session[] }) {
  const [sessions, setSessions] = useState(initial);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleDelete(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    startTransition(() => deleteSessionAction(id));
  }

  if (sessions.length === 0) {
    return (
      <div className="p-8 max-w-2xl">
        <h2 className="text-xl font-semibold tracking-tight mb-1" style={{ color: "#F5F0E8" }}>History</h2>
        <p className="text-xs mb-8" style={{ color: "rgba(245,240,232,0.35)" }}>Past sessions</p>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <History className="w-8 h-8" style={{ color: "rgba(245,240,232,0.08)" }} />
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.25)" }}>No past workouts yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-xl font-semibold tracking-tight mb-1" style={{ color: "#F5F0E8" }}>History</h2>
      <p className="text-xs mb-8" style={{ color: "rgba(245,240,232,0.35)" }}>{sessions.length} sessions</p>

      <div className="flex flex-col gap-3">
        {sessions.map((session) => {
          const isOpen = expanded.has(session.id);
          const uniqueExercises = [...new Set(session.session_sets.map((s) => s.exercises.name))];
          const totalVolume = session.session_sets.reduce((sum, s) => sum + (s.weight_lbs ?? 0) * (s.reps ?? 0), 0);

          // Group sets by exercise for expanded view
          const groups = new Map<string, { name: string; sets: SetRow[] }>();
          for (const set of session.session_sets) {
            if (!groups.has(set.exercise_id)) groups.set(set.exercise_id, { name: set.exercises.name, sets: [] });
            groups.get(set.exercise_id)!.sets.push(set);
          }

          return (
            <div key={session.id} className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.07)" }}>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <button onClick={() => toggle(session.id)} className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-semibold truncate pr-2" style={{ color: "#F5F0E8" }}>{session.name}</p>
                    {isOpen
                      ? <ChevronUp className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(245,240,232,0.3)" }} />
                      : <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(245,240,232,0.3)" }} />}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs" style={{ color: "rgba(245,240,232,0.4)" }}>
                      {new Date(session.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                    {session.session_sets.length > 0 && (
                      <>
                        <span style={{ color: "rgba(245,240,232,0.15)" }}>·</span>
                        <p className="text-xs" style={{ color: "rgba(245,240,232,0.4)" }}>
                          {uniqueExercises.length} exercises · {session.session_sets.length} sets
                          {totalVolume > 0 && ` · ${totalVolume.toLocaleString()} lbs`}
                        </p>
                      </>
                    )}
                  </div>
                </button>
                <button onClick={() => handleDelete(session.id)} disabled={isPending}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-all shrink-0">
                  <Trash2 className="w-3.5 h-3.5" style={{ color: "rgba(248,113,113,0.4)" }} />
                </button>
              </div>

              {isOpen && (
                <div className="px-4 pb-4 pt-2"
                  style={{ borderTop: "1px solid rgba(255,235,180,0.05)" }}>
                  {session.notes && (
                    <p className="text-xs mb-3 mt-1 italic" style={{ color: "rgba(245,240,232,0.45)" }}>{session.notes}</p>
                  )}
                  {session.session_sets.length === 0 ? (
                    <p className="text-xs" style={{ color: "rgba(245,240,232,0.25)" }}>No sets logged</p>
                  ) : (
                    Array.from(groups.values()).map(({ name, sets }) => (
                      <div key={name} className="mt-3">
                        <p className="text-xs font-semibold mb-2" style={{ color: "rgba(200,144,10,0.7)" }}>{name}</p>
                        <div className="flex flex-wrap gap-2">
                          {sets.map((set) => (
                            <span key={set.id} className="text-xs px-2.5 py-1 rounded-lg font-mono"
                              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(245,240,232,0.6)" }}>
                              {set.reps ?? "—"} × {set.weight_lbs != null ? `${set.weight_lbs}lbs` : "BW"}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
