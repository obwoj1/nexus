"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushNotifications() {
  const [status, setStatus] = useState<"unknown" | "granted" | "denied" | "unsupported">("unknown");
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported"); return;
    }
    setStatus(Notification.permission === "granted" ? "granted" : Notification.permission === "denied" ? "denied" : "unknown");

    // Register service worker silently
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(console.error);
  }, []);

  async function enable() {
    if (!("serviceWorker" in navigator)) return;
    setRegistering(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus("denied"); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as unknown as ArrayBuffer,
      });

      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        }),
      });

      setStatus("granted");
    } catch (e) {
      console.error("[push] subscribe failed", e);
    } finally {
      setRegistering(false);
    }
  }

  async function disable() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("unknown");
    } catch (e) {
      console.error("[push] unsubscribe failed", e);
    }
  }

  if (status === "unsupported") return null;

  return (
    <button
      onClick={status === "granted" ? disable : enable}
      disabled={registering || status === "denied"}
      title={
        status === "granted" ? "Notifications on — click to disable"
          : status === "denied" ? "Notifications blocked in browser settings"
          : "Enable notifications"
      }
      className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-white/5 disabled:opacity-40"
      style={{ color: status === "granted" ? "#C8900A" : "rgba(245,240,232,0.3)" }}
    >
      {status === "granted"
        ? <Bell className="w-3.5 h-3.5" />
        : <BellOff className="w-3.5 h-3.5" />
      }
    </button>
  );
}
