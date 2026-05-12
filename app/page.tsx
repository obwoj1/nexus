"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { joinWaitlist } from "@/app/actions/waitlist";
import Link from "next/link";
import {
  LayoutDashboard,
  Calendar,
  Mail,
  FileText,
  BarChart2,
  Dumbbell,
  TrendingUp,
  Bell,
  Search,
  Flame,
  ArrowRight,
  CheckCircle2,
  Clock,
  Inbox,
  StickyNote,
  Activity,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", delay },
  }),
};

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5">
      <span className="text-sm font-semibold tracking-[0.25em] text-[var(--color-gold)] uppercase">
        Nexus
      </span>
      <Link
        href="/login"
        className="text-sm text-white/50 hover:text-white transition-colors duration-200"
      >
        Sign in
      </Link>
    </nav>
  );
}

function WaitlistForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const data = new FormData(e.currentTarget);
    const result = await joinWaitlist(data);
    if (result.success) {
      setStatus("success");
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 py-6"
      >
        <CheckCircle2 className="w-8 h-8 text-[var(--color-gold)]" />
        <p className="text-white font-medium">You&apos;re on the list.</p>
        <p className="text-white/50 text-sm">We&apos;ll reach out when your access is ready.</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm mx-auto">
      <input
        name="name"
        type="text"
        placeholder="Your name"
        required
        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors text-sm"
      />
      <input
        name="email"
        type="email"
        placeholder="your@email.com"
        required
        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors text-sm"
      />
      {status === "error" && (
        <p className="text-[var(--color-danger)] text-xs text-center">{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full py-3 rounded-xl bg-[var(--color-gold)] text-black font-semibold text-sm hover:bg-[var(--color-gold-bright)] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {status === "loading" ? (
          <span className="opacity-70">Requesting access…</span>
        ) : (
          <>
            Request Access <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Calendar, label: "Calendar" },
  { icon: Mail, label: "Mail" },
  { icon: FileText, label: "Notes" },
  { icon: Activity, label: "Tracking" },
  { icon: Dumbbell, label: "Workouts" },
  { icon: TrendingUp, label: "Investments" },
];

const mockCards = [
  { icon: Clock, label: "Good morning, Alex", value: "Monday, May 11", sub: "9:41 AM", gold: true },
  { icon: Calendar, label: "Today", value: "3 events", sub: "Next: Standup at 10am", gold: false },
  { icon: Inbox, label: "Inbox", value: "5 unread", sub: "2 need replies", gold: false },
  { icon: TrendingUp, label: "Portfolio", value: "+2.4%", sub: "$24,810 total", gold: false },
  { icon: Flame, label: "Habits", value: "5 day streak", sub: "3 of 4 done today", gold: false },
  { icon: StickyNote, label: "Notes", value: "12 notes", sub: "Last edited today", gold: false },
];

function DashboardPreview() {
  return (
    <div
      className="relative w-full max-w-4xl mx-auto rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
      style={{ background: "rgba(10,10,10,0.95)" }}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <div className="w-3 h-3 rounded-full bg-white/10" />
        <div className="w-3 h-3 rounded-full bg-white/10" />
        <div className="w-3 h-3 rounded-full bg-white/10" />
        <span className="ml-3 text-white/20 text-xs font-mono">nexus.app/dashboard</span>
      </div>

      <div className="flex h-[480px]">
        {/* Sidebar */}
        <div className="w-14 border-r border-white/5 flex flex-col items-center py-4 gap-1">
          <div className="mb-4 w-7 h-7 rounded-lg bg-[var(--color-gold)]/20 flex items-center justify-center">
            <span className="text-[var(--color-gold)] text-[10px] font-bold tracking-wider">N</span>
          </div>
          {navItems.map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              className={`w-9 h-9 rounded-lg flex items-center justify-center relative transition-colors ${
                active
                  ? "bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                  : "text-white/20"
              }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[18px] w-0.5 h-4 bg-[var(--color-gold)] rounded-full" />
              )}
              <Icon className="w-4 h-4" />
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/60 text-xs font-medium tracking-wide uppercase">Dashboard</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-white/20 text-xs">
                <Search className="w-3 h-3" />
                <span className="font-mono">⌘K</span>
              </div>
              <Bell className="w-3.5 h-3.5 text-white/20" />
              <div className="w-6 h-6 rounded-full bg-[var(--color-gold)]/30 flex items-center justify-center text-[var(--color-gold)] text-[9px] font-semibold">
                A
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {mockCards.map(({ icon: Icon, label, value, sub, gold }) => (
              <div
                key={label}
                className={`rounded-xl p-3 border ${
                  gold
                    ? "bg-[var(--color-gold)]/5 border-[var(--color-gold)]/20"
                    : "bg-white/[0.03] border-white/5"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className={`w-3 h-3 ${gold ? "text-[var(--color-gold)]" : "text-white/30"}`} />
                  <span className="text-white/40 text-[10px]">{label}</span>
                </div>
                <p className={`text-sm font-semibold leading-tight ${gold ? "text-[var(--color-gold)]" : "text-white"}`}>
                  {value}
                </p>
                <p className="text-white/30 text-[10px] mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const features = [
  { icon: Calendar, title: "Calendar", desc: "Google Calendar integrated. See your day at a glance." },
  { icon: Mail, title: "Mail", desc: "Gmail inbox surfaced. Never miss what matters." },
  { icon: FileText, title: "Notes", desc: "Notion-style block editor. Your thoughts, organized." },
  { icon: BarChart2, title: "Tracking", desc: "Habits, goals, health, subscriptions — all in one place." },
  { icon: Dumbbell, title: "Workouts", desc: "Log sets, track progression, own your fitness data." },
  { icon: TrendingUp, title: "Investments", desc: "Stocks and crypto. Real-time. Your portfolio, clear." },
];

export default function LandingPage() {
  const previewRef = useRef(null);
  const featuresRef = useRef(null);
  const previewInView = useInView(previewRef, { once: true, margin: "-100px" });
  const featuresInView = useInView(featuresRef, { once: true, margin: "-100px" });

  return (
    <main className="min-h-screen page-bg overflow-x-hidden">
      <Nav />

      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="text-center max-w-2xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--color-gold)]/20 bg-[var(--color-gold)]/5 mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)] animate-pulse" />
            <span className="text-[var(--color-gold)] text-xs tracking-widest uppercase font-medium">
              Now accepting requests
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.1}
            className="text-5xl sm:text-6xl font-semibold tracking-tight text-white leading-[1.1] mb-5"
          >
            Your entire digital life.
            <br />
            <span className="text-[var(--color-gold)]">One command center.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.2}
            className="text-white/50 text-lg leading-relaxed mb-10 max-w-lg mx-auto"
          >
            Calendar, mail, notes, workouts, investments, and habits — unified in one
            beautiful, fast, personal command center.
          </motion.p>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0.3}>
            <WaitlistForm />
            <p className="text-white/20 text-xs mt-4">Invite-only. No spam. Ever.</p>
          </motion.div>
        </div>
      </section>

      {/* Preview */}
      <section ref={previewRef} className="px-6 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={previewInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold text-white tracking-tight mb-3">
              Everything in one place
            </h2>
            <p className="text-white/40 text-sm max-w-md mx-auto">
              One interface. No tab switching. No context lost.
            </p>
          </div>
          <DashboardPreview />
        </motion.div>
      </section>

      {/* Features */}
      <section ref={featuresRef} className="px-6 pb-32">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-semibold text-white tracking-tight mb-3">
              Built for everything
            </h2>
            <p className="text-white/40 text-sm">Six pillars. One app.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 24 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.07 }}
                className="glass-card p-5 group hover:border-[var(--color-gold)]/20 transition-colors duration-300"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--color-gold)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--color-gold)]/15 transition-colors">
                  <Icon className="w-4 h-4 text-[var(--color-gold)]" />
                </div>
                <h3 className="text-white font-medium text-sm mb-1.5">{title}</h3>
                <p className="text-white/40 text-xs leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 pb-24 text-center">
        <div className="max-w-md mx-auto glass-card-gold p-10">
          <h2 className="text-xl font-semibold text-white tracking-tight mb-2">
            Ready to get in?
          </h2>
          <p className="text-white/40 text-sm mb-8">
            Join the waitlist. Invites go out in waves.
          </p>
          <WaitlistForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center">
        <p className="text-white/20 text-xs tracking-widest uppercase">
          Nexus · Your command center
        </p>
      </footer>
    </main>
  );
}
