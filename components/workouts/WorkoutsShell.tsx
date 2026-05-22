"use client";

import { useState } from "react";
import { Dumbbell, History, BookOpen, TrendingUp } from "lucide-react";
import { LogSection } from "./LogSection";
import { HistorySection } from "./HistorySection";
import { TemplatesSection } from "./TemplatesSection";
import { ProgressSection } from "./ProgressSection";

type Section = "log" | "history" | "templates" | "progress";

const NAV: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: "log",       label: "Log",       icon: <Dumbbell className="w-4 h-4" /> },
  { key: "history",   label: "History",   icon: <History className="w-4 h-4" /> },
  { key: "templates", label: "Templates", icon: <BookOpen className="w-4 h-4" /> },
  { key: "progress",  label: "Progress",  icon: <TrendingUp className="w-4 h-4" /> },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function WorkoutsShell(props: any) {
  const [active, setActive] = useState<Section>("log");

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
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {active === "log"       && <LogSection       exercises={props.exercises} todaySession={props.todaySession} today={props.today} templates={props.templates} />}
        {active === "history"   && <HistorySection   sessions={props.recentSessions} />}
        {active === "templates" && <TemplatesSection templates={props.templates} exercises={props.exercises} />}
        {active === "progress"  && <ProgressSection  exercises={props.exercises} />}
      </div>
    </div>
  );
}
