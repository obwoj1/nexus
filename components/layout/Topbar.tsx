"use client";

import { Bell, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface TopbarProps {
  section?: string;
  title: string;
}

export function Topbar({ section = "NEXUS", title }: TopbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <header className="h-[64px] flex items-center justify-between px-8"
      style={{ borderBottom: "1px solid rgba(255,235,180,0.07)" }}>

      {/* Left — section + title */}
      <div>
        <p className="text-[10px] tracking-[0.2em] uppercase font-medium mb-0.5"
          style={{ color: "rgba(245,240,232,0.35)" }}>
          {section}
        </p>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>
          {title}
        </h1>
      </div>

      {/* Right — search + bell + avatar */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl cursor-pointer transition-colors duration-200 hover:bg-[rgba(255,235,180,0.05)]"
          style={{
            background: "rgba(255,235,180,0.04)",
            border: "1px solid rgba(255,235,180,0.08)",
          }}>
          <Search className="w-3.5 h-3.5" style={{ color: "rgba(245,240,232,0.35)" }} />
          <span className="text-sm" style={{ color: "rgba(245,240,232,0.35)" }}>Search…</span>
          <kbd className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-mono"
            style={{
              background: "rgba(255,235,180,0.06)",
              border: "1px solid rgba(255,235,180,0.1)",
              color: "rgba(245,240,232,0.4)",
            }}>
            ⌘K
          </kbd>
        </div>

        {/* Bell */}
        <button className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200 hover:bg-[rgba(255,235,180,0.05)]"
          style={{ border: "1px solid rgba(255,235,180,0.08)" }}>
          <Bell className="w-4 h-4" style={{ color: "rgba(245,240,232,0.4)" }} />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #7A4800 0%, #C8900A 50%, #F5CE58 100%)",
            color: "#080705",
            boxShadow: "0 0 12px rgba(200,144,10,0.3)",
          }}>
          {initials}
        </div>
      </div>
    </header>
  );
}
