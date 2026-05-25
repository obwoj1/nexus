"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Target, Pencil, Check, X } from "lucide-react";
import { createGoalAction, updateGoalProgressAction, updateGoalAction, deleteGoalAction } from "@/app/actions/tracking";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Goal {
  id: string; title: string; description: string | null;
  target_date: string | null; progress: number; status: string;
}

export function GoalsSection({ goals: initial }: { goals: Goal[] }) {
  const [goals, setGoals] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", target_date: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", target_date: "" });

  function handleCreate() {
    if (!form.title.trim()) return;
    startTransition(async () => {
      const res = await createGoalAction(form.title.trim(), form.description, form.target_date || null);
      if ("error" in res) return;
      setGoals((prev) => [...prev, {
        id: res.id, title: form.title.trim(), description: form.description || null,
        target_date: form.target_date || null, progress: 0, status: "active",
      }]);
      setForm({ title: "", description: "", target_date: "" });
      setShowForm(false);
    });
  }

  function startEdit(goal: Goal) {
    setEditingId(goal.id);
    setEditForm({ title: goal.title, description: goal.description ?? "", target_date: goal.target_date ?? "" });
  }

  function handleUpdate() {
    if (!editingId || !editForm.title.trim()) return;
    setGoals((prev) => prev.map((g) => g.id === editingId ? { ...g, title: editForm.title.trim(), description: editForm.description || null, target_date: editForm.target_date || null } : g));
    const id = editingId;
    setEditingId(null);
    startTransition(() => updateGoalAction(id, editForm.title.trim(), editForm.description, editForm.target_date || null));
  }

  function handleProgress(id: string, progress: number) {
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, progress, status: progress === 100 ? "completed" : "active" } : g));
    startTransition(() => updateGoalProgressAction(id, progress));
  }

  function handleDelete(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    startTransition(() => deleteGoalAction(id));
  }

  const active = goals.filter((g) => g.status !== "completed");
  const completed = goals.filter((g) => g.status === "completed");

  const goalChartData = goals.map((g) => ({
    name: g.title.length > 16 ? g.title.slice(0, 16) + "…" : g.title,
    progress: g.progress,
    done: g.status === "completed",
  }));

  return (
    <div className="p-4 md:p-8 max-w-3xl w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>Goals</h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>
            {active.length} active · {completed.length} completed
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
          style={{ background: "rgba(200,144,10,0.12)", border: "1px solid rgba(200,144,10,0.3)", color: "#C8900A" }}>
          <Plus className="w-3.5 h-3.5" /> New goal
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,235,180,0.1)" }}>
          <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Goal title…" className="w-full bg-transparent text-sm outline-none mb-2"
            style={{ color: "#F5F0E8" }} />
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description (optional)…" className="w-full bg-transparent text-xs outline-none mb-3"
            style={{ color: "rgba(245,240,232,0.5)" }} />
          <div className="flex items-center gap-3 mb-3">
            <label className="text-xs" style={{ color: "rgba(245,240,232,0.4)" }}>Target date</label>
            <input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })}
              className="bg-transparent text-xs outline-none px-2 py-1 rounded-lg"
              style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)", colorScheme: "dark" }} />
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

      {goals.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Target className="w-8 h-8" style={{ color: "rgba(245,240,232,0.1)" }} />
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.25)" }}>Set a goal to start tracking progress</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {active.map((goal) => <GoalCard key={goal.id} goal={goal} onProgress={handleProgress} onDelete={handleDelete} onEdit={() => startEdit(goal)} isEditing={editingId === goal.id} editForm={editForm} setEditForm={setEditForm} onSaveEdit={handleUpdate} onCancelEdit={() => setEditingId(null)} />)}
          {completed.length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-widest mt-4 px-1" style={{ color: "rgba(245,240,232,0.25)" }}>Completed</p>
              {completed.map((goal) => <GoalCard key={goal.id} goal={goal} onProgress={handleProgress} onDelete={handleDelete} onEdit={() => startEdit(goal)} isEditing={editingId === goal.id} editForm={editForm} setEditForm={setEditForm} onSaveEdit={handleUpdate} onCancelEdit={() => setEditingId(null)} />)}
            </>
          )}
        </div>
      )}

      {/* Chart */}
      {goals.length > 0 && (
        <div className="mt-10">
          <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "rgba(245,240,232,0.25)" }}>Progress overview</p>
          <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
            <ResponsiveContainer width="100%" height={Math.max(120, goalChartData.length * 36)}>
              <BarChart data={goalChartData} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,235,180,0.06)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "rgba(245,240,232,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fill: "rgba(245,240,232,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip
                  contentStyle={{ background: "#0D0C0A", border: "1px solid rgba(200,144,10,0.25)", borderRadius: 8, padding: "6px 10px" }}
                  formatter={(v) => [`${v}%`, "Progress"]}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar dataKey="progress" radius={[0, 3, 3, 0]} maxBarSize={20}>
                  {goalChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.done ? "#4ADE80" : "#C8900A"} fillOpacity={entry.done ? 0.7 : 0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal, onProgress, onDelete, onEdit, isEditing, editForm, setEditForm, onSaveEdit, onCancelEdit }: {
  goal: Goal;
  onProgress: (id: string, p: number) => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
  isEditing: boolean;
  editForm: { title: string; description: string; target_date: string };
  setEditForm: (f: { title: string; description: string; target_date: string }) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  const done = goal.status === "completed";
  const daysLeft = goal.target_date
    ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000)
    : null;

  if (isEditing) {
    return (
      <div className="p-4 rounded-2xl" style={{ background: "rgba(200,144,10,0.05)", border: "1px solid rgba(200,144,10,0.2)" }}>
        <input autoFocus value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
          placeholder="Goal title…" className="w-full bg-transparent text-sm font-medium outline-none mb-2"
          style={{ color: "#F5F0E8" }} />
        <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          placeholder="Description (optional)…" className="w-full bg-transparent text-xs outline-none mb-3"
          style={{ color: "rgba(245,240,232,0.5)" }} />
        <div className="flex items-center gap-3 mb-3">
          <label className="text-xs" style={{ color: "rgba(245,240,232,0.4)" }}>Target date</label>
          <input type="date" value={editForm.target_date} onChange={(e) => setEditForm({ ...editForm, target_date: e.target.value })}
            className="bg-transparent text-xs outline-none px-2 py-1 rounded-lg"
            style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)", colorScheme: "dark" }} />
        </div>
        <div className="flex gap-2">
          <button onClick={onSaveEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "rgba(200,144,10,0.2)", color: "#C8900A" }}>
            <Check className="w-3 h-3" /> Save
          </button>
          <button onClick={onCancelEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{ color: "rgba(245,240,232,0.4)" }}>
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group p-4 rounded-2xl transition-colors"
      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${done ? "rgba(74,222,128,0.15)" : "rgba(255,235,180,0.06)"}` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-sm font-medium" style={{ color: done ? "rgba(74,222,128,0.8)" : "#F5F0E8" }}>{goal.title}</p>
          {goal.description && <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(245,240,232,0.4)" }}>{goal.description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {daysLeft !== null && !done && (
            <span className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: daysLeft < 7 ? "rgba(248,113,113,0.1)" : "rgba(255,255,255,0.05)", color: daysLeft < 7 ? "#F87171" : "rgba(245,240,232,0.4)" }}>
              {daysLeft > 0 ? `${daysLeft}d left` : "overdue"}
            </span>
          )}
          {done && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(74,222,128,0.1)", color: "#4ADE80" }}>Done</span>}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button onClick={onEdit}
              className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-[rgba(200,144,10,0.1)]">
              <Pencil className="w-3 h-3" style={{ color: "rgba(200,144,10,0.6)" }} />
            </button>
            <button onClick={() => onDelete(goal.id)}
              className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-500/10">
              <Trash2 className="w-3 h-3" style={{ color: "rgba(248,113,113,0.5)" }} />
            </button>
          </div>
        </div>
      </div>
      {/* Progress bar + slider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${goal.progress}%`, background: done ? "#4ADE80" : "linear-gradient(90deg,#C8900A,#F5CE58)" }} />
        </div>
        <span className="text-xs font-mono w-8 text-right" style={{ color: done ? "#4ADE80" : "#C8900A" }}>{goal.progress}%</span>
        <input type="range" min={0} max={100} step={5} value={goal.progress}
          onChange={(e) => onProgress(goal.id, parseInt(e.target.value))}
          className="w-24 accent-[#C8900A] cursor-pointer" />
      </div>
    </div>
  );
}
