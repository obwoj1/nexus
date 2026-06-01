"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, X, Loader2, Mail } from "lucide-react";
import { disconnectOutlookAction } from "@/app/actions/outlook";

interface Props {
  connectUrl: string;
  outlookEmail: string | null;
  justConnected?: boolean;
}

export function OutlookAccountBar({ connectUrl, outlookEmail, justConnected }: Props) {
  const [disconnected, setDisconnected] = useState(false);
  const [isPending, startTransition]    = useTransition();

  function handleDisconnect() {
    startTransition(async () => {
      await disconnectOutlookAction();
      setDisconnected(true);
    });
  }

  if (disconnected) return null;

  if (outlookEmail) {
    return (
      <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl"
        style={{
          background: justConnected ? "rgba(0,120,212,0.06)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${justConnected ? "rgba(0,120,212,0.25)" : "rgba(255,235,180,0.08)"}`,
        }}>
        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: justConnected ? "#50B0F0" : "rgba(0,120,212,0.7)" }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: "rgba(245,240,232,0.7)" }}>
            Outlook calendar synced — <span style={{ color: "#F5F0E8" }}>{outlookEmail}</span>
          </p>
          {justConnected && (
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(80,176,240,0.8)" }}>Connected successfully</p>
          )}
        </div>
        <button
          onClick={handleDisconnect}
          disabled={isPending}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors hover:bg-white/5 disabled:opacity-40"
          style={{ color: "rgba(245,240,232,0.35)", border: "1px solid rgba(255,235,180,0.08)" }}
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
          {isPending ? "" : "Disconnect"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,235,180,0.07)" }}>
      <Mail className="w-4 h-4 shrink-0" style={{ color: "rgba(0,120,212,0.6)" }} />
      <p className="flex-1 text-xs" style={{ color: "rgba(245,240,232,0.4)" }}>
        Connect Outlook to see your work calendar alongside Google
      </p>
      <a
        href={connectUrl}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:-translate-y-0.5"
        style={{
          background: "rgba(0,120,212,0.12)",
          border: "1px solid rgba(0,120,212,0.3)",
          color: "#50B0F0",
        }}
      >
        Connect Outlook
      </a>
    </div>
  );
}
