"use client";

import { Topbar } from "@/components/layout/Topbar";
import { motion } from "framer-motion";
import {
  Calendar,
  Mail,
  StickyNote,
  TrendingUp,
  Flame,
  Clock,
} from "lucide-react";
import { useEffect, useState } from "react";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: "easeOut", delay: i * 0.07 },
  }),
};

function LiveClock() {
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

  return { time, date };
}

function GreetingCard() {
  const { time, date } = LiveClock();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="col-span-2 rounded-2xl p-6 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(61,34,0,0.6) 0%, rgba(200,144,10,0.15) 50%, rgba(61,34,0,0.4) 100%)",
        border: "1px solid rgba(200,144,10,0.3)",
        boxShadow: "0 0 40px -10px rgba(200,144,10,0.3), 0 8px 32px rgba(0,0,0,0.4)",
      }}>
      {/* Background glow */}
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(200,144,10,0.15) 0%, transparent 70%)" }} />

      <div className="relative z-10 flex items-end justify-between">
        <div>
          <p className="text-sm mb-1" style={{ color: "rgba(245,240,232,0.5)" }}>
            {date}
          </p>
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
    </div>
  );
}

const placeholderCards = [
  {
    icon: Calendar,
    label: "Today",
    value: "No events",
    sub: "Calendar not connected yet",
    badge: "Phase 2",
  },
  {
    icon: Mail,
    label: "Inbox",
    value: "—",
    sub: "Gmail not connected yet",
    badge: "Phase 2",
  },
  {
    icon: TrendingUp,
    label: "Portfolio",
    value: "—",
    sub: "Investments not set up yet",
    badge: "Phase 6",
  },
  {
    icon: Flame,
    label: "Habits",
    value: "—",
    sub: "Tracking not set up yet",
    badge: "Phase 4",
  },
  {
    icon: StickyNote,
    label: "Notes",
    value: "—",
    sub: "Notes not set up yet",
    badge: "Phase 3",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar section="OVERVIEW" title="Dashboard" />

      <main className="flex-1 p-8">
        <div className="grid grid-cols-3 gap-4 max-w-5xl">
          {/* Greeting spans 2 cols */}
          <motion.div
            className="col-span-2"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={0}
          >
            <GreetingCard />
          </motion.div>

          {/* Placeholder cards */}
          {placeholderCards.map((card, i) => (
            <motion.div
              key={card.label}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={i + 1}
              className="rounded-2xl p-5 transition-colors duration-200 hover:border-[rgba(200,144,10,0.2)] group"
              style={{
                background: "#161210",
                border: "1px solid rgba(255,235,180,0.08)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(200,144,10,0.1)", border: "1px solid rgba(200,144,10,0.15)" }}>
                  <card.icon className="w-4 h-4" style={{ color: "#C8900A" }} />
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(200,144,10,0.1)",
                    color: "rgba(200,144,10,0.7)",
                    border: "1px solid rgba(200,144,10,0.2)",
                  }}>
                  {card.badge}
                </span>
              </div>
              <p className="text-xs tracking-widest uppercase mb-1.5"
                style={{ color: "rgba(245,240,232,0.4)" }}>
                {card.label}
              </p>
              <p className="text-xl font-semibold" style={{ color: "rgba(245,240,232,0.2)" }}>
                {card.value}
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(245,240,232,0.25)" }}>
                {card.sub}
              </p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
