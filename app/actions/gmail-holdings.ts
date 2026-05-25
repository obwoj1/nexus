"use server";

import { createClient } from "@/lib/supabase/server";
import { scanRobinhoodTrades, aggregateTrades } from "@/lib/google/gmail";
import { addHoldingAction } from "./investments";
import type { ParsedPosition } from "@/lib/google/gmail";

export async function scanGmailHoldingsAction(): Promise<
  { positions: ParsedPosition[]; emailsScanned: number } | { error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  try {
    const { trades, emailsFound } = await scanRobinhoodTrades(user.id, 150);
    if (emailsFound === 0) {
      return { error: "No Robinhood emails found in this Gmail account. Make sure the account that receives Robinhood emails is the one connected to Nexus." };
    }
    if (trades.length === 0) {
      return { error: `Found ${emailsFound} Robinhood email${emailsFound !== 1 ? "s" : ""} but couldn't parse any trade confirmations. The format may have changed — try CSV import instead.` };
    }
    const positions = aggregateTrades(trades);
    return { positions, emailsScanned: trades.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "NO_TOKEN" || msg === "NO_REFRESH_TOKEN" || msg === "TOKEN_REFRESH_FAILED") {
      return { error: "Gmail not connected — sign in again to reconnect Google" };
    }
    return { error: "Failed to scan Gmail — try again" };
  }
}

export async function importGmailPositionsAction(
  positions: ParsedPosition[],
  skipTickers: string[],
): Promise<{ imported: number } | { error: string }> {
  const skip = new Set(skipTickers.map(t => t.toUpperCase()));
  const toImport = positions.filter(p => !skip.has(p.ticker.toUpperCase()));

  let imported = 0;
  for (const pos of toImport) {
    const res = await addHoldingAction({
      ticker:     pos.ticker,
      name:       pos.name,
      asset_type: "stock",
      quantity:   pos.quantity,
      cost_basis: pos.avgCostBasis,
    });
    if ("id" in res) imported++;
  }

  return { imported };
}
