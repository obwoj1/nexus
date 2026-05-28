"use client";

import { useState, useTransition } from "react";
import { PlusCircle, CheckCircle2, X, Loader2 } from "lucide-react";
import { disconnectSecondaryGoogleAction } from "@/app/actions/secondary-google";

interface Props {
  connectUrl: string;
  secondaryEmail: string | null;
  justConnected?: boolean;
}

export function SecondaryAccountBar({ connectUrl, secondaryEmail, justConnected }: Props) {
  const [disconnected, setDisconnected] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDisconnect() {
    startTransition(async () => {
      await disconnectSecondaryGoogleAction();
      setDisconnected(true);
    });
  }

  // Optimistically hide after disconnect
  if (disconnected) return null;

  if (secondaryEmail) {
    return (
      <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl"
        style={{
          background: justConnected ? "rgba(74,222,128,0.06)" : "rgba(255,255,255,0.02)",
          border: `1px solid ${justConnected ? "rgba(74,222,128,0.2)" : "rgba(255,235,180,0.08)"}`,
        }}>
        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: justConnected ? "#4ADE80" : "rgba(200,144,10,0.7)" }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: "rgba(245,240,232,0.7)" }}>
            Also showing mail from <span style={{ color: "#F5F0E8" }}>{secondaryEmail}</span>
          </p>
          {justConnected && (
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(74,222,128,0.7)" }}>Connected successfully</p>
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
      <PlusCircle className="w-4 h-4 shrink-0" style={{ color: "rgba(200,144,10,0.5)" }} />
      <p className="flex-1 text-xs" style={{ color: "rgba(245,240,232,0.4)" }}>
        Connect another Google account to merge inboxes and calendars
      </p>
      <a
        href={connectUrl}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:-translate-y-0.5"
        style={{
          background: "rgba(200,144,10,0.12)",
          border: "1px solid rgba(200,144,10,0.25)",
          color: "#C8900A",
        }}
      >
        Connect
      </a>
    </div>
  );
}
