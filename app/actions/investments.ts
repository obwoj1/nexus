"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const CRYPTO_IDS: Record<string, string> = {
  BTC:   "bitcoin",
  ETH:   "ethereum",
  SOL:   "solana",
  BNB:   "binancecoin",
  XRP:   "ripple",
  ADA:   "cardano",
  AVAX:  "avalanche-2",
  DOGE:  "dogecoin",
  DOT:   "polkadot",
  MATIC: "matic-network",
  LINK:  "chainlink",
  UNI:   "uniswap",
  LTC:   "litecoin",
  ATOM:  "cosmos",
  NEAR:  "near",
  SHIB:  "shiba-inu",
  TRX:   "tron",
  TON:   "the-open-network",
  OP:    "optimism",
  ARB:   "arbitrum",
  PEPE:  "pepe",
  WIF:   "dogwifcoin",
  BONK:  "bonk",
  SUI:   "sui",
  APT:   "aptos",
  INJ:   "injective-protocol",
};

export interface Holding {
  id: string;
  ticker: string;
  name: string;
  asset_type: "stock" | "crypto";
  quantity: number;
  cost_basis: number;
}

export interface PriceData {
  price: number;
  change: number; // 24h % change
}

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
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers.join(",")}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible)", "Accept": "application/json" },
        cache: "no-store",
      }
    );
    const data = await res.json();
    const result: Record<string, PriceData> = {};
    for (const q of data.quoteResponse?.result ?? []) {
      result[q.symbol] = {
        price:  q.regularMarketPrice ?? 0,
        change: q.regularMarketChangePercent ?? 0,
      };
    }
    return result;
  } catch {
    return {};
  }
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
