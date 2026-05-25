"use server";

import { createClient } from "@/lib/supabase/server";
import { CRYPTO_IDS, type Holding, type PriceData } from "@/lib/investments";
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
