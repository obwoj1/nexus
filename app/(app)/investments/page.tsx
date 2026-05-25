import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InvestmentsShell } from "@/components/investments/InvestmentsShell";
import type { Holding } from "@/lib/investments";

export const metadata = { title: "Investments — Nexus" };

export default async function InvestmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: holdings } = await supabase
    .from("holdings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <InvestmentsShell
      initialHoldings={(holdings ?? []) as Holding[]}
    />
  );
}
