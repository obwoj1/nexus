"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Plus, Trash2, RefreshCw, TrendingUp, Upload, Search, X, Link, Unlink } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  addHoldingAction, deleteHoldingAction, fetchPricesAction,
  searchSymbolsAction, saveRobinhoodTokenAction,
  disconnectRobinhoodAction, syncRobinhoodAction,
} from "@/app/actions/investments";
import { CRYPTO_IDS, type Holding, type PriceData, type SearchResult } from "@/lib/investments";

const COLORS = ["#C8900A","#4ADE80","#60A5FA","#F87171","#A78BFA","#FB923C","#34D399","#F472B6","#FBBF24","#38BDF8"];

function fmt(n: number, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtQty(n: number) {
  if (Number.isInteger(n)) return n.toString();
  return parseFloat(n.toFixed(8)).toString();
}

interface ParsedCSVHolding {
  ticker: string; name: string;
  asset_type: "stock" | "crypto";
  quantity: number; cost_basis: number;
}

function parseRobinhoodCSV(text: string): ParsedCSVHolding[] {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  function parseLine(line: string): string[] {
    const cols: string[] = []; let cur = ""; let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim()); return cols;
  }
  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z ]/g, "").trim());
  const idx = {
    ticker: headers.findIndex(h => ["symbol","ticker","instrument"].includes(h)),
    name:   headers.findIndex(h => ["name","description","company"].includes(h)),
    qty:    headers.findIndex(h => h.includes("quantity") || h === "shares" || h === "qty"),
    cost:   headers.findIndex(h => (h.includes("average") && (h.includes("cost") || h.includes("price"))) || h === "cost basis"),
  };
  if (idx.ticker === -1 || idx.qty === -1) return [];
  return lines.slice(1).flatMap(line => {
    const cols = parseLine(line);
    const ticker = cols[idx.ticker]?.toUpperCase().replace(/[^A-Z0-9.]/g, "");
    if (!ticker) return [];
    const quantity = parseFloat(cols[idx.qty] ?? "0");
    if (!quantity || quantity <= 0) return [];
    const cost_basis = idx.cost >= 0 ? parseFloat(cols[idx.cost] ?? "0") || 0 : 0;
    const name = (idx.name >= 0 && cols[idx.name]) ? cols[idx.name] : ticker;
    const asset_type: "stock" | "crypto" = CRYPTO_IDS[ticker] ? "crypto" : "stock";
    return [{ ticker, name, asset_type, quantity, cost_basis }];
  });
}

interface Props {
  initialHoldings: Holding[];
  rhConnected: boolean;
}

export function InvestmentsShell({ initialHoldings, rhConnected: initialRhConnected }: Props) {
  const [holdings, setHoldings]           = useState(initialHoldings);
  const [prices, setPrices]               = useState<Record<string, PriceData>>({});
  const [initialLoading, setInitialLoading] = useState(true);   // skeletons — first load only
  const [updatedAt, setUpdatedAt]         = useState<Date | null>(null);
  const [isPending, startTransition]      = useTransition();
  const holdingsRef                       = useRef(initialHoldings); // stale-closure fix

  // Robinhood
  const [rhConnected, setRhConnected]     = useState(initialRhConnected);
  const [showConnect, setShowConnect]     = useState(false);
  const [rhToken, setRhToken]             = useState("");
  const [rhError, setRhError]             = useState("");
  const [syncMsg, setSyncMsg]             = useState("");
  const [lastSynced, setLastSynced]       = useState<Date | null>(null);

  // Search / add
  const [showSearch, setShowSearch]       = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching]         = useState(false);
  const [selected, setSelected]           = useState<SearchResult | null>(null);
  const [qty, setQty]                     = useState("");
  const [cost, setCost]                   = useState("");
  const searchTimer                       = useRef<ReturnType<typeof setTimeout> | null>(null);

  // CSV
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows] = useState<ParsedCSVHolding[] | null>(null);

  // Keep holdingsRef current so the interval always sees fresh data
  useEffect(() => { holdingsRef.current = holdings; }, [holdings]);

  useEffect(() => {
    void loadPrices(holdingsRef.current, true);
    const iv = setInterval(() => void loadPrices(holdingsRef.current, false), 15_000);
    return () => clearInterval(iv);
  }, []); // eslint-disable-line

  async function loadPrices(hs: Holding[], isFirst: boolean) {
    if (isFirst) setInitialLoading(true);
    const data = await fetchPricesAction(hs.map(h => ({ ticker: h.ticker, asset_type: h.asset_type })));
    setPrices(data);
    setUpdatedAt(new Date());
    if (isFirst) setInitialLoading(false);
  }

  // ── Robinhood ────────────────────────────────────────────────────────────
  function handleConnectRh() {
    if (!rhToken.trim()) return;
    setRhError("");
    startTransition(async () => {
      const res = await saveRobinhoodTokenAction(rhToken.trim());
      if ("error" in res) { setRhError(res.error ?? "Unknown error"); return; }
      setRhConnected(true);
      setShowConnect(false);
      setRhToken("");
      void handleSyncRh();
    });
  }

  function handleDisconnectRh() {
    startTransition(async () => {
      await disconnectRobinhoodAction();
      setRhConnected(false);
    });
  }

  async function handleSyncRh() {
    setSyncMsg("Syncing…");
    const res = await syncRobinhoodAction();
    if ("error" in res) { setSyncMsg(res.error); setTimeout(() => setSyncMsg(""), 4000); return; }
    setHoldings(res.holdings);
    holdingsRef.current = res.holdings;
    setLastSynced(new Date());
    setSyncMsg(`Synced ${res.holdings.filter(h => h.asset_type === "stock").length} positions`);
    setTimeout(() => setSyncMsg(""), 3000);
    void loadPrices(res.holdings, false);
  }

  // ── Search ───────────────────────────────────────────────────────────────
  function handleSearchChange(q: string) {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const res = await searchSymbolsAction(q);
      setSearchResults(res); setSearching(false);
    }, 350);
  }

  function handleSelect(r: SearchResult) {
    setSelected(r); setSearchQuery(r.ticker); setSearchResults([]);
  }

  function resetSearch() {
    setShowSearch(false); setSelected(null);
    setSearchQuery(""); setSearchResults([]); setQty(""); setCost("");
  }

  function handleAdd() {
    if (!selected) return;
    const q = parseFloat(qty), c = parseFloat(cost);
    if (!q || isNaN(q) || isNaN(c) || q <= 0 || c < 0) return;
    startTransition(async () => {
      const res = await addHoldingAction({ ticker: selected.ticker, name: selected.name, asset_type: selected.asset_type, quantity: q, cost_basis: c });
      if ("error" in res) return;
      const newH: Holding = { id: res.id, ...selected, quantity: q, cost_basis: c };
      const next = [newH, ...holdings];
      setHoldings(next); holdingsRef.current = next;
      resetSearch();
      void loadPrices(next, false);
    });
  }

  function handleDelete(id: string) {
    const next = holdings.filter(h => h.id !== id);
    setHoldings(next); holdingsRef.current = next;
    startTransition(() => { void deleteHoldingAction(id); });
  }

  // ── CSV ──────────────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvRows(parseRobinhoodCSV(ev.target?.result as string));
    reader.readAsText(file); e.target.value = "";
  }

  function handleCsvImport() {
    if (!csvRows?.length) return;
    startTransition(async () => {
      const results = await Promise.all(csvRows.map(h => addHoldingAction(h)));
      const added: Holding[] = csvRows
        .map((h, i) => { const r = results[i]; return "id" in r ? { ...h, id: r.id } : null; })
        .filter(Boolean) as Holding[];
      const next = [...added, ...holdings];
      setHoldings(next); holdingsRef.current = next;
      setCsvRows(null);
      void loadPrices(next, false);
    });
  }

  // ── Portfolio math ───────────────────────────────────────────────────────
  const totalValue = holdings.reduce((s, h) => s + Number(h.quantity) * (prices[h.ticker]?.price ?? 0), 0);
  const totalCost  = holdings.reduce((s, h) => s + Number(h.quantity) * Number(h.cost_basis), 0);
  const totalPL    = totalValue - totalCost;
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
  const isUp       = totalPL >= 0;
  const pieData    = holdings
    .map((h, i) => ({ name: h.ticker, value: Number(h.quantity) * (prices[h.ticker]?.price ?? 0), color: COLORS[i % COLORS.length] }))
    .filter(d => d.value > 0);

  return (
    <div className="p-4 md:p-8 max-w-4xl w-full mx-auto overflow-y-auto h-full">
      <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleFileChange} />

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>Investments</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: initialLoading ? "rgba(245,240,232,0.3)" : "#4ADE80" }} />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full"
                style={{ background: initialLoading ? "rgba(245,240,232,0.3)" : "#4ADE80" }} />
            </span>
            <p className="text-[10px]" style={{ color: "rgba(245,240,232,0.3)" }}>
              {initialLoading ? "Fetching prices…"
                : updatedAt ? `Live · ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                : "Live"}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={() => loadPrices(holdingsRef.current, false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,235,180,0.1)", color: "rgba(245,240,232,0.5)" }}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,235,180,0.1)", color: "rgba(245,240,232,0.5)" }}>
            <Upload className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={() => { setShowSearch(v => !v); if (showSearch) resetSearch(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{ background: "rgba(200,144,10,0.12)", border: "1px solid rgba(200,144,10,0.3)", color: "#C8900A" }}>
            <Plus className="w-3.5 h-3.5" /> Add holding
          </button>
        </div>
      </div>

      {/* ── Robinhood connect banner ── */}
      {!rhConnected && !showConnect && (
        <button onClick={() => setShowConnect(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-6 text-left transition-all hover:opacity-90"
          style={{ background: "rgba(200,144,10,0.06)", border: "1px solid rgba(200,144,10,0.2)" }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(200,144,10,0.15)" }}>
            <Link className="w-3.5 h-3.5" style={{ color: "#C8900A" }} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold" style={{ color: "#C8900A" }}>Connect Robinhood</p>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>
              Sync your real positions automatically — no manual entry needed
            </p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(200,144,10,0.15)", color: "#C8900A" }}>
            Connect →
          </span>
        </button>
      )}

      {/* ── Robinhood connect form ── */}
      {!rhConnected && showConnect && (
        <div className="mb-6 p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,235,180,0.1)" }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: "#F5F0E8" }}>Connect Robinhood</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(245,240,232,0.4)" }}>Paste your Bearer token to sync positions automatically</p>
            </div>
            <button onClick={() => { setShowConnect(false); setRhError(""); }}>
              <X className="w-4 h-4" style={{ color: "rgba(245,240,232,0.3)" }} />
            </button>
          </div>

          {/* Step-by-step */}
          <div className="mb-4 p-4 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
            <p className="font-medium mb-2" style={{ color: "rgba(245,240,232,0.6)" }}>How to get your token:</p>
            {[
              "Open robinhood.com on desktop and log in",
              "Press F12 (Mac: Cmd+Option+I) to open DevTools",
              "Click the Network tab, then refresh the page",
              "Click any request to api.robinhood.com",
              "Under Request Headers, find Authorization",
              "Copy everything after \"Bearer \" and paste below",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2 mt-1.5">
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0 mt-0.5"
                  style={{ background: "rgba(200,144,10,0.15)", color: "#C8900A" }}>{i + 1}</span>
                <span style={{ color: "rgba(245,240,232,0.45)" }}>{step}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="password"
              value={rhToken}
              onChange={e => setRhToken(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleConnectRh()}
              placeholder="Paste token here…"
              className="flex-1 bg-transparent text-xs outline-none px-3 py-2.5 rounded-xl"
              style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.12)" }}
            />
            <button onClick={handleConnectRh} disabled={isPending || !rhToken.trim()}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-40"
              style={{ background: "rgba(200,144,10,0.2)", color: "#C8900A" }}>
              {isPending ? "Connecting…" : "Connect"}
            </button>
          </div>
          {rhError && <p className="text-[10px] mt-2" style={{ color: "#F87171" }}>{rhError}</p>}
        </div>
      )}

      {/* ── Robinhood connected bar ── */}
      {rhConnected && (
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl mb-6"
          style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.15)" }}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ADE80" }} />
            <p className="text-xs font-medium" style={{ color: "#4ADE80" }}>
              Robinhood connected
              {lastSynced && <span style={{ color: "rgba(74,222,128,0.6)" }}> · synced {lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
            </p>
            {syncMsg && <span className="text-[10px] ml-2" style={{ color: "rgba(245,240,232,0.4)" }}>{syncMsg}</span>}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => void handleSyncRh()} disabled={isPending}
              className="text-xs font-semibold disabled:opacity-40 transition-opacity"
              style={{ color: "#C8900A" }}>
              Sync now
            </button>
            <button onClick={handleDisconnectRh} disabled={isPending}
              className="flex items-center gap-1 text-[10px] disabled:opacity-40"
              style={{ color: "rgba(248,113,113,0.5)" }}>
              <Unlink className="w-3 h-3" /> Disconnect
            </button>
          </div>
        </div>
      )}

      {/* ── CSV preview ── */}
      {csvRows !== null && (
        <div className="mb-6 p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,235,180,0.1)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: "#F5F0E8" }}>
              {csvRows.length > 0 ? `${csvRows.length} holding${csvRows.length !== 1 ? "s" : ""} found` : "No valid holdings found"}
            </p>
            <button onClick={() => setCsvRows(null)}><X className="w-4 h-4" style={{ color: "rgba(245,240,232,0.3)" }} /></button>
          </div>
          {csvRows.length > 0 && (
            <>
              <div className="flex flex-col gap-1 mb-4 max-h-44 overflow-y-auto">
                {csvRows.map((h, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl text-xs"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.05)" }}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold" style={{ color: "#F5F0E8" }}>{h.ticker}</span>
                      <span style={{ color: "rgba(245,240,232,0.35)" }}>{h.name}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full"
                        style={{ background: h.asset_type === "crypto" ? "rgba(96,165,250,0.1)" : "rgba(200,144,10,0.1)", color: h.asset_type === "crypto" ? "#60A5FA" : "#C8900A" }}>
                        {h.asset_type}
                      </span>
                    </div>
                    <span style={{ color: "rgba(245,240,232,0.35)" }}>{fmtQty(h.quantity)} × ${fmt(h.cost_basis)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleCsvImport} disabled={isPending}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                  style={{ background: "rgba(200,144,10,0.2)", color: "#C8900A" }}>
                  Import all
                </button>
                <button onClick={() => setCsvRows(null)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: "rgba(245,240,232,0.35)" }}>Cancel</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Search / add panel ── */}
      {showSearch && (
        <div className="mb-6 p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,235,180,0.1)" }}>
          {!selected ? (
            <div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "rgba(245,240,232,0.3)" }} />
                <input autoFocus value={searchQuery} onChange={e => handleSearchChange(e.target.value)}
                  onKeyDown={e => e.key === "Escape" && resetSearch()}
                  placeholder="Search stocks or crypto — Apple, BTC, TSLA…"
                  className="w-full bg-transparent text-sm outline-none pl-9 pr-10 py-2.5 rounded-xl"
                  style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.12)" }} />
                {searching && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin pointer-events-none" style={{ color: "rgba(245,240,232,0.25)" }} />}
              </div>
              {searchResults.length > 0 && (
                <div className="flex flex-col gap-1 mb-3">
                  {searchResults.map(r => (
                    <button key={`${r.ticker}-${r.asset_type}`} onClick={() => handleSelect(r)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:opacity-80 transition-opacity"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,235,180,0.07)" }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: "#F5F0E8" }}>{r.ticker}</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full"
                            style={{ background: r.asset_type === "crypto" ? "rgba(96,165,250,0.1)" : "rgba(200,144,10,0.1)", color: r.asset_type === "crypto" ? "#60A5FA" : "#C8900A" }}>
                            {r.asset_type}
                          </span>
                        </div>
                        <p className="text-xs truncate mt-0.5" style={{ color: "rgba(245,240,232,0.4)" }}>{r.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={resetSearch} className="text-xs" style={{ color: "rgba(245,240,232,0.3)" }}>Cancel</button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-4 px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,235,180,0.08)" }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: "#F5F0E8" }}>{selected.ticker}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full"
                      style={{ background: selected.asset_type === "crypto" ? "rgba(96,165,250,0.1)" : "rgba(200,144,10,0.1)", color: selected.asset_type === "crypto" ? "#60A5FA" : "#C8900A" }}>
                      {selected.asset_type}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(245,240,232,0.4)" }}>{selected.name}</p>
                </div>
                <button onClick={() => { setSelected(null); setSearchQuery(""); }} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/5">
                  <X className="w-3.5 h-3.5" style={{ color: "rgba(245,240,232,0.4)" }} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <input autoFocus type="number" min="0" step="any" value={qty}
                  onChange={e => setQty(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()}
                  placeholder="Quantity"
                  className="bg-transparent text-sm outline-none px-3 py-2.5 rounded-xl"
                  style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.12)" }} />
                <input type="number" min="0" step="any" value={cost}
                  onChange={e => setCost(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()}
                  placeholder="Avg cost per unit ($)"
                  className="bg-transparent text-sm outline-none px-3 py-2.5 rounded-xl"
                  style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.12)" }} />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAdd} disabled={isPending}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                  style={{ background: "rgba(200,144,10,0.2)", color: "#C8900A" }}>
                  Add to portfolio
                </button>
                <button onClick={resetSearch} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: "rgba(245,240,232,0.35)" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Portfolio summary ── */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="col-span-2 p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.08)" }}>
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(245,240,232,0.3)" }}>Portfolio Value</p>
            {initialLoading
              ? <div className="h-8 w-36 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
              : <p className="text-3xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>${fmt(totalValue)}</p>}
            <p className="text-[10px] mt-1" style={{ color: "rgba(245,240,232,0.25)" }}>
              {holdings.length} holding{holdings.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="p-5 rounded-2xl" style={{
            background: isUp ? "rgba(74,222,128,0.05)" : "rgba(248,113,113,0.05)",
            border: `1px solid ${isUp ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)"}`,
          }}>
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(245,240,232,0.3)" }}>Unrealized P/L</p>
            {initialLoading
              ? <div className="h-8 w-24 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
              : <>
                  <p className="text-2xl font-semibold" style={{ color: isUp ? "#4ADE80" : "#F87171" }}>
                    {isUp ? "+" : "−"}${fmt(Math.abs(totalPL))}
                  </p>
                  <p className="text-xs mt-1 font-medium" style={{ color: isUp ? "#4ADE80" : "#F87171" }}>
                    {isUp ? "+" : ""}{fmt(totalPLPct)}% all time
                  </p>
                </>}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {holdings.length === 0 && !showSearch && csvRows === null && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <TrendingUp className="w-10 h-10" style={{ color: "rgba(245,240,232,0.07)" }} />
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.25)" }}>
            {rhConnected ? "Hit \"Sync now\" to pull your Robinhood positions" : "Connect Robinhood or search for holdings manually"}
          </p>
        </div>
      )}

      {/* ── Holdings + Pie ── */}
      {holdings.length > 0 && (
        <div className={`grid gap-8 ${pieData.length > 1 ? "md:grid-cols-[1fr_210px]" : ""}`}>
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "rgba(245,240,232,0.25)" }}>Holdings</p>
            <div className="flex flex-col gap-2">
              {holdings.map((h, i) => {
                const p      = prices[h.ticker];
                const q      = Number(h.quantity);
                const cb     = Number(h.cost_basis);
                const curVal = q * (p?.price ?? 0);
                const cost   = q * cb;
                const pl     = curVal - cost;
                const plPct  = cost > 0 ? (pl / cost) * 100 : 0;
                const up     = pl >= 0;
                const color  = COLORS[i % COLORS.length];
                return (
                  <div key={h.id} className="group flex items-center gap-3 px-4 py-4 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: "#F5F0E8" }}>{h.ticker}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full"
                          style={{ background: h.asset_type === "crypto" ? "rgba(96,165,250,0.1)" : "rgba(200,144,10,0.1)", color: h.asset_type === "crypto" ? "#60A5FA" : "#C8900A" }}>
                          {h.asset_type}
                        </span>
                      </div>
                      <p className="text-[10px] truncate" style={{ color: "rgba(245,240,232,0.35)" }}>{h.name}</p>
                      <p className="text-[10px]" style={{ color: "rgba(245,240,232,0.2)" }}>{fmtQty(q)} shares · avg ${fmt(cb)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {initialLoading
                        ? <div className="h-4 w-14 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
                        : p
                          ? <>
                              <p className="text-sm font-medium" style={{ color: "#F5F0E8" }}>${fmt(p.price)}</p>
                              <p className="text-[10px]" style={{ color: p.change >= 0 ? "#4ADE80" : "#F87171" }}>
                                {p.change >= 0 ? "+" : ""}{fmt(p.change)}%
                              </p>
                            </>
                          : <p className="text-xs" style={{ color: "rgba(245,240,232,0.2)" }}>—</p>}
                    </div>
                    <div className="text-right shrink-0 min-w-[90px]">
                      {initialLoading
                        ? <div className="h-4 w-20 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
                        : p
                          ? <>
                              <p className="text-sm font-semibold" style={{ color: "#F5F0E8" }}>${fmt(curVal)}</p>
                              <p className="text-[10px]" style={{ color: up ? "#4ADE80" : "#F87171" }}>
                                {up ? "+" : "−"}${fmt(Math.abs(pl))} ({up ? "+" : ""}{fmt(plPct)}%)
                              </p>
                            </>
                          : <p className="text-xs" style={{ color: "rgba(245,240,232,0.2)" }}>—</p>}
                    </div>
                    <button onClick={() => handleDelete(h.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 shrink-0">
                      <Trash2 className="w-3 h-3" style={{ color: "rgba(248,113,113,0.5)" }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {pieData.length > 1 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "rgba(245,240,232,0.25)" }}>Allocation</p>
              <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={68} dataKey="value" paddingAngle={3}>
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#0D0C0A", border: "1px solid rgba(200,144,10,0.25)", borderRadius: 8, padding: "6px 10px" }}
                      formatter={(v: unknown) => [`$${fmt(Number(v))}`, ""]}
                      labelStyle={{ color: "#F5F0E8", fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 mt-1">
                  {pieData.map(d => {
                    const pct = totalValue > 0 ? (d.value / totalValue) * 100 : 0;
                    return (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
                          <span className="text-[10px]" style={{ color: "rgba(245,240,232,0.5)" }}>{d.name}</span>
                        </div>
                        <span className="text-[10px]" style={{ color: "rgba(245,240,232,0.35)" }}>{fmt(pct, 1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
