"use server";

import { createClient } from "@/lib/supabase/server";
import { CRYPTO_IDS, type Holding, type PriceData, type SearchResult } from "@/lib/investments";
import { z } from "zod";

const holdingSchema = z.object({
  ticker:     z.string().min(1).max(20).transform(s => s.toUpperCase().trim()),
  name:       z.string().min(1).max(100).trim(),
  asset_type: z.enum(["stock", "crypto"]),
  quantity:   z.number().positive(),
  cost_basis: z.number().min(0),
});

export async function getHoldingsAction(): Promise<Holding[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("holdings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (data ?? []) as Holding[];
}

export async function addHoldingAction(input: {
  ticker: string; name: string;
  asset_type: "stock" | "crypto";
  quantity: number; cost_basis: number;
}) {
  const parsed = holdingSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("holdings")
    .insert({ ...parsed.data, user_id: user.id })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

export async function deleteHoldingAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  await supabase.from("holdings").delete().eq("id", id).eq("user_id", user.id);
  return { success: true };
}

// ── Robinhood integration ──────────────────────────────────────────────────

function rhHeaders(rawToken: string): Record<string, string> {
  const token = rawToken.replace(/^(Bearer |Token )/i, "").trim();
  return {
    "Authorization": `Bearer ${token}`,
    "Accept":        "application/json",
  };
}

export async function saveRobinhoodTokenAction(rawToken: string) {
  const token = rawToken.replace(/^(Bearer |Token )/i, "").trim();
  if (!token) return { error: "Token required" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Validate token before saving
  try {
    const res = await fetch("https://api.robinhood.com/user/", {
      headers: rhHeaders(token), cache: "no-store",
    });
    if (!res.ok) return { error: "Token invalid or expired — try again" };
  } catch {
    return { error: "Could not reach Robinhood — check your connection" };
  }

  await supabase.from("profiles").update({ robinhood_token: token }).eq("id", user.id);
  return { success: true };
}

export async function disconnectRobinhoodAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  await supabase.from("profiles").update({ robinhood_token: null }).eq("id", user.id);
  return { success: true };
}

export async function syncRobinhoodAction(): Promise<{ holdings: Holding[] } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("robinhood_token")
    .eq("id", user.id)
    .single();

  if (!profile?.robinhood_token) return { error: "No token saved" };

  const headers = rhHeaders(profile.robinhood_token);

  try {
    const posRes = await fetch(
      "https://api.robinhood.com/positions/?nonzero=true",
      { headers, cache: "no-store" }
    );
    if (posRes.status === 401) return { error: "Token expired — paste a fresh one from DevTools" };
    if (!posRes.ok)             return { error: "Robinhood API error — try again" };

    const posData = await posRes.json() as {
      results: Array<{ instrument: string; quantity: string; average_buy_price: string }>;
    };

    // Resolve each instrument URL → { symbol, name } in parallel
    const resolved = await Promise.all(
      posData.results
        .filter(p => parseFloat(p.quantity) > 0)
        .map(async (pos) => {
          try {
            const ir = await fetch(pos.instrument, { headers, cache: "no-store" });
            const inst = await ir.json() as { symbol: string; simple_name?: string; name: string };
            return {
              ticker:     inst.symbol,
              name:       inst.simple_name || inst.name || inst.symbol,
              asset_type: "stock" as const,
              quantity:   parseFloat(pos.quantity),
              cost_basis: parseFloat(pos.average_buy_price),
              user_id:    user.id,
            };
          } catch { return null; }
        })
    );

    const valid = resolved.filter(Boolean) as Array<{
      ticker: string; name: string; asset_type: "stock";
      quantity: number; cost_basis: number; user_id: string;
    }>;

    // Replace stock holdings with fresh Robinhood data; keep crypto holdings
    await supabase.from("holdings").delete().eq("user_id", user.id).eq("asset_type", "stock");
    if (valid.length > 0) await supabase.from("holdings").insert(valid);

    const { data: all } = await supabase
      .from("holdings").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return { holdings: (all ?? []) as Holding[] };
  } catch {
    return { error: "Sync failed — check your token and try again" };
  }
}

// ── Symbol search ──────────────────────────────────────────────────────────

export async function searchSymbolsAction(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const key = process.env.FINNHUB_API_KEY;

  const [stocks, cryptos] = await Promise.all([
    key
      ? fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${key}`, { cache: "no-store" })
          .then(r => r.json())
          .then((d: { result?: Array<{ symbol: string; description: string; type: string }> }) =>
            (d.result ?? [])
              .filter(r => r.type === "Common Stock" || r.type === "ETP")
              .slice(0, 6)
              .map(r => ({ ticker: r.symbol, name: r.description, asset_type: "stock" as const }))
          )
          .catch(() => [] as SearchResult[])
      : [] as SearchResult[],

    fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`, { cache: "no-store" })
      .then(r => r.json())
      .then((d: { coins?: Array<{ symbol: string; name: string }> }) =>
        (d.coins ?? []).slice(0, 3).map(c => ({
          ticker: c.symbol.toUpperCase(),
          name:   c.name,
          asset_type: "crypto" as const,
        }))
      )
      .catch(() => [] as SearchResult[]),
  ]);

  return [...stocks, ...cryptos].slice(0, 8);
}

export async function fetchPricesAction(
  holdings: { ticker: string; asset_type: string }[]
): Promise<Record<string, PriceData>> {
  if (holdings.length === 0) return {};

  const stocks  = holdings.filter(h => h.asset_type === "stock").map(h => h.ticker);
  const cryptos = holdings.filter(h => h.asset_type === "crypto").map(h => h.ticker);

  const [stockPrices, cryptoPrices] = await Promise.all([
    fetchStockPrices(stocks),
    fetchCryptoPrices(cryptos),
  ]);

  return { ...stockPrices, ...cryptoPrices };
}

async function fetchStockPrices(tickers: string[]): Promise<Record<string, PriceData>> {
  if (tickers.length === 0) return {};
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return {};

  const results = await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${key}`,
          { cache: "no-store" }
        );
        const data = await res.json() as { c: number; dp: number };
        return { ticker, price: data.c ?? 0, change: data.dp ?? 0 };
      } catch {
        return { ticker, price: 0, change: 0 };
      }
    })
  );

  return Object.fromEntries(results.map(r => [r.ticker, { price: r.price, change: r.change }]));
}

async function fetchCryptoPrices(tickers: string[]): Promise<Record<string, PriceData>> {
  if (tickers.length === 0) return {};

  const coinIds = tickers
    .map(t => CRYPTO_IDS[t.toUpperCase()])
    .filter(Boolean);

  if (coinIds.length === 0) return {};

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(",")}&vs_currencies=usd&include_24hr_change=true`,
      { cache: "no-store" }
    );
    const data = await res.json() as Record<string, { usd: number; usd_24h_change: number }>;

    const result: Record<string, PriceData> = {};
    for (const ticker of tickers) {
      const coinId = CRYPTO_IDS[ticker.toUpperCase()];
      if (coinId && data[coinId]) {
        result[ticker.toUpperCase()] = {
          price:  data[coinId].usd,
          change: data[coinId].usd_24h_change,
        };
      }
    }
    return result;
  } catch {
    return {};
  }
}
