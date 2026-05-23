"use client";

import { useState, useTransition, useMemo, useEffect, useRef } from "react";
import { Plus, Trash2, Dumbbell, ChevronDown, X } from "lucide-react";
import {
  createSessionAction, addSetAction, deleteSetAction,
  updateSessionAction, deleteSessionAction, createCustomExerciseAction,
} from "@/app/actions/workouts";

interface Exercise { id: string; name: string; muscle_group: string; equipment: string; type: string; }
interface SetItem { id: string; set_number: number; reps: number | null; weight_lbs: number | null; exercise_id: string; exercise: Exercise; }
interface SessionState { id: string; name: string; date: string; duration_minutes: number | null; notes: string | null; sets: SetItem[]; }
interface Template { id: string; name: string; template_exercises: { exercise_id: string; display_order: number; exercises: Exercise }[]; }

function groupByExercise(sets: SetItem[]) {
  const map = new Map<string, { exercise: Exercise; sets: SetItem[] }>();
  for (const set of sets) {
    if (!map.has(set.exercise_id)) map.set(set.exercise_id, { exercise: set.exercise, sets: [] });
    map.get(set.exercise_id)!.sets.push(set);
  }
  return Array.from(map.values());
}

interface RecentSet { reps: number | null; weight_lbs: number | null; exercise_id: string; }
interface RecentSession { session_sets: RecentSet[]; date: string; }

export function LogSection({
  exercises, todaySession: initialSession, today, templates, recentSessions = [],
}: {
  exercises: Exercise[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  todaySession: any;
  today: string;
  templates: Template[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recentSessions?: any[];
}) {
  const [session, setSession] = useState<SessionState | null>(() => {
    if (!initialSession) return null;
    return {
      id: initialSession.id,
      name: initialSession.name,
      date: initialSession.date,
      duration_minutes: initialSession.duration_minutes,
      notes: initialSession.notes ?? null,
      sets: (initialSession.session_sets ?? []).map((s: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: s.id, set_number: s.set_number, reps: s.reps,
        weight_lbs: s.weight_lbs, exercise_id: s.exercise_id, exercise: s.exercises,
      })),
    };
  });

  const [pendingExercises, setPendingExercises] = useState<Exercise[]>([]);
  const [draftSets, setDraftSets] = useState<Record<string, { reps: string; weight: string }>>({});
  const [notesValue, setNotesValue] = useState(initialSession?.notes ?? "");
  const [showPicker, setShowPicker] = useState(false);
  const [customCreate, setCustomCreate] = useState(false);
  const [customMuscle, setCustomMuscle] = useState("Chest");
  const [customEquipment, setCustomEquipment] = useState("Barbell");
  const [customType, setCustomType] = useState("strength");
  const [pickerSearch, setPickerSearch] = useState("");
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [nameEdit, setNameEdit] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [elapsed, setElapsed] = useState(0); // seconds since session start
  const startedAtRef = useRef<number>(Date.now());
  const [newPRExercise, setNewPRExercise] = useState<string | null>(null);

  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") { setShowPicker(false); setPickerSearch(""); } }
    function onClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false); setPickerSearch("");
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClickOutside); };
  }, [showPicker]);

  useEffect(() => {
    if (!session) return;
    startedAtRef.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [session?.id]);

  const elapsedLabel = (() => {
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  })();

  function finishWorkout() {
    if (!session) return;
    const mins = Math.round(elapsed / 60) || 1;
    startTransition(() => updateSessionAction(session.id, { duration_minutes: mins }));
    setSession((prev) => prev ? { ...prev, duration_minutes: mins } : prev);
  }

  // Build last-time sets map: exerciseId → sets from most recent session that included it
  const lastTimeSets = useMemo(() => {
    const map: Record<string, { reps: number | null; weight_lbs: number | null }[]> = {};
    const sorted = [...(recentSessions as RecentSession[])].sort((a, b) => b.date.localeCompare(a.date));
    for (const s of sorted) {
      for (const set of s.session_sets) {
        if (!map[set.exercise_id]) map[set.exercise_id] = [];
        map[set.exercise_id].push({ reps: set.reps, weight_lbs: set.weight_lbs });
      }
    }
    return map;
  }, [recentSessions]);

  const exerciseGroups = useMemo(() => groupByExercise(session?.sets ?? []), [session?.sets]);
  const setExIds = useMemo(() => new Set(exerciseGroups.map((g) => g.exercise.id)), [exerciseGroups]);
  const pendingNotInSets = pendingExercises.filter((e) => !setExIds.has(e.id));

  const exercisesByMuscle = useMemo(() => {
    const map = new Map<string, Exercise[]>();
    exercises.forEach((e) => {
      if (!map.has(e.muscle_group)) map.set(e.muscle_group, []);
      map.get(e.muscle_group)!.push(e);
    });
    return map;
  }, [exercises]);

  const filteredExercises = pickerSearch
    ? exercises.filter((e) => e.name.toLowerCase().includes(pickerSearch.toLowerCase()))
    : null;

  const todayLabel = new Date(today + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const weekday = new Date(today + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });

  const [actionError, setActionError] = useState<string | null>(null);

  function startWorkout(name: string, templateId?: string) {
    setActionError(null);
    startTransition(async () => {
      const res = await createSessionAction(name, today, templateId);
      if ("error" in res) { setActionError(res.error ?? "Unknown error"); return; }
      setSession({ id: res.id, name, date: today, duration_minutes: null, notes: null, sets: [] });
      if (templateId) {
        const tmpl = templates.find((t) => t.id === templateId);
        if (tmpl) {
          const sorted = [...tmpl.template_exercises].sort((a, b) => a.display_order - b.display_order);
          setPendingExercises(sorted.map((te) => te.exercises));
          const drafts: Record<string, { reps: string; weight: string }> = {};
          sorted.forEach((te) => { drafts[te.exercise_id] = { reps: "", weight: "" }; });
          setDraftSets(drafts);
        }
      }
      setShowTemplateMenu(false);
    });
  }

  function addExercise(exercise: Exercise) {
    if (setExIds.has(exercise.id) || pendingExercises.some((e) => e.id === exercise.id)) return;
    setPendingExercises((prev) => [...prev, exercise]);
    setDraftSets((prev) => ({ ...prev, [exercise.id]: { reps: "", weight: "" } }));
    setShowPicker(false);
    setPickerSearch("");
  }

  function logSet(exerciseId: string) {
    if (!session) return;
    const draft = draftSets[exerciseId];
    if (!draft?.reps && !draft?.weight) return;
    const existingCount = session.sets.filter((s) => s.exercise_id === exerciseId).length;
    const reps = draft.reps ? parseInt(draft.reps) : null;
    const weight = draft.weight ? parseFloat(draft.weight) : null;

    startTransition(async () => {
      const res = await addSetAction(session.id, exerciseId, existingCount + 1, reps, weight);
      if ("error" in res) return;
      const exercise =
        pendingExercises.find((e) => e.id === exerciseId) ??
        exerciseGroups.find((g) => g.exercise.id === exerciseId)?.exercise;
      if (!exercise) return;
      const newSet: SetItem = { id: res.id, set_number: existingCount + 1, reps, weight_lbs: weight, exercise_id: exerciseId, exercise };
      setSession((prev) => prev ? { ...prev, sets: [...prev.sets, newSet] } : prev);
      setPendingExercises((prev) => prev.filter((e) => e.id !== exerciseId));
      // PR detection — new weight beats all previous sessions
      if (weight && weight > 0) {
        const prevMax = (lastTimeSets[exerciseId] ?? []).reduce((m, s) => Math.max(m, s.weight_lbs ?? 0), 0);
        if (weight > prevMax && prevMax > 0) {
          setNewPRExercise(exerciseId);
          setTimeout(() => setNewPRExercise(null), 4000);
        }
      }
    });
  }

  function removeSet(setId: string) {
    setSession((prev) => prev ? { ...prev, sets: prev.sets.filter((s) => s.id !== setId) } : prev);
    startTransition(() => deleteSetAction(setId));
  }

  function removeExercise(exerciseId: string) {
    const toDelete = session?.sets.filter((s) => s.exercise_id === exerciseId) ?? [];
    setSession((prev) => prev ? { ...prev, sets: prev.sets.filter((s) => s.exercise_id !== exerciseId) } : prev);
    setPendingExercises((prev) => prev.filter((e) => e.id !== exerciseId));
    startTransition(async () => { for (const s of toDelete) await deleteSetAction(s.id); });
  }

  function saveName() {
    if (!session || !editedName.trim()) { setNameEdit(false); return; }
    setSession((prev) => prev ? { ...prev, name: editedName.trim() } : prev);
    setNameEdit(false);
    startTransition(() => updateSessionAction(session.id, { name: editedName.trim() }));
  }

  function handleCreateCustom() {
    if (!pickerSearch.trim()) return;
    startTransition(async () => {
      const res = await createCustomExerciseAction(pickerSearch.trim(), customMuscle, customEquipment, customType);
      if ("error" in res) return;
      const newEx: Exercise = { id: res.id, name: pickerSearch.trim(), muscle_group: customMuscle, equipment: customEquipment, type: customType };
      addExercise(newEx);
      setCustomCreate(false);
      setCustomMuscle("Chest"); setCustomEquipment("Barbell"); setCustomType("strength");
    });
  }

  function saveNotes() {
    if (!session) return;
    const notes = notesValue.trim() || null;
    startTransition(() => updateSessionAction(session.id, { notes }));
  }

  function removeSession() {
    if (!session) return;
    const id = session.id;
    setSession(null);
    setPendingExercises([]);
    startTransition(() => deleteSessionAction(id));
  }

  const totalSets = session?.sets.length ?? 0;
  const totalVolume = (session?.sets ?? []).reduce((s, r) => s + (r.weight_lbs ?? 0) * (r.reps ?? 0), 0);

  // ── No session today ──────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h2 className="text-xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>Log</h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>{todayLabel}</p>
        </div>
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <Dumbbell className="w-10 h-10" style={{ color: "rgba(245,240,232,0.08)" }} />
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.3)" }}>No workout logged yet today</p>
          {actionError && (
            <p className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "#F87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
              {actionError}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => startWorkout(`${weekday} Workout`)}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
              style={{ background: "rgba(200,144,10,0.15)", border: "1px solid rgba(200,144,10,0.3)", color: "#C8900A" }}
            >
              <Plus className="w-4 h-4" /> Start Workout
            </button>
            {templates.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowTemplateMenu((v) => !v)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,235,180,0.1)", color: "rgba(245,240,232,0.5)" }}
                >
                  Use Template <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showTemplateMenu && (
                  <div className="absolute top-full mt-1 left-0 w-52 py-1 rounded-xl z-10"
                    style={{ background: "#0D0C0A", border: "1px solid rgba(200,144,10,0.2)" }}>
                    {templates.map((t) => (
                      <button key={t.id} onClick={() => startWorkout(t.name, t.id)}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/5 transition-colors"
                        style={{ color: "#F5F0E8" }}>
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Active session ────────────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-1.5">
        {nameEdit ? (
          <input
            autoFocus value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setNameEdit(false); }}
            className="text-xl font-semibold bg-transparent outline-none"
            style={{ color: "#F5F0E8", borderBottom: "1px solid rgba(200,144,10,0.4)" }}
          />
        ) : (
          <button onClick={() => { setEditedName(session.name); setNameEdit(true); }}
            className="text-xl font-semibold tracking-tight hover:opacity-60 transition-opacity text-left"
            style={{ color: "#F5F0E8" }}>
            {session.name}
          </button>
        )}
        <button onClick={removeSession}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-all mt-0.5">
          <Trash2 className="w-3.5 h-3.5" style={{ color: "rgba(248,113,113,0.5)" }} />
        </button>
      </div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-xs" style={{ color: "rgba(245,240,232,0.35)" }}>{todayLabel}</p>
          <span style={{ color: "rgba(245,240,232,0.15)" }}>·</span>
          <p className="text-xs font-mono" style={{ color: "rgba(200,144,10,0.7)" }}>{elapsedLabel}</p>
          {totalSets > 0 && (
            <>
              <span style={{ color: "rgba(245,240,232,0.15)" }}>·</span>
              <p className="text-xs" style={{ color: "rgba(245,240,232,0.35)" }}>{totalSets} sets</p>
              {totalVolume > 0 && (
                <>
                  <span style={{ color: "rgba(245,240,232,0.15)" }}>·</span>
                  <p className="text-xs" style={{ color: "rgba(245,240,232,0.35)" }}>{totalVolume.toLocaleString()} lbs</p>
                </>
              )}
            </>
          )}
        </div>
        {session.duration_minutes ? (
          <p className="text-xs px-3 py-1 rounded-lg" style={{ background: "rgba(74,222,128,0.08)", color: "rgba(74,222,128,0.7)", border: "1px solid rgba(74,222,128,0.15)" }}>
            Finished · {session.duration_minutes}m
          </p>
        ) : (
          <button onClick={finishWorkout} disabled={isPending}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-40"
            style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "rgba(74,222,128,0.8)" }}>
            Finish
          </button>
        )}
      </div>

      {/* Session notes */}
      <textarea
        value={notesValue}
        onChange={(e) => setNotesValue(e.target.value)}
        onBlur={saveNotes}
        placeholder="Session notes…"
        rows={2}
        className="w-full bg-transparent text-sm outline-none resize-none mb-6 px-3 py-2.5 rounded-xl"
        style={{ color: "rgba(245,240,232,0.7)", border: "1px solid rgba(255,235,180,0.08)" }}
      />

      {/* Exercise blocks */}
      <div className="flex flex-col gap-4">
        {exerciseGroups.map(({ exercise, sets }) => (
          <ExerciseBlock
            key={exercise.id} exercise={exercise} sets={sets}
            draft={draftSets[exercise.id] ?? { reps: "", weight: "" }}
            onDraftChange={(d) => setDraftSets((prev) => ({ ...prev, [exercise.id]: d }))}
            onLogSet={() => logSet(exercise.id)}
            onDeleteSet={removeSet}
            onRemove={() => removeExercise(exercise.id)}
            isPending={isPending}
            lastSets={lastTimeSets[exercise.id]}
            isPR={newPRExercise === exercise.id}
          />
        ))}
        {pendingNotInSets.map((exercise) => (
          <ExerciseBlock
            key={exercise.id} exercise={exercise} sets={[]}
            draft={draftSets[exercise.id] ?? { reps: "", weight: "" }}
            onDraftChange={(d) => setDraftSets((prev) => ({ ...prev, [exercise.id]: d }))}
            onLogSet={() => logSet(exercise.id)}
            onDeleteSet={removeSet}
            onRemove={() => removeExercise(exercise.id)}
            isPending={isPending}
            lastSets={lastTimeSets[exercise.id]}
            isPR={newPRExercise === exercise.id}
          />
        ))}
      </div>

      {/* Add Exercise */}
      <div className="mt-6 relative">
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,235,180,0.1)", color: "rgba(245,240,232,0.5)" }}
        >
          <Plus className="w-4 h-4" /> Add Exercise
        </button>

        {showPicker && (
          <div ref={pickerRef} className="absolute top-full mt-2 left-0 w-80 rounded-2xl z-20 max-h-[400px] overflow-y-auto"
            style={{ background: "#0D0C0A", border: "1px solid rgba(200,144,10,0.2)" }}>
            <div className="p-3 sticky top-0" style={{ background: "#0D0C0A", borderBottom: "1px solid rgba(200,144,10,0.1)" }}>
              <input
                autoFocus value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Search exercises…"
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: "#F5F0E8" }}
              />
            </div>
            <div className="p-2">
              {filteredExercises ? (
                filteredExercises.length === 0
                  ? (
                    <div className="p-3">
                      {!customCreate ? (
                        <button onClick={() => setCustomCreate(true)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all"
                          style={{ background: "rgba(200,144,10,0.08)", border: "1px solid rgba(200,144,10,0.2)", color: "#C8900A" }}>
                          <Plus className="w-3.5 h-3.5" /> Create &ldquo;{pickerSearch}&rdquo; as custom exercise
                        </button>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(200,144,10,0.6)" }}>New: {pickerSearch}</p>
                          {(["Muscle group", "Equipment", "Type"] as const).map((label) => {
                            const opts = label === "Muscle group"
                              ? ["Chest","Back","Legs","Shoulders","Arms","Core","Cardio"]
                              : label === "Equipment"
                              ? ["Barbell","Dumbbell","Bodyweight","Cable","Machine","Other"]
                              : ["strength","cardio","bodyweight"];
                            const val = label === "Muscle group" ? customMuscle : label === "Equipment" ? customEquipment : customType;
                            const setter = label === "Muscle group" ? setCustomMuscle : label === "Equipment" ? setCustomEquipment : setCustomType;
                            return (
                              <div key={label}>
                                <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "rgba(245,240,232,0.3)" }}>{label}</p>
                                <select value={val} onChange={(e) => setter(e.target.value)}
                                  className="w-full bg-transparent text-xs outline-none px-2 py-1.5 rounded-lg"
                                  style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)", colorScheme: "dark" }}>
                                  {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                              </div>
                            );
                          })}
                          <div className="flex gap-2 mt-1">
                            <button onClick={handleCreateCustom} disabled={isPending}
                              className="flex-1 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                              style={{ background: "rgba(200,144,10,0.15)", border: "1px solid rgba(200,144,10,0.3)", color: "#C8900A" }}>
                              {isPending ? "Creating…" : "Create & Add"}
                            </button>
                            <button onClick={() => setCustomCreate(false)}
                              className="px-3 py-1.5 rounded-lg text-xs"
                              style={{ color: "rgba(245,240,232,0.4)" }}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                  : filteredExercises.map((e) => (
                    <button key={e.id} onClick={() => addExercise(e)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors flex items-center justify-between"
                      style={{ color: setExIds.has(e.id) || pendingExercises.some((p) => p.id === e.id) ? "rgba(245,240,232,0.25)" : "#F5F0E8" }}>
                      <span>{e.name}</span>
                      <span className="text-[10px]" style={{ color: "rgba(245,240,232,0.3)" }}>{e.muscle_group}</span>
                    </button>
                  ))
              ) : (
                Array.from(exercisesByMuscle.entries()).map(([muscle, exes]) => (
                  <div key={muscle} className="mb-2">
                    <p className="text-[10px] uppercase tracking-widest px-3 py-1.5" style={{ color: "rgba(200,144,10,0.6)" }}>{muscle}</p>
                    {exes.map((e) => (
                      <button key={e.id} onClick={() => addExercise(e)}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-sm hover:bg-white/5 transition-colors flex items-center justify-between"
                        style={{ color: setExIds.has(e.id) || pendingExercises.some((p) => p.id === e.id) ? "rgba(245,240,232,0.25)" : "#F5F0E8" }}>
                        <span>{e.name}</span>
                        <span className="text-[10px]" style={{ color: "rgba(245,240,232,0.3)" }}>{e.equipment}</span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExerciseBlock({ exercise, sets, draft, onDraftChange, onLogSet, onDeleteSet, onRemove, isPending, lastSets, isPR }: {
  exercise: Exercise;
  sets: SetItem[];
  draft: { reps: string; weight: string };
  onDraftChange: (d: { reps: string; weight: string }) => void;
  onLogSet: () => void;
  onDeleteSet: (id: string) => void;
  onRemove: () => void;
  isPending: boolean;
  lastSets?: { reps: number | null; weight_lbs: number | null }[];
  isPR?: boolean;
}) {
  const lastLabel = lastSets?.length
    ? lastSets.map((s) => `${s.reps ?? "—"}×${s.weight_lbs != null ? `${s.weight_lbs}` : "BW"}`).join("  ")
    : null;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.07)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: sets.length > 0 ? "1px solid rgba(255,235,180,0.05)" : "none" }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold" style={{ color: "#F5F0E8" }}>{exercise.name}</p>
            {isPR && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md tracking-wide"
                style={{ background: "rgba(200,144,10,0.2)", color: "#F5CE58", border: "1px solid rgba(200,144,10,0.4)" }}>
                NEW PR
              </span>
            )}
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: "rgba(200,144,10,0.6)" }}>
            {exercise.muscle_group} · {exercise.equipment}
          </p>
          {lastLabel && (
            <p className="text-[10px] mt-1 font-mono" style={{ color: "rgba(245,240,232,0.3)" }}>
              Last: {lastLabel}
            </p>
          )}
        </div>

        <button onClick={onRemove}
          className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-all">
          <X className="w-3.5 h-3.5" style={{ color: "rgba(248,113,113,0.4)" }} />
        </button>
      </div>

      {/* Logged sets */}
      {sets.length > 0 && (
        <div className="px-4 py-2">
          <div className="grid grid-cols-[28px_1fr_1fr_20px] gap-2 px-1 mb-1.5">
            {["#", "Reps", "Weight", ""].map((h) => (
              <p key={h} className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(245,240,232,0.22)" }}>{h}</p>
            ))}
          </div>
          {sets.map((set) => (
            <div key={set.id} className="grid grid-cols-[28px_1fr_1fr_20px] gap-2 items-center py-1">
              <span className="text-[10px] font-mono text-center" style={{ color: "rgba(245,240,232,0.25)" }}>{set.set_number}</span>
              <span className="text-sm" style={{ color: "#F5F0E8" }}>{set.reps ?? "—"}</span>
              <span className="text-sm" style={{ color: "#F5F0E8" }}>{set.weight_lbs != null ? `${set.weight_lbs} lbs` : "BW"}</span>
              <button onClick={() => onDeleteSet(set.id)}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/10 transition-all">
                <X className="w-2.5 h-2.5" style={{ color: "rgba(248,113,113,0.4)" }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* New set input row */}
      <div className="px-4 pb-4 pt-3 flex items-center gap-2"
        style={{ borderTop: sets.length > 0 ? "1px solid rgba(255,235,180,0.04)" : "none" }}>
        <span className="text-[10px] font-mono w-7 text-center shrink-0" style={{ color: "rgba(245,240,232,0.2)" }}>
          {sets.length + 1}
        </span>
        <input
          type="number" min="0" value={draft.reps}
          onChange={(e) => onDraftChange({ ...draft, reps: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && onLogSet()}
          placeholder="reps"
          className="flex-1 bg-transparent text-sm outline-none text-center py-1.5 rounded-lg"
          style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)" }}
        />
        <input
          type="number" min="0" step="2.5" value={draft.weight}
          onChange={(e) => onDraftChange({ ...draft, weight: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && onLogSet()}
          placeholder="lbs"
          className="flex-1 bg-transparent text-sm outline-none text-center py-1.5 rounded-lg"
          style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)" }}
        />
        <button
          onClick={onLogSet}
          disabled={isPending || (!draft.reps && !draft.weight)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
          style={{ background: "rgba(200,144,10,0.15)", border: "1px solid rgba(200,144,10,0.3)", color: "#C8900A" }}
        >
          Log
        </button>
      </div>
    </div>
  );
}
