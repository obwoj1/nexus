"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, CreditCard } from "lucide-react";
import { createSubscriptionAction, deleteSubscriptionAction } from "@/app/actions/tracking";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const PIE_COLORS = ["#C8900A", "#4ADE80", "#60A5FA", "#F87171", "#A78BFA", "#FB923C", "#34D399", "#F472B6"];

interface Subscription {
  id: string; name: string; amount: number; billing_cycle: string;
  next_billing_date: string | null; category: string | null;
}

const CATEGORIES = ["Streaming", "Software", "Fitness", "Music", "News", "Gaming", "Cloud", "Other"];
const CYCLES: { value: string; label: string; monthlyFactor: number }[] = [
  { value: "weekly",  label: "Weekly",  monthlyFactor: 4.33 },
  { value: "monthly", label: "Monthly", monthlyFactor: 1 },
  { value: "annual",  label: "Annual",  monthlyFactor: 1 / 12 },
];

function toMonthly(amount: number, cycle: string) {
  return amount * (CYCLES.find((c) => c.value === cycle)?.monthlyFactor ?? 1);
}

export function SubscriptionsSection({ subscriptions: initial }: { subscriptions: Subscription[] }) {
  const [subs, setSubs] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", billing_cycle: "monthly", next_billing_date: "", category: "Other" });

  const monthlyTotal = subs.reduce((sum, s) => sum + toMonthly(Number(s.amount), s.billing_cycle), 0);
  const annualTotal = monthlyTotal * 12;

  const categoryMap: Record<string, number> = {};
  subs.forEach((s) => {
    const cat = s.category ?? "Other";
    categoryMap[cat] = (categoryMap[cat] ?? 0) + toMonthly(Number(s.amount), s.billing_cycle);
  });
  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);

  function handleCreate() {
    if (!form.name || !form.amount) return;
    startTransition(async () => {
      const res = await createSubscriptionAction({
        name: form.name,
        amount: parseFloat(form.amount),
        billing_cycle: form.billing_cycle as "weekly" | "monthly" | "annual",
        next_billing_date: form.next_billing_date || null,
        category: form.category || null,
      });
      if ("error" in res) return;
      setSubs((prev) => [...prev, {
        id: res.id, name: form.name, amount: parseFloat(form.amount),
        billing_cycle: form.billing_cycle, next_billing_date: form.next_billing_date || null,
        category: form.category || null,
      }]);
      setForm({ name: "", amount: "", billing_cycle: "monthly", next_billing_date: "", category: "Other" });
      setShowForm(false);
    });
  }

  function handleDelete(id: string) {
    setSubs((prev) => prev.filter((s) => s.id !== id));
    startTransition(() => deleteSubscriptionAction(id));
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>Subscriptions</h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>Monthly burn & upcoming bills</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
          style={{ background: "rgba(200,144,10,0.12)", border: "1px solid rgba(200,144,10,0.3)", color: "#C8900A" }}>
          <Plus className="w-3.5 h-3.5" /> Add subscription
        </button>
      </div>

      {/* Burn summary */}
      {subs.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            { label: "Monthly burn", value: `$${monthlyTotal.toFixed(2)}` },
            { label: "Annual total",  value: `$${annualTotal.toFixed(2)}` },
          ].map((stat) => (
            <div key={stat.label} className="px-5 py-4 rounded-2xl"
              style={{ background: "rgba(200,144,10,0.06)", border: "1px solid rgba(200,144,10,0.15)" }}>
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(200,144,10,0.6)" }}>{stat.label}</p>
              <p className="text-2xl font-semibold" style={{ color: "#F5F0E8" }}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="mb-6 p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,235,180,0.1)" }}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Name (e.g. Netflix)" className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg col-span-2"
              style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)" }} />
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="Amount ($)" className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg"
              style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)" }} />
            <select value={form.billing_cycle} onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })}
              className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg"
              style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)", background: "#0D0C0A" }}>
              {CYCLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input type="date" value={form.next_billing_date} onChange={(e) => setForm({ ...form, next_billing_date: e.target.value })}
              className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg"
              style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)", colorScheme: "dark" }} />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="bg-transparent text-sm outline-none px-3 py-2 rounded-lg"
              style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)", background: "#0D0C0A" }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
              style={{ background: "rgba(200,144,10,0.2)", color: "#C8900A" }}>Add</button>
            <button onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ color: "rgba(245,240,232,0.4)" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* List */}
      {subs.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <CreditCard className="w-8 h-8" style={{ color: "rgba(245,240,232,0.1)" }} />
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.25)" }}>No subscriptions tracked yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {subs.map((sub) => {
            const monthly = toMonthly(Number(sub.amount), sub.billing_cycle);
            const daysUntil = sub.next_billing_date
              ? Math.ceil((new Date(sub.next_billing_date).getTime() - Date.now()) / 86400000)
              : null;
            return (
              <div key={sub.id} className="group flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-colors"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium truncate" style={{ color: "#F5F0E8" }}>{sub.name}</p>
                    {sub.category && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0"
                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(245,240,232,0.4)" }}>
                        {sub.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: "rgba(245,240,232,0.35)" }}>
                    {CYCLES.find((c) => c.value === sub.billing_cycle)?.label} · ${Number(sub.amount).toFixed(2)}
                    {daysUntil !== null && ` · ${daysUntil > 0 ? `${daysUntil}d` : "today"}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold" style={{ color: "#C8900A" }}>${monthly.toFixed(2)}<span className="text-xs font-normal" style={{ color: "rgba(245,240,232,0.3)" }}>/mo</span></p>
                </div>
                <button onClick={() => handleDelete(sub.id)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10">
                  <Trash2 className="w-3 h-3" style={{ color: "rgba(248,113,113,0.5)" }} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Chart */}
      {subs.length > 0 && categoryData.length > 0 && (
        <div className="mt-10">
          <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "rgba(245,240,232,0.25)" }}>Spending by category</p>
          <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.06)" }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#0D0C0A", border: "1px solid rgba(200,144,10,0.25)", borderRadius: 8, padding: "6px 10px" }}
                  formatter={(v) => [`$${(v as number).toFixed(2)}/mo`, ""]}
                  labelStyle={{ color: "#F5F0E8", fontSize: 11 }}
                />
                <Legend
                  iconType="circle"
                  iconSize={7}
                  formatter={(value) => <span style={{ color: "rgba(245,240,232,0.55)", fontSize: 10 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
