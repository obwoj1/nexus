"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { deleteProjectAction, saveProjectAction } from "@/app/actions/projects";

interface Project { id: string; name: string; instructions: string; context: string; updated_at: string; created_at: string }
const panel = { background: "#161210", border: "1px solid rgba(255,235,180,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)" };

export function ProjectStudio({ projects, loadError }: { projects: Project[]; loadError: boolean }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [editing, setEditing] = useState<Project | null>(null);
  const [notice, setNotice] = useState("");

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    startTransition(async () => {
      const response = await saveProjectAction(new FormData(form));
      setNotice(response.error ?? "Project saved.");
      if (!response.error) { setEditing(null); form.reset(); router.refresh(); }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const response = await deleteProjectAction(id);
      setNotice(response.error ?? "Project deleted.");
      if (!response.error) { setEditing(null); router.refresh(); }
    });
  }

  return <div className="space-y-5">
    {loadError && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">Projects are not ready. Apply the Nexus project-workspaces migration first.</div>}
    {notice && <p role="status" className="text-xs opacity-60">{notice}</p>}
    <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
      <section className="rounded-2xl p-5 md:p-6" style={panel}>
        <p className="text-[10px] tracking-[.2em] uppercase opacity-40">YOUR PROJECTS · {projects.length}/50</p>
        <div className="mt-4 space-y-2">{projects.length ? projects.map((project) => <article key={project.id} className="rounded-xl p-4 flex items-start gap-3" style={{ background: "rgba(255,255,255,.025)" }}>
          <button type="button" onClick={() => setEditing(project)} className="text-left min-w-0 flex-1"><h2 className="text-sm font-medium">{project.name}</h2><p className="text-xs mt-1 opacity-45">Updated {new Date(project.updated_at).toLocaleDateString()} · {project.context.length.toLocaleString()} context characters</p></button>
          <button type="button" disabled={busy} onClick={() => remove(project.id)} className="text-xs opacity-50 hover:opacity-100">Delete</button>
        </article>) : <div className="rounded-xl p-8 text-center text-sm opacity-55">Your project spaces will appear here.</div>}</div>
      </section>
      <section className="rounded-2xl p-5 md:p-6" style={panel}>
        <h2 className="font-medium">{editing ? `Edit ${editing.name}` : "Create a project space"}</h2>
        <p className="text-xs mt-2 mb-4 opacity-50">Add concise project instructions and paste reference notes or documentation. Context stays private to your Nexus account.</p>
        <form key={editing?.id ?? "new"} onSubmit={save} className="space-y-3">
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <input required name="name" maxLength={100} defaultValue={editing?.name ?? ""} placeholder="Project name" aria-label="Project name" className="w-full rounded-xl px-3 py-2.5 text-sm bg-white/[.03] border border-white/[.08] outline-none focus:border-amber-400/40" />
          <textarea name="instructions" maxLength={3000} rows={3} defaultValue={editing?.instructions ?? ""} placeholder="Goals, constraints, and important instructions" aria-label="Project instructions" className="w-full rounded-xl px-3 py-3 text-sm bg-white/[.03] border border-white/[.08] outline-none focus:border-amber-400/40 resize-y" />
          <textarea name="context" maxLength={25000} rows={10} defaultValue={editing?.context ?? ""} placeholder="Paste project notes, requirements, or reference text (up to 25,000 characters)" aria-label="Project reference context" className="w-full rounded-xl px-3 py-3 text-sm bg-white/[.03] border border-white/[.08] outline-none focus:border-amber-400/40 resize-y" />
          <p className="text-[10px] opacity-40">Pasted text only. File uploads, folder access, and version history are not part of this first pass.</p>
          <div className="flex gap-2"><button disabled={busy || (!editing && projects.length >= 50)} className="rounded-xl px-4 py-2.5 text-xs font-semibold disabled:opacity-50" style={{ background: "#C8900A", color: "#100d07" }}>{busy ? "Saving…" : editing ? "Save changes" : "Create project"}</button>{editing && <button type="button" disabled={busy} onClick={() => setEditing(null)} className="rounded-xl px-4 py-2.5 text-xs border border-white/10">New project</button>}</div>
        </form>
      </section>
    </div>
  </div>;
}
