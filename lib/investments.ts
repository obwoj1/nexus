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
  change: number;
}

export interface SearchResult {
  ticker: string;
  name: string;
  asset_type: "stock" | "crypto";
}
