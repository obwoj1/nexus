"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, BookOpen, X } from "lucide-react";
import { createTemplateAction, deleteTemplateAction, removeExerciseFromTemplateAction } from "@/app/actions/workouts";

interface Exercise { id: string; name: string; muscle_group: string; equipment: string; type: string; }
interface TemplateExercise { id: string; exercise_id: string; display_order: number; exercises: Exercise; }
interface Template { id: string; name: string; template_exercises: TemplateExercise[]; }

export function TemplatesSection({ templates: initial, exercises }: { templates: Template[]; exercises: Exercise[] }) {
  const [templates, setTemplates] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [selected, setSelected] = useState<Exercise[]>([]);
  const [exSearch, setExSearch] = useState("");

  const filteredExercises = exSearch
    ? exercises.filter((e) => e.name.toLowerCase().includes(exSearch.toLowerCase()))
    : exercises;

  function handleCreate() {
    if (!newName.trim() || selected.length === 0) return;
    startTransition(async () => {
      const res = await createTemplateAction(newName.trim(), selected.map((e) => e.id));
      if ("error" in res) return;
      setTemplates((prev) => [...prev, {
        id: res.id,
        name: newName.trim(),
        template_exercises: selected.map((e, i) => ({
          id: `local-${i}`,
          exercise_id: e.id,
          display_order: i,
          exercises: e,
        })),
      }]);
      setNewName(""); setSelected([]); setExSearch(""); setShowForm(false);
    });
  }

  function handleDeleteTemplate(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    startTransition(() => deleteTemplateAction(id));
  }

  function handleRemoveExercise(templateId: string, teId: string) {
    setTemplates((prev) => prev.map((t) =>
      t.id !== templateId ? t
        : { ...t, template_exercises: t.template_exercises.filter((te) => te.id !== teId) }
    ));
    startTransition(() => removeExerciseFromTemplateAction(teId));
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>Templates</h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>Saved workout plans</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
          style={{ background: "rgba(200,144,10,0.12)", border: "1px solid rgba(200,144,10,0.3)", color: "#C8900A" }}>
          <Plus className="w-3.5 h-3.5" /> New template
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6 p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,235,180,0.1)" }}>
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Template name (e.g. Push Day A)…"
            className="w-full bg-transparent text-sm outline-none mb-4"
            style={{ color: "#F5F0E8" }} />

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selected.map((e, i) => (
                <div key={e.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
                  style={{ background: "rgba(200,144,10,0.1)", border: "1px solid rgba(200,144,10,0.2)", color: "#C8900A" }}>
                  <span>{i + 1}. {e.name}</span>
                  <button onClick={() => setSelected((prev) => prev.filter((x) => x.id !== e.id))}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input value={exSearch} onChange={(e) => setExSearch(e.target.value)}
            placeholder="Search and add exercises…"
            className="w-full bg-transparent text-xs outline-none px-3 py-2 rounded-lg mb-1"
            style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)" }} />

          <div className="max-h-44 overflow-y-auto mb-4">
            {filteredExercises
              .filter((e) => !selected.find((s) => s.id === e.id))
              .slice(0, 14)
              .map((e) => (
                <button key={e.id}
                  onClick={() => { setSelected((prev) => [...prev, e]); setExSearch(""); }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-white/5 transition-colors flex items-center justify-between"
                  style={{ color: "#F5F0E8" }}>
                  <span>{e.name}</span>
                  <span style={{ color: "rgba(245,240,232,0.3)" }}>{e.muscle_group}</span>
                </button>
              ))}
          </div>

          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={isPending || !newName.trim() || selected.length === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
              style={{ background: "rgba(200,144,10,0.2)", color: "#C8900A" }}>
              Save Template
            </button>
            <button onClick={() => { setShowForm(false); setNewName(""); setSelected([]); }}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ color: "rgba(245,240,232,0.4)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {templates.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <BookOpen className="w-8 h-8" style={{ color: "rgba(245,240,232,0.08)" }} />
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.25)" }}>No templates yet — save a workout plan to reuse it</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map((tmpl) => {
            const sorted = [...tmpl.template_exercises].sort((a, b) => a.display_order - b.display_order);
            return (
              <div key={tmpl.id} className="p-4 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.07)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#F5F0E8" }}>{tmpl.name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "rgba(245,240,232,0.3)" }}>
                      {sorted.length} exercise{sorted.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteTemplate(tmpl.id)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-3 h-3" style={{ color: "rgba(248,113,113,0.4)" }} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sorted.map((te) => (
                    <div key={te.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs group/tag"
                      style={{ background: "rgba(255,255,255,0.05)", color: "rgba(245,240,232,0.6)" }}>
                      <span>{te.exercises.name}</span>
                      <button onClick={() => handleRemoveExercise(tmpl.id, te.id)}
                        className="opacity-0 group-hover/tag:opacity-100 transition-opacity">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
