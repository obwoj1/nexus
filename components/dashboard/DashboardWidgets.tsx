"use client";

import { motion } from "framer-motion";
import { Calendar, Mail, TrendingUp, Flame, StickyNote, Clock, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PriorityCard } from "@/components/dashboard/PriorityCard";
import type { CalendarEvent } from "@/lib/google/calendar";
import type { InboxStats } from "@/lib/google/gmail";

const card = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const, delay: i * 0.07 },
  }),
};

const surface = {
  background: "#161210",
  border: "1px solid rgba(255,235,180,0.08)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
};

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: "rgba(200,144,10,0.1)", border: "1px solid rgba(200,144,10,0.15)" }}>
      {children}
    </div>
  );
}

function PhaseTag({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: "rgba(200,144,10,0.1)", color: "rgba(200,144,10,0.7)", border: "1px solid rgba(200,144,10,0.2)" }}>
      {label}
    </span>
  );
}

function GreetingSection({ name }: { name?: string }) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
      setDate(now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  })();

  return (
    <motion.div
      variants={card} initial="hidden" animate="visible" custom={0}
      className="col-span-2 rounded-2xl p-6 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(61,34,0,0.6) 0%, rgba(200,144,10,0.15) 50%, rgba(61,34,0,0.4) 100%)",
        border: "1px solid rgba(200,144,10,0.3)",
        boxShadow: "0 0 40px -10px rgba(200,144,10,0.3), 0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(200,144,10,0.15) 0%, transparent 70%)" }} />
      <div className="relative z-10 flex items-end justify-between">
        <div>
          <p className="text-sm mb-1" style={{ color: "rgba(245,240,232,0.5)" }}>{date}</p>
          <h2 className="text-2xl font-semibold tracking-tight" style={{ color: "#F5F0E8" }}>
            {greeting}{name ? `, ${name.split(" ")[0]}` : ""} 👋
          </h2>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold font-mono tracking-tight"
            style={{
              background: "linear-gradient(135deg, #C8900A, #F5CE58, #C8900A)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
            {time}
          </p>
          <div className="flex items-center justify-end gap-1.5 mt-1">
            <Clock className="w-3 h-3" style={{ color: "rgba(200,144,10,0.7)" }} />
            <span className="text-xs" style={{ color: "rgba(245,240,232,0.4)" }}>Live</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CalendarWidget({ events }: { events: CalendarEvent[] | null }) {
  if (events === null) {
    return (
      <>
        <div className="flex items-start justify-between mb-4">
          <IconBox><Calendar className="w-4 h-4" style={{ color: "#C8900A" }} /></IconBox>
        </div>
        <p className="text-xs tracking-widest uppercase mb-2" style={{ color: "rgba(245,240,232,0.4)" }}>TODAY</p>
        <div className="flex items-center gap-1.5 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(248,113,113,0.6)" }} />
          <p className="text-xs" style={{ color: "rgba(245,240,232,0.35)" }}>Sign in again to connect</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-start justify-between mb-4">
        <IconBox><Calendar className="w-4 h-4" style={{ color: "#C8900A" }} /></IconBox>
        {events.length > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(200,144,10,0.15)", color: "#E8B428" }}>
            {events.length}
          </span>
        )}
      </div>
      <p className="text-xs tracking-widest uppercase mb-1.5" style={{ color: "rgba(245,240,232,0.4)" }}>TODAY</p>
      <p className="text-xl font-semibold mb-2" style={{ color: events.length > 0 ? "#F5F0E8" : "rgba(245,240,232,0.3)" }}>
        {events.length === 0 ? "No events" : events.length === 1 ? "1 event" : `${events.length} events`}
      </p>
      {events.slice(0, 2).map((ev) => (
        <p key={ev.id} className="text-xs truncate mb-0.5" style={{ color: "rgba(245,240,232,0.5)" }}>
          {ev.isAllDay
            ? "All day · "
            : ev.start ? `${format(parseISO(ev.start), "h:mm a")} · ` : ""}
          {ev.title}
        </p>
      ))}
      {events.length > 2 && (
        <p className="text-xs mt-1" style={{ color: "rgba(200,144,10,0.6)" }}>+{events.length - 2} more</p>
      )}
    </>
  );
}

function InboxWidget({ stats }: { stats: InboxStats | null }) {
  if (stats === null) {
    return (
      <>
        <div className="flex items-start justify-between mb-4">
          <IconBox><Mail className="w-4 h-4" style={{ color: "#C8900A" }} /></IconBox>
        </div>
        <p className="text-xs tracking-widest uppercase mb-2" style={{ color: "rgba(245,240,232,0.4)" }}>INBOX</p>
        <div className="flex items-center gap-1.5 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(248,113,113,0.6)" }} />
          <p className="text-xs" style={{ color: "rgba(245,240,232,0.35)" }}>Sign in again to connect</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-start justify-between mb-4">
        <IconBox><Mail className="w-4 h-4" style={{ color: "#C8900A" }} /></IconBox>
        {stats.unread > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(200,144,10,0.15)", color: "#E8B428" }}>
            {stats.unread} unread
          </span>
        )}
      </div>
      <p className="text-xs tracking-widest uppercase mb-1.5" style={{ color: "rgba(245,240,232,0.4)" }}>INBOX</p>
      <p className="text-xl font-semibold" style={{ color: stats.unread > 0 ? "#F5F0E8" : "rgba(245,240,232,0.3)" }}>
        {stats.unread > 0 ? `${stats.unread} unread` : "All clear"}
      </p>
      <p className="text-xs mt-1" style={{ color: "rgba(245,240,232,0.35)" }}>
        {stats.total.toLocaleString()} total in inbox
      </p>
    </>
  );
}

const staticCards = [
  { icon: TrendingUp, label: "PORTFOLIO", value: "—", sub: "Investments not set up yet", badge: "Phase 6" },
  { icon: Flame,      label: "HABITS",    value: "—", sub: "Tracking not set up yet",    badge: "Phase 4" },
  { icon: StickyNote, label: "NOTES",     value: "—", sub: "Notes not set up yet",        badge: "Phase 3" },
];

interface Props {
  name?: string;
  todayEvents: CalendarEvent[] | null;
  inboxStats: InboxStats | null;
}

export function DashboardWidgets({ name, todayEvents, inboxStats }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4 max-w-5xl">
      <GreetingSection name={name} />

      {/* Live: Calendar */}
      <motion.div variants={card} initial="hidden" animate="visible" custom={1}>
        <Link href="/calendar" className="block rounded-2xl p-5 transition-all duration-200 hover:border-[rgba(200,144,10,0.25)] hover:-translate-y-0.5"
          style={surface}>
          <CalendarWidget events={todayEvents} />
        </Link>
      </motion.div>

      {/* Live: Inbox */}
      <motion.div variants={card} initial="hidden" animate="visible" custom={2}>
        <Link href="/mail" className="block rounded-2xl p-5 transition-all duration-200 hover:border-[rgba(200,144,10,0.25)] hover:-translate-y-0.5"
          style={surface}>
          <InboxWidget stats={inboxStats} />
        </Link>
      </motion.div>

      {/* AI Priority Inbox — full width */}
      <div className="col-span-3">
        <PriorityCard />
      </div>

      {/* Placeholders */}
      {staticCards.map((c, i) => (
        <motion.div key={c.label} variants={card} initial="hidden" animate="visible" custom={i + 3}
          className="rounded-2xl p-5 hover:border-[rgba(200,144,10,0.2)] transition-colors duration-200"
          style={surface}>
          <div className="flex items-start justify-between mb-4">
            <IconBox><c.icon className="w-4 h-4" style={{ color: "#C8900A" }} /></IconBox>
            <PhaseTag label={c.badge} />
          </div>
          <p className="text-xs tracking-widest uppercase mb-1.5" style={{ color: "rgba(245,240,232,0.4)" }}>{c.label}</p>
          <p className="text-xl font-semibold" style={{ color: "rgba(245,240,232,0.2)" }}>{c.value}</p>
          <p className="text-xs mt-1" style={{ color: "rgba(245,240,232,0.25)" }}>{c.sub}</p>
        </motion.div>
      ))}
    </div>
  );
}
