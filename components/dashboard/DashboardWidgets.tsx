"use client";

import { motion } from "framer-motion";
import { Calendar, Mail, Dumbbell, Shirt, FileText, Activity, Clock, AlertCircle, Sparkles, RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PriorityCard } from "@/components/dashboard/PriorityCard";
import { askClaudiaAction } from "@/app/actions/claudia";
import type { CalendarEvent } from "@/lib/google/calendar";
import type { InboxStats } from "@/lib/google/gmail";

const BRIEFING_KEY = "nexus-claudia-briefing";

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

const liveCards = [
  { icon: Activity,  label: "TRACKING",  sub: "Habits, goals & health", href: "/tracking" },
  { icon: Dumbbell,  label: "WORKOUTS",  sub: "Sessions & progress",    href: "/workouts" },
  { icon: Shirt,     label: "WARDROBE",  sub: "Fits & clothing",        href: "/wardrobe" },
  { icon: FileText,  label: "NOTES",     sub: "Journal & notes",        href: "/notes"    },
];

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
    const firstName = name?.split(" ")[0] ?? "";

    const morning = [
      `What's cooking, good looking`,
      `Rise and shine, superstar`,
      `Good morning, gorgeous`,
      `Hey, the day got better already`,
      `Morning — let's run it`,
    ];
    const afternoon = [
      `Hey there, beautiful`,
      `Hiya — still going strong`,
      `Look who's thriving`,
      `The afternoon just got way better`,
      `Keep that energy, you're doing great`,
    ];
    const evening = [
      `Evening, dear — you made it`,
      `Hey night owl, still at it?`,
      `Look at you, still going`,
      `Evening — you ate today, right?`,
      `The day's almost yours — finish strong`,
    ];

    const pool = h < 12 ? morning : h < 18 ? afternoon : evening;
    const idx = h % pool.length;
    const line = pool[idx];
    return firstName ? `${line}, ${firstName}` : line;
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
            {greeting} 👋
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


function BriefingCard() {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchBriefing(forceRefresh = false) {
    setLoading(true);
    const today = new Date().toLocaleDateString("en-CA");
    if (!forceRefresh) {
      const cached = sessionStorage.getItem(BRIEFING_KEY);
      if (cached) {
        try {
          const { date, content } = JSON.parse(cached) as { date: string; content: string };
          if (date === today) { setText(content); setLoading(false); return; }
        } catch { /* invalid cache */ }
      }
    } else {
      sessionStorage.removeItem(BRIEFING_KEY);
    }
    const res = await askClaudiaAction([], "briefing");
    if (res.result) {
      setText(res.result);
      sessionStorage.setItem(BRIEFING_KEY, JSON.stringify({ date: new Date().toLocaleDateString("en-CA"), content: res.result }));
    }
    setLoading(false);
  }

  useEffect(() => { void fetchBriefing(); }, []);

  return (
    <motion.div variants={card} initial="hidden" animate="visible" custom={0}
      className="col-span-2 md:col-span-3 rounded-2xl p-5"
      style={{
        background: "linear-gradient(135deg, rgba(30,18,0,0.9) 0%, rgba(20,14,0,0.95) 100%)",
        border: "1px solid rgba(200,144,10,0.2)",
        boxShadow: "0 0 40px -12px rgba(200,144,10,0.2)",
      }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #C8900A, #F5CE58)" }}>
          <Sparkles className="w-3 h-3 text-black" />
        </div>
        <p className="text-[10px] font-semibold tracking-widest uppercase flex-1" style={{ color: "rgba(200,144,10,0.8)" }}>
          Claudia&apos;s Briefing
        </p>
        {!loading && (
          <button
            onClick={() => void fetchBriefing(true)}
            title="Refresh briefing"
            className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-white/5"
          >
            <RefreshCw className="w-3 h-3" style={{ color: "rgba(200,144,10,0.5)" }} />
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex gap-1.5 items-center py-1">
          {[0,1,2].map((i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ background: "rgba(200,144,10,0.5)", animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      ) : (
        <p className="text-sm leading-relaxed" style={{ color: "rgba(245,240,232,0.75)" }}>
          {text ?? "Nothing to report right now."}
        </p>
      )}
    </motion.div>
  );
}

interface Props {
  name?: string;
  todayEvents: CalendarEvent[] | null;
  inboxStats: InboxStats | null;
}

export function DashboardWidgets({ name, todayEvents, inboxStats }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 max-w-5xl">
      {/* Claudia briefing — full width */}
      <BriefingCard />

      {/* Greeting — full width on mobile, col-span-2 on desktop */}
      <div className="col-span-2 md:col-span-1">
        <GreetingSection name={name} />
      </div>

      {/* Calendar */}
      <motion.div variants={card} initial="hidden" animate="visible" custom={1}>
        <Link href="/calendar" className="block rounded-2xl p-4 md:p-5 h-full transition-all duration-200 hover:border-[rgba(200,144,10,0.25)] hover:-translate-y-0.5"
          style={surface}>
          <CalendarWidget events={todayEvents} />
        </Link>
      </motion.div>

      {/* Inbox */}
      <motion.div variants={card} initial="hidden" animate="visible" custom={2}>
        <Link href="/mail" className="block rounded-2xl p-4 md:p-5 h-full transition-all duration-200 hover:border-[rgba(200,144,10,0.25)] hover:-translate-y-0.5"
          style={surface}>
          <InboxWidget stats={inboxStats} />
        </Link>
      </motion.div>

      {/* AI Priority Inbox — full width */}
      <div className="col-span-2 md:col-span-3">
        <PriorityCard />
      </div>

      {/* Live feature shortcuts */}
      {liveCards.map((c, i) => (
        <motion.div key={c.label} variants={card} initial="hidden" animate="visible" custom={i + 3}>
          <Link href={c.href} className="block rounded-2xl p-4 md:p-5 h-full transition-all duration-200 hover:border-[rgba(200,144,10,0.2)] hover:-translate-y-0.5"
            style={surface}>
            <div className="flex items-start justify-between mb-3">
              <IconBox><c.icon className="w-4 h-4" style={{ color: "#C8900A" }} /></IconBox>
            </div>
            <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "rgba(245,240,232,0.4)" }}>{c.label}</p>
            <p className="text-xs mt-1" style={{ color: "rgba(245,240,232,0.35)" }}>{c.sub}</p>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
