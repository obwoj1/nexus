"use client";

import { useState, useEffect, useTransition } from "react";
import { Plus, Trash2, RefreshCw, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { addHoldingAction, deleteHoldingAction, fetchPricesAction } from "@/app/actions/investments";
import type { Holding, PriceData } from "@/lib/investments";

const COLORS = [
  "#C8900A", "#4ADE80", "#60A5FA", "#F87171",
  "#A78BFA", "#FB923C", "#34D399", "#F472B6",
  "#FBBF24", "#38BDF8",
];

function fmt(n: number, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtQty(n: number) {
  if (Number.isInteger(n)) return n.toString();
  return parseFloat(n.toFixed(8)).toString();
}

export function InvestmentsShell({ initialHoldings }: { initialHoldings: Holding[] }) {
  const [holdings, setHoldings]         = useState(initialHoldings);
  const [prices, setPrices]             = useState<Record<string, PriceData>>({});
  const [pricesLoading, setPricesLoading] = useState(true);
  const [updatedAt, setUpdatedAt]       = useState<Date | null>(null);
  const [showForm, setShowForm]         = useState(false);
  const [isPending, startTransition]    = useTransition();
  const [form, setForm] = useState({
    ticker:     "",
    name:       "",
    asset_type: "stock" as "stock" | "crypto",
    quantity:   "",
    cost_basis: "",
  });

  useEffect(() => {
    void loadPrices(initialHoldings);
    // Poll every 10 seconds for live price updates
    const interval = setInterval(() => void loadPrices(), 10_000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line

  async function loadPrices(hs: Holding[] = holdings) {
    setPricesLoading(true);
    const data = await fetchPricesAction(hs.map(h => ({ ticker: h.ticker, asset_type: h.asset_type })));
    setPrices(data);
    setUpdatedAt(new Date());
    setPricesLoading(false);
  }

  function handleAdd() {
    const qty  = parseFloat(form.quantity);
    const cost = parseFloat(form.cost_basis);
    if (!form.ticker.trim() || !form.name.trim() || !qty || isNaN(qty) || isNaN(cost) || qty <= 0 || cost < 0) return;

    startTransition(async () => {
      const res = await addHoldingAction({
        ticker:     form.ticker.toUpperCase().trim(),
        name:       form.name.trim(),
        asset_type: form.asset_type,
        quantity:   qty,
        cost_basis: cost,
      });
      if ("error" in res) return;

      const newH: Holding = {
        id:         res.id,
        ticker:     form.ticker.toUpperCase().trim(),
        name:       form.name.trim(),
        asset_type: form.asset_type,
        quantity:   qty,
        cost_basis: cost,
      };
      const next = [newH, ...holdings];
      setHoldings(next);
      setForm({ ticker: "", name: "", asset_type: "stock", quantity: "", cost_basis: "" });
      setShowForm(false);
      void loadPrices(next);
    });
  }

  function handleDelete(id: string) {
    setHoldings(prev => prev.filter(h => h.id !== id));
    startTransition(() => { void deleteHoldingAction(id); });
  }

  // Portfolio math
  const totalValue = holdings.reduce((s, h) => s + Number(h.quantity) * (prices[h.ticker]?.price ?? 0), 0);
  const totalCost  = holdings.reduce((s, h) => s + Number(h.quantity) * Number(h.cost_basis), 0);
  const totalPL    = totalValue - totalCost;
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
  const isUp       = totalPL >= 0;

  const pieData = holdings
    .map((h, i) => ({
      name:  h.ticker,
      value: Number(h.quantity) * (prices[h.ticker]?.price ?? 0),
      color: COLORS[i % COLORS.length],
    }))
    .filter(d => d.value > 0);

  return (
    <div className="p-4 md:p-8 max-w-4xl w-full mx-auto overflow-y-auto h-full">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>Investments</h1>
          <div className="flex items-center gap-1.5 mt-1">
            {/* Live pulse dot */}
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: pricesLoading ? "rgba(245,240,232,0.3)" : "#4ADE80" }} />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full"
                style={{ background: pricesLoading ? "rgba(245,240,232,0.3)" : "#4ADE80" }} />
            </span>
            <p className="text-[10px]" style={{ color: "rgba(245,240,232,0.3)" }}>
              {pricesLoading
                ? "Fetching…"
                : updatedAt
                  ? `Live · ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                  : "Live"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadPrices()}
            disabled={pricesLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,235,180,0.1)", color: "rgba(245,240,232,0.6)" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${pricesLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{ background: "rgba(200,144,10,0.12)", border: "1px solid rgba(200,144,10,0.3)", color: "#C8900A" }}
          >
            <Plus className="w-3.5 h-3.5" /> Add holding
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* Total value */}
          <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.08)" }}>
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(245,240,232,0.3)" }}>Portfolio Value</p>
            {pricesLoading
              ? <div className="h-7 w-28 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
              : <p className="text-2xl font-semibold" style={{ color: "#F5F0E8" }}>${fmt(totalValue)}</p>}
          </div>

          {/* Cost basis */}
          <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.08)" }}>
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(245,240,232,0.3)" }}>Total Cost</p>
            <p className="text-2xl font-semibold" style={{ color: "#F5F0E8" }}>${fmt(totalCost)}</p>
          </div>

          {/* P/L */}
          <div className="p-5 rounded-2xl" style={{
            background: isUp ? "rgba(74,222,128,0.05)" : "rgba(248,113,113,0.05)",
            border: `1px solid ${isUp ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)"}`,
          }}>
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(245,240,232,0.3)" }}>Unrealized P/L</p>
            {pricesLoading
              ? <div className="h-7 w-28 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
              : <>
                  <p className="text-2xl font-semibold" style={{ color: isUp ? "#4ADE80" : "#F87171" }}>
                    {isUp ? "+" : "−"}${fmt(Math.abs(totalPL))}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: isUp ? "#4ADE80" : "#F87171" }}>
                    {isUp ? "+" : ""}{fmt(totalPLPct)}%
                  </p>
                </>}
          </div>
        </div>
      )}

      {/* ── Add holding form ── */}
      {showForm && (
        <div className="mb-6 p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,235,180,0.1)" }}>
          {/* Stock / Crypto toggle */}
          <div className="flex gap-2 mb-4">
            {(["stock", "crypto"] as const).map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, asset_type: t }))}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize"
                style={{
                  background: form.asset_type === t ? "rgba(200,144,10,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${form.asset_type === t ? "rgba(200,144,10,0.3)" : "rgba(255,235,180,0.08)"}`,
                  color: form.asset_type === t ? "#C8900A" : "rgba(245,240,232,0.4)",
                }}>
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              autoFocus
              value={form.ticker}
              onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder={form.asset_type === "crypto" ? "BTC, ETH, SOL…" : "AAPL, TSLA, MSFT…"}
              className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg tracking-wider"
              style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)" }}
            />
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Name (e.g. Apple Inc.)"
              className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg"
              style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)" }}
            />
            <input
              type="number" min="0" step="any"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              placeholder="Quantity"
              className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg"
              style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)" }}
            />
            <input
              type="number" min="0" step="any"
              value={form.cost_basis}
              onChange={e => setForm(f => ({ ...f, cost_basis: e.target.value }))}
              placeholder="Avg cost per unit ($)"
              className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg"
              style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)" }}
            />
          </div>

          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
              style={{ background: "rgba(200,144,10,0.2)", color: "#C8900A" }}>
              Add
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ color: "rgba(245,240,232,0.4)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {holdings.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <TrendingUp className="w-10 h-10" style={{ color: "rgba(245,240,232,0.08)" }} />
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.25)" }}>
            Add your first holding to track your portfolio
          </p>
        </div>
      )}

      {/* ── Holdings + Pie ── */}
      {holdings.length > 0 && (
        <div className={`grid gap-8 ${pieData.length > 1 ? "md:grid-cols-[1fr_220px]" : ""}`}>

          {/* Holdings list */}
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "rgba(245,240,232,0.25)" }}>Holdings</p>
            <div className="flex flex-col gap-2">
              {holdings.map((h, i) => {
                const p          = prices[h.ticker];
                const qty        = Number(h.quantity);
                const cb         = Number(h.cost_basis);
                const curVal     = qty * (p?.price ?? 0);
                const cost       = qty * cb;
                const pl         = curVal - cost;
                const plPct      = cost > 0 ? (pl / cost) * 100 : 0;
                const up         = pl >= 0;
                const color      = COLORS[i % COLORS.length];

                return (
                  <div key={h.id}
                    className="group flex items-center gap-3 px-4 py-4 rounded-2xl transition-colors"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>

                    {/* Dot */}
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />

                    {/* Ticker + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: "#F5F0E8" }}>{h.ticker}</span>
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                          style={{
                            background: h.asset_type === "crypto" ? "rgba(96,165,250,0.1)" : "rgba(200,144,10,0.1)",
                            color:      h.asset_type === "crypto" ? "#60A5FA" : "#C8900A",
                          }}>
                          {h.asset_type}
                        </span>
                      </div>
                      <p className="text-[10px] truncate" style={{ color: "rgba(245,240,232,0.35)" }}>{h.name}</p>
                      <p className="text-[10px]" style={{ color: "rgba(245,240,232,0.2)" }}>
                        {fmtQty(qty)} × ${fmt(cb)}
                      </p>
                    </div>

                    {/* Live price + 24h change */}
                    <div className="text-right shrink-0">
                      {pricesLoading
                        ? <div className="h-4 w-16 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
                        : p
                          ? <>
                              <p className="text-sm font-medium" style={{ color: "#F5F0E8" }}>${fmt(p.price)}</p>
                              <p className="text-[10px]" style={{ color: p.change >= 0 ? "#4ADE80" : "#F87171" }}>
                                {p.change >= 0 ? "+" : ""}{fmt(p.change)}%
                              </p>
                            </>
                          : <p className="text-xs" style={{ color: "rgba(245,240,232,0.2)" }}>—</p>}
                    </div>

                    {/* Current value + P/L */}
                    <div className="text-right shrink-0 min-w-[90px]">
                      {pricesLoading
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

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(h.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 shrink-0">
                      <Trash2 className="w-3 h-3" style={{ color: "rgba(248,113,113,0.5)" }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Allocation pie */}
          {pieData.length > 1 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "rgba(245,240,232,0.25)" }}>Allocation</p>
              <div className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" paddingAngle={3}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#0D0C0A", border: "1px solid rgba(200,144,10,0.25)", borderRadius: 8, padding: "6px 10px" }}
                      formatter={(v: unknown) => [`$${fmt(Number(v))}`, ""]}
                      labelStyle={{ color: "#F5F0E8", fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 mt-2">
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
