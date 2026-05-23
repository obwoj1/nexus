"use client";

import { useState, useRef, useTransition } from "react";
import { Plus, Trash2, Loader2, Shirt } from "lucide-react";
import { uploadWardrobeItemAction, deleteWardrobeItemAction } from "@/app/actions/wardrobe";

const CATEGORIES = ["top", "bottom", "shoes", "outerwear", "headwear", "accessory"] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_LABELS: Record<Category, string> = {
  top: "Tops", bottom: "Bottoms", shoes: "Shoes",
  outerwear: "Outerwear", headwear: "Headwear", accessory: "Accessories",
};

interface WardrobeItem {
  id: string; storage_path: string; url: string;
  category: string; color: string | null; description: string | null; brand: string | null;
}

export function WardrobeSection({ initialItems }: { initialItems: WardrobeItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [activeFilter, setActiveFilter] = useState<Category | "all">("all");
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = activeFilter === "all" ? items : items.filter((i) => i.category === activeFilter);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadError("");

    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadWardrobeItemAction(fd);
      if ("error" in res) { setUploadError(res.error ?? "Upload failed"); break; }
      const newItem: WardrobeItem = {
        id: res.id, storage_path: "", url: res.url,
        category: res.category, color: res.color ?? null,
        description: res.description ?? null, brand: res.brand ?? null,
      };
      setItems((prev) => [newItem, ...prev]);
    }
    setUploading(false);
  }

  function handleDelete(item: WardrobeItem) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    startTransition(() => { void deleteWardrobeItemAction(item.id, item.storage_path); });
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>Wardrobe</h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>
            {items.length} item{items.length !== 1 ? "s" : ""} · Claudia auto-categorizes on upload
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-50"
          style={{ background: "rgba(200,144,10,0.12)", border: "1px solid rgba(200,144,10,0.3)", color: "#C8900A" }}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {uploading ? "Analyzing…" : "Add Clothes"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => handleUpload(e.target.files)} />
      </div>

      {uploadError && (
        <p className="mb-4 text-xs px-3 py-2 rounded-lg" style={{ color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
          {uploadError}
        </p>
      )}

      {/* Category filter pills */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {(["all", ...CATEGORIES] as const).map((cat) => {
            const count = cat === "all" ? items.length : items.filter((i) => i.category === cat).length;
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
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Shirt className="w-10 h-10" style={{ color: "rgba(245,240,232,0.08)" }} />
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.25)" }}>No clothes added yet</p>
          <button onClick={() => fileRef.current?.click()}
            className="text-xs px-4 py-2 rounded-xl"
            style={{ background: "rgba(200,144,10,0.1)", border: "1px solid rgba(200,144,10,0.25)", color: "#C8900A" }}>
            Add your first item
          </button>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {filtered.map((item) => (
            <div key={item.id} className="group relative rounded-2xl overflow-hidden aspect-square"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,235,180,0.07)" }}>
              {item.url
                ? <img src={item.url} alt={item.description ?? item.category} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Shirt className="w-6 h-6 opacity-20" /></div>
              }
              {/* Overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%)" }}>
                <button onClick={() => handleDelete(item)} disabled={isPending}
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
              {/* Category badge */}
              <div className="absolute top-1.5 left-1.5">
                <span className="text-[9px] px-1.5 py-0.5 rounded-full capitalize font-medium"
                  style={{ background: "rgba(0,0,0,0.7)", color: "rgba(245,240,232,0.7)" }}>
                  {item.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
