import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InvestmentsShell } from "@/components/investments/InvestmentsShell";
import type { Holding } from "@/lib/investments";

export const metadata = { title: "Investments — Nexus" };

export default async function InvestmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [holdingsRes, profileRes] = await Promise.all([
    supabase.from("holdings").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("profiles").select("robinhood_token").eq("id", user.id).single(),
  ]);

  return (
    <InvestmentsShell
      initialHoldings={(holdingsRes.data ?? []) as Holding[]}
      rhConnected={!!profileRes.data?.robinhood_token}
    />
  );
}
