"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, CalendarDays, Pencil, Check, X } from "lucide-react";
import { createDateAction, updateDateAction, deleteDateAction } from "@/app/actions/tracking";

interface ImportantDate {
  id: string; label: string; date: string; type: string; recurring: boolean;
}

const TYPES = ["birthday", "anniversary", "deadline", "other"] as const;
const TYPE_ICONS: Record<string, string> = {
  birthday: "🎂", anniversary: "💍", deadline: "⏰", other: "📌",
};

function daysUntil(dateStr: string, recurring: boolean, today: string): number {
  const t = new Date(today);
  let d = new Date(dateStr + "T12:00:00");

  if (recurring) {
    d = new Date(d);
    d.setFullYear(t.getFullYear());
    if (d < t) d.setFullYear(t.getFullYear() + 1);
  }

  return Math.ceil((d.getTime() - t.getTime()) / 86400000);
}

export function DatesSection({ dates: initial, today }: { dates: ImportantDate[]; today: string }) {
  const [dates, setDates] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", date: "", type: "other" as typeof TYPES[number], recurring: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: "", date: "", type: "other" as typeof TYPES[number], recurring: false });

  function startEdit(d: ImportantDate) {
    setEditingId(d.id);
    setEditForm({ label: d.label, date: d.date, type: d.type as typeof TYPES[number], recurring: d.recurring });
  }

  function handleUpdate() {
    if (!editingId || !editForm.label.trim() || !editForm.date) return;
    setDates((prev) => prev.map((d) => d.id === editingId ? { ...d, ...editForm } : d));
    const id = editingId;
    setEditingId(null);
    startTransition(() => updateDateAction(id, editForm.label.trim(), editForm.date, editForm.type, editForm.recurring));
  }

  function handleCreate() {
    if (!form.label.trim() || !form.date) return;
    startTransition(async () => {
      const res = await createDateAction(form.label.trim(), form.date, form.type, form.recurring);
      if ("error" in res) return;
      setDates((prev) => [...prev, { id: res.id, label: form.label.trim(), date: form.date, type: form.type, recurring: form.recurring }]);
      setForm({ label: "", date: "", type: "other", recurring: false });
      setShowForm(false);
    });
  }

  function handleDelete(id: string) {
    setDates((prev) => prev.filter((d) => d.id !== id));
    startTransition(() => deleteDateAction(id));
  }

  const sorted = [...dates].sort((a, b) => daysUntil(a.date, a.recurring, today) - daysUntil(b.date, b.recurring, today));
  const upcoming = sorted.filter((d) => daysUntil(d.date, d.recurring, today) >= 0);
  const past = sorted.filter((d) => daysUntil(d.date, d.recurring, today) < 0);

  return (
    <div className="p-4 md:p-8 max-w-2xl w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>Important Dates</h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>{upcoming.length} upcoming</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
          style={{ background: "rgba(200,144,10,0.12)", border: "1px solid rgba(200,144,10,0.3)", color: "#C8900A" }}>
          <Plus className="w-3.5 h-3.5" /> Add date
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,235,180,0.1)" }}>
          <input autoFocus value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Label (e.g. Mom's birthday)…" className="w-full bg-transparent text-sm outline-none mb-3"
            style={{ color: "#F5F0E8" }} />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg"
              style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)", colorScheme: "dark" }} />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof TYPES[number] })}
              className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg"
              style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)", background: "#0D0C0A" }}>
              {TYPES.map((t) => <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
              className="accent-[#C8900A]" />
            <span className="text-xs" style={{ color: "rgba(245,240,232,0.5)" }}>Recurring yearly</span>
          </label>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
              style={{ background: "rgba(200,144,10,0.2)", color: "#C8900A" }}>Add</button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-xs"
              style={{ color: "rgba(245,240,232,0.4)" }}>Cancel</button>
          </div>
        </div>
      )}

      {dates.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <CalendarDays className="w-8 h-8" style={{ color: "rgba(245,240,232,0.1)" }} />
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.25)" }}>Add birthdays, deadlines, anniversaries</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {upcoming.map((d) => {
            const days = daysUntil(d.date, d.recurring, today);
            return <DateRow key={d.id} date={d} daysUntil={days} onDelete={handleDelete} onEdit={() => startEdit(d)} isEditing={editingId === d.id} editForm={editForm} setEditForm={setEditForm} onSave={handleUpdate} onCancel={() => setEditingId(null)} />;
          })}
          {past.length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-widest mt-4 px-1" style={{ color: "rgba(245,240,232,0.2)" }}>Past</p>
              {past.map((d) => {
                const days = daysUntil(d.date, d.recurring, today);
                return <DateRow key={d.id} date={d} daysUntil={days} onDelete={handleDelete} onEdit={() => startEdit(d)} isEditing={editingId === d.id} editForm={editForm} setEditForm={setEditForm} onSave={handleUpdate} onCancel={() => setEditingId(null)} />;
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DateRow({ date, daysUntil: days, onDelete, onEdit, isEditing, editForm, setEditForm, onSave, onCancel }: {
  date: ImportantDate; daysUntil: number; onDelete: (id: string) => void;
  onEdit: () => void; isEditing: boolean;
  editForm: { label: string; date: string; type: typeof TYPES[number]; recurring: boolean };
  setEditForm: (f: { label: string; date: string; type: typeof TYPES[number]; recurring: boolean }) => void;
  onSave: () => void; onCancel: () => void;
}) {
  const urgent = days >= 0 && days <= 7;
  const isToday = days === 0;

  if (isEditing) {
    return (
      <div className="p-4 rounded-2xl" style={{ background: "rgba(200,144,10,0.05)", border: "1px solid rgba(200,144,10,0.2)" }}>
        <input autoFocus value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
          placeholder="Label…" className="w-full bg-transparent text-sm font-medium outline-none mb-3"
          style={{ color: "#F5F0E8" }} />
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
            className="bg-transparent text-sm outline-none px-3 py-1.5 rounded-lg"
            style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.12)", colorScheme: "dark" }} />
          <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as typeof TYPES[number] })}
            className="bg-transparent text-sm outline-none px-3 py-1.5 rounded-lg"
            style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.12)", background: "#0D0C0A" }}>
            {TYPES.map((t) => <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 mb-3 cursor-pointer">
          <input type="checkbox" checked={editForm.recurring} onChange={(e) => setEditForm({ ...editForm, recurring: e.target.checked })}
            className="accent-[#C8900A]" />
          <span className="text-xs" style={{ color: "rgba(245,240,232,0.5)" }}>Recurring yearly</span>
        </label>
        <div className="flex gap-2">
          <button onClick={onSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "rgba(200,144,10,0.2)", color: "#C8900A" }}>
            <Check className="w-3 h-3" /> Save
          </button>
          <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{ color: "rgba(245,240,232,0.4)" }}>
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-4 px-4 py-3 rounded-2xl transition-colors"
      style={{
        background: isToday ? "rgba(200,144,10,0.07)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${isToday ? "rgba(200,144,10,0.2)" : "rgba(255,235,180,0.06)"}`,
      }}>
      <span className="text-lg w-8 text-center shrink-0">{TYPE_ICONS[date.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "#F5F0E8" }}>{date.label}</p>
        <p className="text-[10px] mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>
          {new Date(date.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: date.recurring ? undefined : "numeric" })}
          {date.recurring && " · yearly"}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {days === 0 ? (
          <span className="text-xs font-semibold" style={{ color: "#C8900A" }}>Today! 🎉</span>
        ) : days > 0 ? (
          <span className="text-xs font-medium" style={{ color: urgent ? "#FBBF24" : "rgba(245,240,232,0.4)" }}>
            {days}d away
          </span>
        ) : (
          <span className="text-xs" style={{ color: "rgba(245,240,232,0.2)" }}>{Math.abs(days)}d ago</span>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button onClick={onEdit} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-[rgba(200,144,10,0.1)]">
          <Pencil className="w-3 h-3" style={{ color: "rgba(200,144,10,0.6)" }} />
        </button>
        <button onClick={() => onDelete(date.id)}
          className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-500/10">
          <Trash2 className="w-3 h-3" style={{ color: "rgba(248,113,113,0.5)" }} />
        </button>
      </div>
    </div>
  );
}
