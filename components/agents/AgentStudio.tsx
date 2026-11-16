"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Network, Plus, Trash2 } from "lucide-react";
import { createAgentProfileAction, createAgentWorkflowAction, deleteAgentProfileAction, deleteAgentWorkflowAction, runAgentTeamAction } from "@/app/actions/agents";

interface AgentProfile { id: string; name: string; specialty: string; instructions: string; created_at: string }
interface AgentWorkflow { id: string; name: string; instructions: string; created_at: string }
interface Project { id: string; name: string }
const panel = { background: "#161210", border: "1px solid rgba(255,235,180,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)" };

export function AgentStudio({ agents, workflows, projects, loadError }: { agents: AgentProfile[]; workflows: AgentWorkflow[]; projects: Project[]; loadError: boolean }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>(agents.slice(0, 3).map((agent) => agent.id));
  const [task, setTask] = useState("");
  const [projectId, setProjectId] = useState("");
  const [result, setResult] = useState<{ result: string; contributions: { name: string; specialty: string; response: string }[] } | null>(null);
  const [notice, setNotice] = useState("");

  function runTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const response = await runAgentTeamAction(task, selected, projectId);
      if (response.error) { setNotice(response.error); return; }
      setNotice("Team run finished. Review the synthesis and specialist notes.");
      setResult({ result: response.result ?? "No response returned.", contributions: response.contributions ?? [] });
    });
  }

  function createProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    startTransition(async () => {
      const response = await createAgentProfileAction(new FormData(form));
      setNotice(response.error ?? "Agent profile saved.");
      if (!response.error) { form.reset(); router.refresh(); }
    });
  }

  function deleteProfile(id: string) {
    startTransition(async () => {
      const response = await deleteAgentProfileAction(id);
      setNotice(response.error ?? "Agent profile removed.");
      if (!response.error) { setSelected((current) => current.filter((value) => value !== id)); router.refresh(); }
    });
  }

  function saveWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    startTransition(async () => {
      const response = await createAgentWorkflowAction(new FormData(form));
      setNotice(response.error ?? "Workflow saved.");
      if (!response.error) { form.reset(); router.refresh(); }
    });
  }

  function deleteWorkflow(id: string) {
    startTransition(async () => {
      const response = await deleteAgentWorkflowAction(id);
      setNotice(response.error ?? "Workflow removed.");
      if (!response.error) router.refresh();
    });
  }

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length < 3 ? [...current, id] : current);
  }

  return <div className="space-y-5">
    {loadError && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">Saved agent profiles aren’t available. Apply the Nexus agent-profile migration first.</div>}
    {notice && <p role="status" className="text-xs" style={{ color: "rgba(245,240,232,.55)" }}>{notice}</p>}
    <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
      <section className="rounded-2xl p-5 md:p-6" style={panel}>
        <div className="flex items-center gap-2 mb-2"><Network className="h-4 w-4" style={{ color: "#C8900A" }} /><h2 className="font-medium">Run a specialist team</h2></div>
        <p className="text-xs mb-4" style={{ color: "rgba(245,240,232,.45)" }}>Up to three independent reasoning passes, followed by a synthesis. These agents use the Nexus Claude configuration; they do not access tools, files, or external accounts.</p>
        {agents.length ? <div className="space-y-2 mb-4"><p className="text-[10px] tracking-widest uppercase" style={{ color: "rgba(245,240,232,.4)" }}>YOUR SPECIALISTS · CHOOSE UP TO 3</p>{agents.map((agent) => <label key={agent.id} className="flex items-start gap-3 rounded-xl p-3 cursor-pointer" style={{ background: selected.includes(agent.id) ? "rgba(200,144,10,.08)" : "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)" }}><input type="checkbox" checked={selected.includes(agent.id)} onChange={() => toggleSelected(agent.id)} className="mt-0.5 accent-amber-500" /><span className="min-w-0 flex-1"><span className="block text-sm">{agent.name}<span className="ml-2 text-xs opacity-50">{agent.specialty}</span></span><span className="block text-xs mt-1 opacity-45 line-clamp-2">{agent.instructions}</span></span></label>)}{selected.length === 0 && <p className="text-xs opacity-50">No saved specialists selected; the built-in starter team will run.</p>}</div> : <div className="rounded-xl p-3 mb-4 text-xs" style={{ background: "rgba(255,255,255,.025)", color: "rgba(245,240,232,.52)" }}>No saved specialists yet. The built-in Planner, Researcher, and Critical reviewer will form your starter team.</div>}
        <form onSubmit={runTeam} className="space-y-3"><label htmlFor="agent-task" className="block text-xs font-medium">What should the team work on?</label><textarea id="agent-task" value={task} onChange={(event) => setTask(event.target.value)} minLength={4} maxLength={6000} required rows={5} placeholder="Describe a decision, plan, or question…" className="w-full rounded-xl px-3 py-3 text-sm bg-white/[.03] border border-white/[.08] outline-none focus:border-amber-400/40 resize-y" />{projects.length > 0 && <label className="block text-xs">Optional project context<select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm bg-[#1b1917] border border-white/[.08] outline-none"><option value="">No project context</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>}<button disabled={busy} className="rounded-xl px-4 py-2.5 text-xs font-semibold disabled:opacity-50" style={{ background: "#C8900A", color: "#100d07" }}>{busy ? "Working…" : "Run team"}</button><p className="text-[10px] opacity-40">Project text is added only when you select a project. It is reference context, not tool access.</p></form>
        {result && <div className="mt-5 rounded-xl p-4" style={{ background: "rgba(255,255,255,.03)" }}><p className="text-[10px] tracking-widest uppercase mb-2" style={{ color: "#E8B428" }}>SYNTHESIS</p><p className="text-sm leading-relaxed whitespace-pre-wrap">{result.result}</p><details className="mt-4"><summary className="cursor-pointer text-xs flex items-center gap-1 opacity-65"><ChevronDown className="w-3 h-3" />Specialist perspectives</summary><div className="mt-3 space-y-3">{result.contributions.map((item) => <article key={item.name} className="border-t border-white/10 pt-3"><p className="text-xs font-medium">{item.name}<span className="ml-2 opacity-45">{item.specialty}</span></p><p className="text-xs leading-relaxed whitespace-pre-wrap mt-1 opacity-75">{item.response}</p></article>)}</div></details></div>}
      </section>

      <section className="rounded-2xl p-5 md:p-6" style={panel}>
        <div className="flex items-center gap-2 mb-2"><Check className="h-4 w-4" style={{ color: "#C8900A" }} /><h2 className="font-medium">Agent profiles</h2></div>
        <p className="text-xs mb-4" style={{ color: "rgba(245,240,232,.45)" }}>Save reusable specialists with a narrow role and clear instructions. Your profiles stay in your Nexus account.</p>
        {agents.length > 0 && <ul className="space-y-2 mb-5">{agents.map((agent) => <li key={agent.id} className="flex items-start gap-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,.025)" }}><div className="min-w-0 flex-1"><p className="text-sm">{agent.name}</p><p className="text-xs mt-1 opacity-50">{agent.specialty}</p></div><button type="button" disabled={busy} onClick={() => deleteProfile(agent.id)} aria-label={`Delete ${agent.name}`} className="opacity-45 hover:opacity-100"><Trash2 className="h-4 w-4" /></button></li>)}</ul>}
        <form onSubmit={createProfile} className="space-y-2"><input required name="name" maxLength={60} placeholder="Name · e.g. Product reviewer" aria-label="Agent name" className="w-full rounded-xl px-3 py-2 text-sm bg-white/[.03] border border-white/[.08] outline-none focus:border-amber-400/40" /><input required name="specialty" maxLength={120} placeholder="Specialty" aria-label="Agent specialty" className="w-full rounded-xl px-3 py-2 text-sm bg-white/[.03] border border-white/[.08] outline-none focus:border-amber-400/40" /><textarea required name="instructions" maxLength={1800} rows={4} placeholder="What should this specialist focus on?" aria-label="Agent instructions" className="w-full rounded-xl px-3 py-2 text-sm bg-white/[.03] border border-white/[.08] outline-none focus:border-amber-400/40 resize-y" /><button disabled={busy || agents.length >= 12} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium disabled:opacity-50" style={{ background: "rgba(200,144,10,.15)", color: "#F5CE58" }}><Plus className="h-3.5 w-3.5" />Save specialist</button><p className="text-[10px] opacity-40">{agents.length}/12 saved</p></form>
      </section>
    </div>
    <section className="rounded-2xl p-5 md:p-6" style={panel}>
      <div className="flex items-center gap-2 mb-2"><Check className="h-4 w-4" style={{ color: "#C8900A" }} /><h2 className="font-medium">Reusable workflows</h2></div>
      <p className="text-xs mb-4" style={{ color: "rgba(245,240,232,.45)" }}>Save repeatable task briefs, then load one into the team composer and review it before every run.</p>
      {workflows.length > 0 && <ul className="grid gap-2 md:grid-cols-2 mb-5">{workflows.map((workflow) => <li key={workflow.id} className="rounded-xl p-3 flex items-start gap-3" style={{ background: "rgba(255,255,255,.025)" }}><div className="min-w-0 flex-1"><p className="text-sm">{workflow.name}</p><p className="text-xs mt-1 opacity-45 line-clamp-2">{workflow.instructions}</p></div><button type="button" onClick={() => { setTask(workflow.instructions); document.querySelector<HTMLTextAreaElement>("#agent-task")?.focus(); }} className="text-xs shrink-0" style={{ color: "#E8B428" }}>Use</button><button type="button" disabled={busy} onClick={() => deleteWorkflow(workflow.id)} aria-label={`Delete ${workflow.name}`} className="opacity-40 hover:opacity-100"><Trash2 className="h-4 w-4" /></button></li>)}</ul>}
      <form onSubmit={saveWorkflow} className="grid gap-2 md:grid-cols-[.7fr_1.3fr_auto] items-start"><input required name="name" maxLength={80} placeholder="Workflow name" aria-label="Workflow name" className="w-full rounded-xl px-3 py-2 text-sm bg-white/[.03] border border-white/[.08] outline-none focus:border-amber-400/40" /><textarea required name="instructions" maxLength={3000} rows={2} placeholder="Describe the repeatable task brief" aria-label="Workflow instructions" className="w-full rounded-xl px-3 py-2 text-sm bg-white/[.03] border border-white/[.08] outline-none focus:border-amber-400/40 resize-y" /><button disabled={busy || workflows.length >= 30} className="rounded-xl px-3 py-2 text-xs font-medium disabled:opacity-50" style={{ background: "rgba(200,144,10,.15)", color: "#F5CE58" }}>Save workflow</button></form>
      <p className="text-[10px] opacity-40 mt-2">{workflows.length}/30 saved. Workflows only fill the task prompt; they do not run until you choose Run team.</p>
    </section>
  </div>;
}
