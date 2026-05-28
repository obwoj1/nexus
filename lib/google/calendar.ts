import { getValidGoogleToken, getValidSecondaryGoogleToken } from "./tokens";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  location?: string;
  colorId?: string;
}

interface GCalEventItem {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  colorId?: string;
}

interface GCalListResponse {
  items?: GCalEventItem[];
}

async function fetchEvents(token: string, timeMin: string, timeMax: string, maxResults = 20): Promise<CalendarEvent[]> {
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", String(maxResults));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 300 },
  });

  if (!res.ok) throw new Error("CALENDAR_FETCH_FAILED");

  const data: GCalListResponse = await res.json();
  return (data.items ?? []).map((item) => ({
    id: item.id,
    title: item.summary ?? "Untitled",
    start: item.start?.dateTime ?? item.start?.date ?? "",
    end: item.end?.dateTime ?? item.end?.date ?? "",
    isAllDay: !item.start?.dateTime,
    location: item.location,
    colorId: item.colorId,
  }));
}

async function mergeEvents(events1: CalendarEvent[], events2: CalendarEvent[]): Promise<CalendarEvent[]> {
  const seen = new Set<string>();
  return [...events1, ...events2]
    .filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return true; })
    .sort((a, b) => a.start.localeCompare(b.start));
}

export async function getTodayEvents(userId: string): Promise<CalendarEvent[]> {
  const [primary, secondary] = await Promise.all([
    getValidGoogleToken(userId),
    getValidSecondaryGoogleToken(userId),
  ]);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const [primaryEvents, secondaryEvents] = await Promise.all([
    fetchEvents(primary, startOfDay, endOfDay),
    secondary ? fetchEvents(secondary, startOfDay, endOfDay) : Promise.resolve([]),
  ]);
  return mergeEvents(primaryEvents, secondaryEvents);
}

export async function getUpcomingEvents(userId: string, days = 7): Promise<CalendarEvent[]> {
  const [primary, secondary] = await Promise.all([
    getValidGoogleToken(userId),
    getValidSecondaryGoogleToken(userId),
  ]);
  const now = new Date();
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const [primaryEvents, secondaryEvents] = await Promise.all([
    fetchEvents(primary, now.toISOString(), end.toISOString(), 30),
    secondary ? fetchEvents(secondary, now.toISOString(), end.toISOString(), 30) : Promise.resolve([]),
  ]);
  return mergeEvents(primaryEvents, secondaryEvents);
}
