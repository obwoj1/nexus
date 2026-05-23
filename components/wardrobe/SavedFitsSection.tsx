"use client";

import { useState, useTransition } from "react";
import { Trash2, CheckCheck, BookMarked } from "lucide-react";
import { deleteOutfitAction, markOutfitWornAction } from "@/app/actions/wardrobe";

interface SavedOutfit {
  id: string; name: string; item_ids: string[]; generated_image_path: string | null;
  imageUrl: string; caption: string | null; worn_count: number; last_worn: string | null; created_at: string;
}

interface WardrobeItem {
  id: string; url: string; category: string; description: string | null;
}

export function SavedFitsSection({ initialOutfits, items }: { initialOutfits: SavedOutfit[]; items: WardrobeItem[] }) {
  const [outfits, setOutfits] = useState(initialOutfits);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    setOutfits((prev) => prev.filter((o) => o.id !== id));
    startTransition(() => { void deleteOutfitAction(id); });
  }

  function handleWorn(outfit: SavedOutfit) {
    setOutfits((prev) => prev.map((o) => o.id === outfit.id
      ? { ...o, worn_count: o.worn_count + 1, last_worn: new Date().toISOString().split("T")[0] }
      : o
    ));
    startTransition(() => { void markOutfitWornAction(outfit.id); });
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h2 className="text-xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>Saved Fits</h2>
        <p className="text-xs mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>
          {outfits.length} fit{outfits.length !== 1 ? "s" : ""} saved
        </p>
      </div>

      {outfits.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <BookMarked className="w-10 h-10" style={{ color: "rgba(245,240,232,0.08)" }} />
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.25)" }}>No saved fits yet — ask Claudia to build one</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {outfits.map((outfit) => {
          const isOpen = expanded === outfit.id;
          const pieces = items.filter((i) => outfit.item_ids.includes(i.id));

          return (
            <div key={outfit.id}
              className="rounded-2xl overflow-hidden cursor-pointer transition-all"
              style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${isOpen ? "rgba(200,144,10,0.3)" : "rgba(255,235,180,0.07)"}` }}
              onClick={() => setExpanded(isOpen ? null : outfit.id)}>

              {/* Generated flat-lay image */}
              {outfit.imageUrl && (
                <div className="aspect-[3/4] overflow-hidden">
                  <img src={outfit.imageUrl} alt={outfit.name} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Info row */}
              <div className="px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#F5F0E8" }}>{outfit.name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "rgba(245,240,232,0.35)" }}>
                      Worn {outfit.worn_count}× {outfit.last_worn ? `· last ${new Date(outfit.last_worn + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-3 pb-3 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                  {outfit.caption && (
                    <p className="text-xs leading-relaxed italic" style={{ color: "rgba(245,240,232,0.5)" }}>
                      "{outfit.caption}"
                    </p>
                  )}

                  {pieces.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {pieces.map((item) => (
                        <div key={item.id} className="w-10 h-10 rounded-lg overflow-hidden"
                          style={{ border: "1px solid rgba(255,235,180,0.1)" }}>
                          {item.url && <img src={item.url} alt={item.description ?? item.category} className="w-full h-full object-cover" />}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => handleWorn(outfit)} disabled={isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80" }}>
                      <CheckCheck className="w-3 h-3" /> Wore this
                    </button>
                    <button onClick={() => handleDelete(outfit.id)} disabled={isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", color: "rgba(248,113,113,0.7)" }}>
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
