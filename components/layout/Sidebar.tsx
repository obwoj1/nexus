"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Mail,
  FileText,
  Activity,
  Dumbbell,
  Shirt,
  TrendingUp,
  LogOut,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", live: true },
  { icon: Calendar,        label: "Calendar",  href: "/calendar",  live: true },
  { icon: Mail,            label: "Mail",      href: "/mail",      live: true },
  { icon: FileText,        label: "Notes",     href: "/notes",     live: true },
  { icon: Activity,        label: "Tracking",  href: "/tracking",  live: true },
  { icon: Dumbbell,        label: "Workouts",   href: "/workouts",    live: true },
  { icon: Shirt,           label: "Wardrobe",   href: "/wardrobe",    live: true },
  { icon: TrendingUp,      label: "Investments", href: "/investments", live: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-[60px] flex-col items-center py-5 z-40"
        style={{ background: "#0D0B08", borderRight: "1px solid rgba(255,235,180,0.07)" }}>

        {/* Logo */}
        <div className="mb-8 w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #7A4800 0%, #C8900A 40%, #F5CE58 70%, #C8900A 100%)",
            boxShadow: "0 0 20px rgba(200,144,10,0.4), 0 0 40px rgba(200,144,10,0.15)"
          }}>
          <span className="text-[#080705] text-sm font-bold tracking-tight">N</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col items-center gap-1 flex-1">
          {navItems.map(({ icon: Icon, label, href, live }) => {
            const active = pathname === href;
            return (
              <div key={label} className="relative group">
                {live ? (
                  <Link href={href}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      active ? "bg-[rgba(200,144,10,0.15)]" : "hover:bg-[rgba(255,235,180,0.05)]"
                    }`}
                    title={label}>
                    {active && (
                      <span className="absolute -left-[18px] top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                        style={{ background: "linear-gradient(180deg, #C8900A, #F5CE58)" }} />
                    )}
                    <Icon className="w-[18px] h-[18px] transition-colors duration-200"
                      style={{ color: active ? "#E8B428" : "rgba(245,240,232,0.3)" }} />
                  </Link>
                ) : (
                  <button className="w-10 h-10 rounded-xl flex items-center justify-center opacity-30 cursor-not-allowed"
                    title={`${label} — coming soon`} disabled>
                    <Icon className="w-[18px] h-[18px]" style={{ color: "rgba(245,240,232,0.3)" }} />
                  </button>
                )}
                {/* Tooltip */}
                <div className="absolute left-[52px] top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50"
                  style={{ background: "#1E1A15", border: "1px solid rgba(255,235,180,0.1)", color: "#F5F0E8" }}>
                  {label}
                  {!live && <span className="ml-2 text-[10px]" style={{ color: "#C8900A" }}>Soon</span>}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Sign out */}
        <button onClick={handleSignOut}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-[rgba(248,113,113,0.08)]"
          title="Sign out">
          <LogOut className="w-[17px] h-[17px]" style={{ color: "rgba(245,240,232,0.25)" }} />
        </button>
      </aside>

      {/* ── Mobile bottom tab bar (hidden on desktop) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center overflow-x-auto no-scrollbar px-1 py-1 gap-0.5"
        style={{ background: "#0D0B08", borderTop: "1px solid rgba(255,235,180,0.07)" }}>
        {navItems.filter((i) => i.live).map(({ icon: Icon, label, href }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl shrink-0 transition-all"
              style={{ background: active ? "rgba(200,144,10,0.1)" : "transparent" }}>
              <Icon className="w-[18px] h-[18px] transition-colors"
                style={{ color: active ? "#E8B428" : "rgba(245,240,232,0.35)" }} />
              <span className="text-[9px] font-medium transition-colors whitespace-nowrap"
                style={{ color: active ? "#E8B428" : "rgba(245,240,232,0.35)" }}>
                {label}
              </span>
            </Link>
          );
        })}
        <button onClick={handleSignOut}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl shrink-0 ml-auto">
          <LogOut className="w-[18px] h-[18px]" style={{ color: "rgba(245,240,232,0.2)" }} />
          <span className="text-[9px] font-medium" style={{ color: "rgba(245,240,232,0.2)" }}>Out</span>
        </button>
      </nav>
    </>
  );
}
