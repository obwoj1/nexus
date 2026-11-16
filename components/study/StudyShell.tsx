"use client";

import { useState, useTransition, type FormEvent } from "react";
import { BookOpen, CalendarClock, Check, Circle, Plus, Sparkles } from "lucide-react";
import { createStudyAssignmentAction, createStudyCourseAction, toggleStudyAssignmentAction } from "@/app/actions/study";

interface Course { id: string; name: string; code: string; term: string }
interface Assignment { id: string; course_id: string; title: string; due_at: string | null; details: string; status: "todo" | "completed" }

const surface = { background: "#161210", border: "1px solid rgba(255,235,180,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.18)" };

export function StudyShell({ courses, assignments, loadError }: { courses: Course[]; assignments: Assignment[]; loadError: boolean }) {
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const courseNames = new Map(courses.map((course) => [course.id, course]));
  const openAssignments = assignments.filter((item) => item.status === "todo");
  const completedAssignments = assignments.filter((item) => item.status === "completed");

  function submitCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    startTransition(async () => {
      const result = await createStudyCourseAction(new FormData(form));
      setMessage(result.error ?? "Course added.");
      if (!result.error) form.reset();
    });
  }

  function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    values.set("timezoneOffset", String(new Date().getTimezoneOffset()));
    startTransition(async () => {
      const result = await createStudyAssignmentAction(values);
      setMessage(result.error ?? "Assignment added.");
      if (!result.error) form.reset();
    });
  }

  function toggleAssignment(item: Assignment) {
    startTransition(async () => {
      const result = await toggleStudyAssignmentAction(item.id, item.status === "todo");
      setMessage(result.error ?? (item.status === "todo" ? "Marked complete." : "Reopened assignment."));
    });
  }

  return <div className="space-y-5">
    {loadError && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">Study data couldn’t load. Check that the Study database migration has been applied.</div>}
    {message && <p role="status" className="text-xs" style={{ color: "rgba(245,240,232,.52)" }}>{message}</p>}
    <div className="grid gap-4 lg:grid-cols-[1.35fr_.9fr]">
      <section className="rounded-2xl p-5 md:p-6" style={surface}>
        <div className="flex items-center justify-between gap-3 mb-5">
          <div><p className="text-[10px] tracking-[.2em] uppercase" style={{ color: "rgba(245,240,232,.4)" }}>PLANNER</p><h2 className="text-lg font-medium mt-1">Upcoming work</h2></div>
          <div className="rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(200,144,10,.1)", color: "#E8B428" }}>{openAssignments.length} open</div>
        </div>
        {openAssignments.length ? <ul className="divide-y divide-white/5">
          {openAssignments.map((item) => <li key={item.id} className="py-3 flex items-start gap-3">
            <button type="button" disabled={busy} onClick={() => toggleAssignment(item)} className="mt-0.5 rounded-full hover:text-amber-300 disabled:opacity-40" aria-label={`Mark ${item.title} complete`}><Circle className="h-4 w-4" /></button>
            <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{item.title}</p><p className="text-xs mt-1" style={{ color: "rgba(245,240,232,.42)" }}>{courseNames.get(item.course_id)?.code || courseNames.get(item.course_id)?.name || "Course"}</p>{item.details && <p className="text-xs mt-2 line-clamp-2" style={{ color: "rgba(245,240,232,.5)" }}>{item.details}</p>}</div>
            <time className="text-right text-xs shrink-0" style={{ color: "rgba(245,240,232,.45)" }}>{item.due_at ? new Date(item.due_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No due date"}</time>
          </li>)}
        </ul> : <div className="rounded-xl p-6 text-center" style={{ background: "rgba(255,255,255,.025)" }}><Sparkles className="h-5 w-5 mx-auto mb-2" style={{ color: "#C8900A" }} /><p className="text-sm">Your planner is clear.</p><p className="text-xs mt-1" style={{ color: "rgba(245,240,232,.42)" }}>Add a course and assignment to start.</p></div>}
        {completedAssignments.length > 0 && <details className="mt-5"><summary className="cursor-pointer text-xs" style={{ color: "rgba(245,240,232,.5)" }}>Completed ({completedAssignments.length})</summary><ul className="mt-2 divide-y divide-white/5">{completedAssignments.map((item) => <li className="py-2 flex items-center gap-3 text-sm" key={item.id}><button type="button" disabled={busy} onClick={() => toggleAssignment(item)} aria-label={`Reopen ${item.title}`}><Check className="h-4 w-4 text-emerald-400" /></button><span className="line-through opacity-50">{item.title}</span></li>)}</ul></details>}
      </section>

      <div className="space-y-4">
        <section className="rounded-2xl p-5" style={surface}>
          <div className="flex items-center gap-2 mb-4"><BookOpen className="h-4 w-4" style={{ color: "#C8900A" }} /><h2 className="text-sm font-medium">Your courses <span className="ml-1 opacity-50">{courses.length}</span></h2></div>
          {courses.length ? <ul className="space-y-2 mb-4">{courses.map((course) => <li key={course.id} className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,.025)" }}><p className="text-sm">{course.name}</p><p className="text-[11px] mt-1" style={{ color: "rgba(245,240,232,.42)" }}>{[course.code, course.term].filter(Boolean).join(" · ")}</p></li>)}</ul> : <p className="text-xs mb-4" style={{ color: "rgba(245,240,232,.45)" }}>Add your first course below.</p>}
          <form onSubmit={submitCourse} className="space-y-2">
            <input required name="name" maxLength={160} placeholder="Course name" aria-label="Course name" className="w-full rounded-xl px-3 py-2 text-sm bg-white/[.03] border border-white/[.08] outline-none focus:border-amber-400/40" />
            <div className="grid grid-cols-2 gap-2"><input name="code" maxLength={40} placeholder="Course code" aria-label="Course code" className="min-w-0 rounded-xl px-3 py-2 text-sm bg-white/[.03] border border-white/[.08] outline-none focus:border-amber-400/40" /><input name="term" maxLength={80} placeholder="Term" aria-label="Term" className="min-w-0 rounded-xl px-3 py-2 text-sm bg-white/[.03] border border-white/[.08] outline-none focus:border-amber-400/40" /></div>
            <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium disabled:opacity-50" style={{ background: "rgba(200,144,10,.15)", color: "#F5CE58" }}><Plus className="h-3.5 w-3.5" />Add course</button>
          </form>
        </section>

        <section className="rounded-2xl p-5" style={surface}>
          <div className="flex items-center gap-2 mb-4"><CalendarClock className="h-4 w-4" style={{ color: "#C8900A" }} /><h2 className="text-sm font-medium">Add to planner</h2></div>
          {courses.length ? <form onSubmit={submitAssignment} className="space-y-2">
            <select required name="courseId" aria-label="Assignment course" className="w-full rounded-xl px-3 py-2 text-sm bg-[#1b1917] border border-white/[.08] outline-none">{courses.map((course) => <option key={course.id} value={course.id}>{course.code ? `${course.code} · ` : ""}{course.name}</option>)}</select>
            <input required name="title" maxLength={240} placeholder="Assignment or task" aria-label="Assignment title" className="w-full rounded-xl px-3 py-2 text-sm bg-white/[.03] border border-white/[.08] outline-none focus:border-amber-400/40" />
            <input type="datetime-local" name="dueAt" aria-label="Due date" className="w-full rounded-xl px-3 py-2 text-sm bg-[#1b1917] border border-white/[.08] outline-none" />
            <textarea name="details" maxLength={8000} rows={2} placeholder="Instructions or notes (optional)" aria-label="Assignment notes" className="w-full rounded-xl px-3 py-2 text-sm bg-white/[.03] border border-white/[.08] outline-none focus:border-amber-400/40 resize-y" />
            <button disabled={busy} className="rounded-xl px-3 py-2 text-xs font-medium disabled:opacity-50" style={{ background: "#C8900A", color: "#100d07" }}>Add assignment</button>
          </form> : <p className="text-xs" style={{ color: "rgba(245,240,232,.45)" }}>Create a course first to add planner items.</p>}
        </section>
      </div>
    </div>
  </div>;
}
