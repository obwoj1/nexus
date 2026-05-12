import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWaitlist } from "@/app/actions/admin";
import { WaitlistTable } from "@/components/admin/WaitlistTable";
import { Topbar } from "@/components/layout/Topbar";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ALLOWED_EMAIL) {
    redirect("/dashboard");
  }

  const entries = await getWaitlist();

  const stats = {
    total:    entries.length,
    pending:  entries.filter((e) => e.status === "pending").length,
    invited:  entries.filter((e) => e.status === "invited").length,
    rejected: entries.filter((e) => e.status === "rejected").length,
  };

  return (
    <div className="flex flex-col flex-1">
      <Topbar section="ADMIN" title="Waitlist" />

      <main className="flex-1 p-8 max-w-5xl w-full">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total",    value: stats.total,    color: "#F5F0E8" },
            { label: "Pending",  value: stats.pending,  color: "#FBBF24" },
            { label: "Invited",  value: stats.invited,  color: "#4ADE80" },
            { label: "Rejected", value: stats.rejected, color: "#F87171" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl p-5"
              style={{ background: "#161210", border: "1px solid rgba(255,235,180,0.08)" }}>
              <p className="text-[11px] tracking-widest uppercase mb-2"
                style={{ color: "rgba(245,240,232,0.35)" }}>
                {label}
              </p>
              <p className="text-3xl font-semibold font-mono" style={{ color }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        <WaitlistTable entries={entries} />
      </main>
    </div>
  );
}
