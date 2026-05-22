"use server";

import { cookies } from "next/headers";

const COOKIE = "nexus-tz";
const DEFAULT_TZ = "America/New_York";

export async function getTimezoneAction(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE)?.value ?? DEFAULT_TZ;
}

export async function saveTimezoneAction(tz: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, tz, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false, // readable by client if needed
  });
}
