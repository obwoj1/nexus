"use client";

import { useState } from "react";
import { Flame, CreditCard, Target, BookOpen, Heart, CalendarDays, Sparkles } from "lucide-react";
import { HabitsSection } from "./HabitsSection";
import { SubscriptionsSection } from "./SubscriptionsSection";
import { GoalsSection } from "./GoalsSection";
import { ReadingSection } from "./ReadingSection";
import { HealthSection } from "./HealthSection";
import { DatesSection } from "./DatesSection";
import { ClaudiaPanel } from "./ClaudiaPanel";

type Section = "habits" | "subscriptions" | "goals" | "reading" | "health" | "dates";

const NAV: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: "habits",        label: "Habits",        icon: <Flame className="w-4 h-4" /> },
  { key: "subscriptions", label: "Subscriptions",  icon: <CreditCard className="w-4 h-4" /> },
  { key: "goals",         label: "Goals",          icon: <Target className="w-4 h-4" /> },
  { key: "reading",       label: "Reading",        icon: <BookOpen className="w-4 h-4" /> },
  { key: "health",        label: "Health",         icon: <Heart className="w-4 h-4" /> },
  { key: "dates",         label: "Dates",          icon: <CalendarDays className="w-4 h-4" /> },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function TrackingShell(props: any) {
  const [active, setActive] = useState<Section>("habits");
  const [claudiaOpen, setClaudiaOpen] = useState(false);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left nav */}
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

        {/* Claudia button at bottom of nav */}
        <div className="mt-auto pt-3" style={{ borderTop: "1px solid rgba(200,144,10,0.1)" }}>
          <button
            onClick={() => setClaudiaOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{
              background: claudiaOpen ? "rgba(200,144,10,0.12)" : "transparent",
              border: claudiaOpen ? "1px solid rgba(200,144,10,0.25)" : "1px solid transparent",
              color: claudiaOpen ? "#F5CE58" : "rgba(200,144,10,0.7)",
            }}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Ask Claudia</span>
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {active === "habits"        && <HabitsSection        today={props.today} habits={props.habits} habitLogs={props.habitLogs} />}
        {active === "subscriptions" && <SubscriptionsSection subscriptions={props.subscriptions} />}
        {active === "goals"         && <GoalsSection         goals={props.goals} />}
        {active === "reading"       && <ReadingSection       reading={props.reading} />}
        {active === "health"        && <HealthSection        today={props.today} healthRows={props.healthRows} />}
        {active === "dates"         && <DatesSection         dates={props.dates} today={props.today} />}
      </div>

      {/* Claudia sliding panel */}
      <ClaudiaPanel open={claudiaOpen} onClose={() => setClaudiaOpen(false)} />
    </div>
  );
}
