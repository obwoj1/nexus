"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, Loader2, Shirt, Sparkles, CheckCircle2, Circle } from "lucide-react";
import { uploadWardrobeItemAction, deleteWardrobeItemAction, analyzeWardrobeItemsAction } from "@/app/actions/wardrobe";

const CATEGORIES = ["top", "bottom", "shoes", "outerwear", "headwear", "accessory"] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_LABELS: Record<Category, string> = {
  top: "Tops", bottom: "Bottoms", shoes: "Shoes",
  outerwear: "Outerwear", headwear: "Headwear", accessory: "Accessories",
};

interface WardrobeItem {
  id: string;
  storage_path: string;
  url: string;
  category: string | null;
  color: string | null;
  description: string | null;
  brand: string | null;
  analyzed: boolean;
}

export function WardrobeSection({ initialItems }: { initialItems: WardrobeItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [activeFilter, setActiveFilter] = useState<Category | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pending = items.filter((i) => !i.analyzed);
  const analyzed = items.filter((i) => i.analyzed);
  const filtered = activeFilter === "all" ? analyzed : analyzed.filter((i) => i.category === activeFilter);

  // ── Upload (instant, no Gemini) ──────────────────────────────────────────

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadError("");

    const uploads = await Promise.all(
      Array.from(files).map(async (file) => {
        const fd = new FormData();
        fd.append("file", file);
        return uploadWardrobeItemAction(fd);
      })
    );

    const newItems: WardrobeItem[] = [];
    for (const res of uploads) {
      if ("error" in res) { setUploadError(res.error ?? "Upload failed"); continue; }
      newItems.push({ id: res.id, storage_path: "", url: res.url, category: null, color: null, description: null, brand: null, analyzed: false });
    }
    setItems((prev) => [...newItems, ...prev]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Select pending items ─────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(pending.map((i) => i.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  // ── Analyze selected (parallel Gemini calls) ─────────────────────────────

  async function handleAnalyze() {
    if (!selected.size || analyzing) return;
    setAnalyzing(true);

    const ids = Array.from(selected);
    const res = await analyzeWardrobeItemsAction(ids);

    if ("error" in res) {
      setUploadError(res.error ?? "Analysis failed");
      setAnalyzing(false);
      return;
    }

    // Update items in place with Gemini results
    const resultMap = Object.fromEntries(res.results.map((r) => [r.id, r]));
    setItems((prev) =>
      prev.map((item) => {
        const result = resultMap[item.id];
        if (!result) return item;
        return { ...item, category: result.category, color: result.color, description: result.description, brand: result.brand, analyzed: true };
      })
    );

    setSelected(new Set());
    setAnalyzing(false);
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  function handleDelete(item: WardrobeItem) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setSelected((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
    void deleteWardrobeItemAction(item.id, item.storage_path);
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>Wardrobe</h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>
            {analyzed.length} item{analyzed.length !== 1 ? "s" : ""}{pending.length > 0 ? ` · ${pending.length} pending analysis` : ""}
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-50"
          style={{ background: "rgba(200,144,10,0.12)", border: "1px solid rgba(200,144,10,0.3)", color: "#C8900A" }}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {uploading ? "Uploading…" : "Add Clothes"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => handleUpload(e.target.files)} />
      </div>

      {uploadError && (
        <p className="mb-4 text-xs px-3 py-2 rounded-lg"
          style={{ color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
          {uploadError}
        </p>
      )}

      {/* ── Pending section ── */}
      {pending.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "rgba(245,240,232,0.4)" }}>
                Pending — select to analyze
              </p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(200,144,10,0.12)", color: "#C8900A", border: "1px solid rgba(200,144,10,0.25)" }}>
                {pending.length}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {selected.size < pending.length
                ? <button onClick={selectAll} className="text-xs" style={{ color: "rgba(245,240,232,0.4)" }}>Select all</button>
                : <button onClick={clearSelection} className="text-xs" style={{ color: "rgba(245,240,232,0.4)" }}>Clear</button>
              }
              {selected.size > 0 && (
                <button onClick={handleAnalyze} disabled={analyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-50"
                  style={{ background: "rgba(200,144,10,0.15)", border: "1px solid rgba(200,144,10,0.35)", color: "#C8900A" }}>
                  {analyzing
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing {selected.size}…</>
                    : <><Sparkles className="w-3.5 h-3.5" /> Analyze {selected.size}</>
                  }
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {pending.map((item) => {
              const isSelected = selected.has(item.id);
              return (
                <div key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className="group relative rounded-2xl overflow-hidden aspect-square cursor-pointer transition-all"
                  style={{
                    border: isSelected ? "2px solid #C8900A" : "1px solid rgba(255,235,180,0.1)",
                    background: "rgba(255,255,255,0.03)",
                    opacity: analyzing && !isSelected ? 0.4 : 1,
                  }}>
                  {item.url
                    ? <img src={item.url} alt="clothing item" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Shirt className="w-6 h-6 opacity-20" /></div>
                  }
                  {/* Selection indicator */}
                  <div className="absolute top-1.5 right-1.5">
                    {isSelected
                      ? <CheckCircle2 className="w-5 h-5 drop-shadow" style={{ color: "#C8900A" }} />
                      : <Circle className="w-5 h-5 opacity-50 drop-shadow" style={{ color: "rgba(255,255,255,0.6)" }} />
                    }
                  </div>
                  {/* Analyzing spinner overlay */}
                  {analyzing && isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.55)" }}>
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#C8900A" }} />
                    </div>
                  )}
                  {/* Delete on hover */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                    className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    style={{ background: "rgba(0,0,0,0.7)" }}>
                    <Trash2 className="w-3 h-3" style={{ color: "rgba(248,113,113,0.8)" }} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Analyzed wardrobe ── */}
      {analyzed.length > 0 && (
        <>
          {/* Category filter pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(["all", ...CATEGORIES] as const).map((cat) => {
              const count = cat === "all" ? analyzed.length : analyzed.filter((i) => i.category === cat).length;
              if (cat !== "all" && count === 0) return null;
              const isActive = activeFilter === cat;
              return (
                <button key={cat} onClick={() => setActiveFilter(cat)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: isActive ? "rgba(200,144,10,0.15)" : "rgba(255,255,255,0.04)",
                    border: isActive ? "1px solid rgba(200,144,10,0.4)" : "1px solid rgba(255,235,180,0.08)",
                    color: isActive ? "#C8900A" : "rgba(245,240,232,0.45)",
                  }}>
                  {cat === "all" ? "All" : CATEGORY_LABELS[cat]} ({count})
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {filtered.map((item) => (
              <div key={item.id} className="group relative rounded-2xl overflow-hidden aspect-square"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,235,180,0.07)" }}>
                {item.url
                  ? <img src={item.url} alt={item.description ?? item.category ?? ""} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Shirt className="w-6 h-6 opacity-20" /></div>
                }
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%)" }}>
                  <button onClick={() => handleDelete(item)}
                    className="self-end w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.6)" }}>
                    <Trash2 className="w-3 h-3" style={{ color: "rgba(248,113,113,0.8)" }} />
                  </button>
                  <div>
                    <p className="text-[10px] font-medium capitalize" style={{ color: "#F5F0E8" }}>
                      {item.color ? `${item.color} ` : ""}{item.category}
                    </p>
                    {item.description && (
                      <p className="text-[9px] leading-tight mt-0.5 line-clamp-2" style={{ color: "rgba(245,240,232,0.5)" }}>
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="absolute top-1.5 left-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full capitalize font-medium"
                    style={{ background: "rgba(0,0,0,0.7)", color: "rgba(245,240,232,0.7)" }}>
                    {item.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Shirt className="w-10 h-10" style={{ color: "rgba(245,240,232,0.08)" }} />
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.25)" }}>No clothes yet</p>
          <button onClick={() => fileRef.current?.click()}
            className="text-xs px-4 py-2 rounded-xl"
            style={{ background: "rgba(200,144,10,0.1)", border: "1px solid rgba(200,144,10,0.25)", color: "#C8900A" }}>
            Add your first items
          </button>
        </div>
      )}
    </div>
  );
}
