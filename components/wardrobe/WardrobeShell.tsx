"use client";

import { useState } from "react";
import { Shirt, Sparkles, BookMarked } from "lucide-react";
import { WardrobeSection } from "./WardrobeSection";
import { AskClaudiaSection } from "./AskClaudiaSection";
import { SavedFitsSection } from "./SavedFitsSection";

type Section = "wardrobe" | "ask" | "saved";

const NAV: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: "wardrobe", label: "Wardrobe", icon: <Shirt className="w-4 h-4" /> },
  { key: "ask",      label: "Ask Claudia", icon: <Sparkles className="w-4 h-4" /> },
  { key: "saved",    label: "Saved Fits",  icon: <BookMarked className="w-4 h-4" /> },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function WardrobeShell({ items, outfits }: { items: any[]; outfits: any[] }) {
  const [active, setActive] = useState<Section>("wardrobe");

  return (
    <div className="flex flex-1 overflow-hidden">
      <nav className="w-[180px] shrink-0 flex flex-col py-4 gap-1 px-2"
        style={{ borderRight: "1px solid rgba(255,235,180,0.07)" }}>
        {NAV.map((item) => {
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              onClick={() => setActive(item.key)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative"
              style={{
                background: isActive ? "rgba(200,144,10,0.1)" : "transparent",
                border: isActive ? "1px solid rgba(200,144,10,0.2)" : "1px solid transparent",
                color: isActive ? "#F5F0E8" : "rgba(245,240,232,0.45)",
              }}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                  style={{ background: "linear-gradient(180deg,#C8900A,#F5CE58)" }} />
              )}
              <span style={{ color: isActive ? "#C8900A" : "rgba(245,240,232,0.35)" }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 overflow-y-auto">
        {active === "wardrobe" && <WardrobeSection initialItems={items} />}
        {active === "ask"      && <AskClaudiaSection items={items} />}
        {active === "saved"    && <SavedFitsSection initialOutfits={outfits} items={items} />}
      </div>
    </div>
  );
}
