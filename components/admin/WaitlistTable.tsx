"use client";

import { useState, useTransition } from "react";
import { updateWaitlistStatus, type WaitlistEntry } from "@/app/actions/admin";

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  pending:  { bg: "rgba(251,191,36,0.08)",  text: "#FBBF24", border: "rgba(251,191,36,0.25)" },
  invited:  { bg: "rgba(74,222,128,0.08)",  text: "#4ADE80", border: "rgba(74,222,128,0.25)" },
  rejected: { bg: "rgba(248,113,113,0.08)", text: "#F87171", border: "rgba(248,113,113,0.25)" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      {status}
    </span>
  );
}

function StatusSelect({ entry }: { entry: WaitlistEntry }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as WaitlistEntry["status"];
    startTransition(async () => {
      await updateWaitlistStatus(entry.id, next);
    });
  }

  return (
    <select
      defaultValue={entry.status}
      onChange={handleChange}
      disabled={isPending}
      className="text-xs px-2.5 py-1 rounded-lg appearance-none cursor-pointer disabled:opacity-50 transition-opacity"
      style={{
        background: "rgba(255,235,180,0.05)",
        border: "1px solid rgba(255,235,180,0.1)",
        color: "#F5F0E8",
      }}
    >
      <option value="pending">pending</option>
      <option value="invited">invited</option>
      <option value="rejected">rejected</option>
    </select>
  );
}

export function WaitlistTable({ entries }: { entries: WaitlistEntry[] }) {
  const [optimistic, setOptimistic] = useState(entries);

  if (optimistic.length === 0) {
    return (
      <div className="text-center py-16"
        style={{ color: "rgba(245,240,232,0.3)" }}>
        No waitlist entries yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl"
      style={{ border: "1px solid rgba(255,235,180,0.08)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,235,180,0.07)" }}>
            {["Name", "Email", "Status", "Joined", "Action"].map((h) => (
              <th key={h} className="text-left px-5 py-3.5 text-[11px] font-medium tracking-widest uppercase"
                style={{ color: "rgba(245,240,232,0.35)", background: "rgba(255,235,180,0.02)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {optimistic.map((entry, i) => (
            <tr key={entry.id}
              className="transition-colors hover:bg-[rgba(255,235,180,0.02)]"
              style={{
                borderBottom: i < optimistic.length - 1 ? "1px solid rgba(255,235,180,0.05)" : "none",
              }}>
              <td className="px-5 py-4 font-medium" style={{ color: "#F5F0E8" }}>
                {entry.name}
              </td>
              <td className="px-5 py-4" style={{ color: "rgba(245,240,232,0.6)" }}>
                {entry.email}
              </td>
              <td className="px-5 py-4">
                <StatusBadge status={entry.status} />
              </td>
              <td className="px-5 py-4 font-mono text-xs" style={{ color: "rgba(245,240,232,0.4)" }}>
                {new Date(entry.created_at).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </td>
              <td className="px-5 py-4">
                <StatusSelect entry={entry} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
