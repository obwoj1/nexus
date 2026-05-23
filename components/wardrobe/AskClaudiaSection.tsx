"use client";

import { useState } from "react";
import { Sparkles, Send, Loader2, BookMarked, Check } from "lucide-react";
import { generateOutfitAction, saveOutfitAction } from "@/app/actions/wardrobe";

interface WardrobeItem {
  id: string; url: string; category: string;
  color: string | null; description: string | null; brand: string | null;
}

interface GeneratedOutfit {
  caption: string;
  itemIds: string[];
  imageUrl: string;
  imagePath: string;
}

const VIBES = ["cozy day out", "gym fit", "lowkey drip", "night out", "casual errands", "clean & simple"];

export function AskClaudiaSection({ items }: { items: WardrobeItem[] }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [outfit, setOutfit] = useState<GeneratedOutfit | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleGenerate() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");
    setOutfit(null);
    setSaved(false);

    const res = await generateOutfitAction(prompt.trim());
    if ("error" in res) { setError(res.error ?? "Something went wrong"); setLoading(false); return; }
    setOutfit(res);
    setLoading(false);
  }

  async function handleSave() {
    if (!outfit || saving) return;
    setSaving(true);
    const name = prompt.trim().slice(0, 60) || "Saved fit";
    const res = await saveOutfitAction(name, outfit.itemIds, outfit.imagePath, outfit.caption);
    setSaving(false);
    if (!("error" in res)) setSaved(true);
  }

  const selectedItems = items.filter((i) => outfit?.itemIds.includes(i.id));

  return (
    <div className="p-4 md:p-8 max-w-2xl w-full">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>Ask Claudia</h2>
        <p className="text-xs mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>
          Describe the vibe or occasion — Claudia picks the fit from your wardrobe
        </p>
      </div>

      {items.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.3)" }}>Add clothes to your wardrobe first</p>
        </div>
      )}

      {items.length > 0 && (
        <>
          {/* Quick vibe chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {VIBES.map((v) => (
              <button key={v} onClick={() => setPrompt(v ?? "")}
                className="px-3 py-1 rounded-full text-xs transition-all"
                style={{
                  background: prompt === v ? "rgba(200,144,10,0.15)" : "rgba(255,255,255,0.04)",
                  border: prompt === v ? "1px solid rgba(200,144,10,0.35)" : "1px solid rgba(255,235,180,0.08)",
                  color: prompt === v ? "#C8900A" : "rgba(245,240,232,0.4)",
                }}>
                {v}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2 mb-6">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="e.g. cozy fit for a coffee run, or lowkey drip for the mall…"
              className="flex-1 bg-transparent text-sm outline-none px-4 py-3 rounded-xl"
              style={{ color: "#F5F0E8", border: "1px solid rgba(255,235,180,0.1)", caretColor: "#C8900A" }}
            />
            <button onClick={handleGenerate} disabled={loading || !prompt.trim()}
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
              style={{ background: "rgba(200,144,10,0.15)", border: "1px solid rgba(200,144,10,0.3)" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#C8900A" }} />
                : <Send className="w-4 h-4" style={{ color: "#C8900A" }} />}
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Sparkles className="w-8 h-8 animate-pulse" style={{ color: "#C8900A" }} />
              <p className="text-sm" style={{ color: "rgba(245,240,232,0.4)" }}>Claudia is building your fit…</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
              {error}
            </p>
          )}

          {/* Result */}
          {outfit && !loading && (
            <div className="flex flex-col gap-5">
              {/* Generated flat-lay */}
              {outfit.imageUrl && (
                <div className="rounded-2xl overflow-hidden"
                  style={{ border: "1px solid rgba(200,144,10,0.2)", background: "rgba(255,255,255,0.02)" }}>
                  <img src={outfit.imageUrl} alt="Generated outfit flat-lay" className="w-full object-cover max-h-[500px]" />
                </div>
              )}

              {/* Caption */}
              <div className="px-5 py-4 rounded-2xl"
                style={{ background: "rgba(200,144,10,0.06)", border: "1px solid rgba(200,144,10,0.15)" }}>
                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(200,144,10,0.6)" }}>
                  Claudia's take
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(245,240,232,0.8)" }}>{outfit.caption}</p>
              </div>

              {/* Selected items strip */}
              {selectedItems.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(245,240,232,0.3)" }}>
                    Pieces in this fit
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedItems.map((item) => (
                      <div key={item.id} className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
                        style={{ border: "1px solid rgba(200,144,10,0.25)" }}>
                        {item.url
                          ? <img src={item.url} alt={item.description ?? item.category} className="w-full h-full object-cover" />
                          : <div className="w-full h-full" style={{ background: "rgba(255,255,255,0.05)" }} />}
                        <div className="absolute bottom-0 inset-x-0 px-1 py-0.5"
                          style={{ background: "rgba(0,0,0,0.7)" }}>
                          <p className="text-[8px] capitalize truncate" style={{ color: "rgba(245,240,232,0.7)" }}>{item.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save button */}
              <button onClick={handleSave} disabled={saving || saved}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium self-start disabled:opacity-50"
                style={{
                  background: saved ? "rgba(74,222,128,0.1)" : "rgba(200,144,10,0.12)",
                  border: saved ? "1px solid rgba(74,222,128,0.3)" : "1px solid rgba(200,144,10,0.3)",
                  color: saved ? "#4ade80" : "#C8900A",
                }}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <BookMarked className="w-3.5 h-3.5" />}
                {saving ? "Saving…" : saved ? "Saved!" : "Save this fit"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
