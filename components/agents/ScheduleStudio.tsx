"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createScheduledTaskAction, updateScheduledTaskStatusAction } from "@/app/actions/schedule";

interface ScheduledTask { id: string; name: string; prompt: string; recurrence: "once" | "daily" | "weekdays" | "weekly"; next_run_at: string | null; status: "active" | "paused" | "running" | "completed" | "failed"; last_output: string; last_error: string; last_run_at: string | null; created_at: string }
const panel = { background: "#161210", border: "1px solid rgba(255,235,180,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)" };

const recurrenceLabel: Record<ScheduledTask["recurrence"], string> = { once: "Once", daily: "Daily", weekdays: "Weekdays", weekly: "Weekly" };

export function ScheduleStudio({ tasks, loadError }: { tasks: ScheduledTask[]; loadError: boolean }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [notice, setNotice] = useState("");

  function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    values.set("timezoneOffset", String(new Date().getTimezoneOffset()));
    startTransition(async () => {
      const result = await createScheduledTaskAction(values);
      setNotice(result.error ?? "Scheduled task saved.");
      if (!result.error) { form.reset(); router.refresh(); }
    });
  }

  function setStatus(id: string, status: "active" | "paused" | "completed") {
    startTransition(async () => {
      const result = await updateScheduledTaskStatusAction(id, status);
      setNotice(result.error ?? "Schedule updated.");
      if (!result.error) router.refresh();
    });
  }

  return <div className="space-y-5">
    {loadError && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">Scheduling isn’t ready. Apply the Nexus scheduled-tasks migration first.</div>}
    {notice && <p role="status" className="text-xs" style={{ color: "rgba(245,240,232,.55)" }}>{notice}</p>}
    <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
      <section className="rounded-2xl p-5 md:p-6" style={panel}>
        <p className="text-[10px] tracking-[.2em] uppercase" style={{ color: "rgba(245,240,232,.4)" }}>YOUR QUEUE · {tasks.filter((task) => task.status === "active").length} ACTIVE</p>
        <div className="mt-4 space-y-3">{tasks.length ? tasks.map((task) => <article key={task.id} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,.025)" }}>
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-sm font-medium">{task.name}</h2><p className="text-xs mt-1 opacity-45">{recurrenceLabel[task.recurrence]} · {task.next_run_at ? `next ${new Date(task.next_run_at).toLocaleDateString()}` : "no next run"} · {task.status}</p></div><div className="flex gap-2 shrink-0">{task.status === "active" && <button disabled={busy} onClick={() => setStatus(task.id, "paused")} className="text-xs opacity-65 hover:opacity-100">Pause</button>}{(task.status === "paused" || task.status === "failed") && <button disabled={busy} onClick={() => setStatus(task.id, "active")} className="text-xs" style={{ color: "#E8B428" }}>{task.status === "failed" ? "Retry" : "Resume"}</button>}{task.status === "active" && task.recurrence === "once" && <button disabled={busy} onClick={() => setStatus(task.id, "completed")} className="text-xs opacity-65 hover:opacity-100">Cancel</button>}</div></div>
          <p className="text-xs leading-relaxed mt-3 whitespace-pre-wrap opacity-65">{task.prompt}</p>
          {task.last_error && <p role="alert" className="text-xs text-red-300 mt-3">Last run failed: {task.last_error}</p>}
          {task.last_output && <details className="mt-3"><summary className="cursor-pointer text-xs" style={{ color: "#E8B428" }}>Latest result {task.last_run_at ? `· ${new Date(task.last_run_at).toLocaleString()}` : ""}</summary><p className="text-sm whitespace-pre-wrap leading-relaxed mt-2">{task.last_output}</p></details>}
        </article>) : <div className="rounded-xl p-8 text-center text-sm opacity-55">No scheduled tasks yet.</div>}</div>
      </section>
      <section className="rounded-2xl p-5 md:p-6" style={panel}>
        <h2 className="font-medium">Create a scheduled prompt</h2>
        <p className="text-xs mt-2 mb-4" style={{ color: "rgba(245,240,232,.45)" }}>The scheduler checks once per day on the current Vercel Hobby deployment. A task due after that day’s check runs at the next check, so this is day-level scheduling, not an exact-time alarm.</p>
        <form onSubmit={createTask} className="space-y-3">
          <input required name="name" maxLength={100} placeholder="Task name" aria-label="Scheduled task name" className="w-full rounded-xl px-3 py-2.5 text-sm bg-white/[.03] border border-white/[.08] outline-none focus:border-amber-400/40" />
          <textarea required name="prompt" minLength={4} maxLength={3000} rows={5} placeholder="What should Nexus think through and report?" aria-label="Scheduled task prompt" className="w-full rounded-xl px-3 py-3 text-sm bg-white/[.03] border border-white/[.08] outline-none focus:border-amber-400/40 resize-y" />
          <div className="grid grid-cols-2 gap-2"><input required type="date" name="runDate" aria-label="First run date" className="w-full rounded-xl px-3 py-2.5 text-sm bg-[#1b1917] border border-white/[.08] outline-none" /><select name="recurrence" aria-label="Recurrence" className="w-full rounded-xl px-3 py-2.5 text-sm bg-[#1b1917] border border-white/[.08] outline-none"><option value="once">Once</option><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option></select></div>
          <button disabled={busy || tasks.filter((task) => ["active", "paused", "failed"].includes(task.status)).length >= 20} className="rounded-xl px-4 py-2.5 text-xs font-semibold disabled:opacity-50" style={{ background: "#C8900A", color: "#100d07" }}>{busy ? "Saving…" : "Save schedule"}</button>
          <p className="text-[10px] opacity-40">Scheduled prompts can only generate and save a text result. They cannot send messages or change external data.</p>
        </form>
      </section>
    </div>
  </div>;
}
