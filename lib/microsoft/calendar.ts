import type { CalendarEvent } from "@/lib/google/calendar";

interface MSEvent {
  id: string;
  subject?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?:   { dateTime?: string; date?: string; timeZone?: string };
  location?: { displayName?: string };
  isAllDay?: boolean;
}

interface MSCalendarResponse {
  value?: MSEvent[];
}

async function fetchOutlookEvents(token: string, timeMin: string, timeMax: string): Promise<CalendarEvent[]> {
  const url = new URL("https://graph.microsoft.com/v1.0/me/calendarView");
  url.searchParams.set("startDateTime", timeMin);
  url.searchParams.set("endDateTime",   timeMax);
  url.searchParams.set("$select",       "id,subject,start,end,location,isAllDay");
  url.searchParams.set("$orderby",      "start/dateTime");
  url.searchParams.set("$top",          "50");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: 'outlook.timezone="Eastern Standard Time"',
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) return [];

  const data: MSCalendarResponse = await res.json();
  return (data.value ?? []).map((e) => ({
    id:       `ms-${e.id}`,
    title:    e.subject ?? "Untitled",
    start:    e.start?.dateTime ?? e.start?.date ?? "",
    end:      e.end?.dateTime   ?? e.end?.date   ?? "",
    isAllDay: e.isAllDay ?? !e.start?.dateTime,
    location: e.location?.displayName,
  }));
}

export async function getOutlookTodayEvents(token: string): Promise<CalendarEvent[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  return fetchOutlookEvents(token, start, end);
}

export async function getOutlookUpcomingEvents(token: string, days = 7): Promise<CalendarEvent[]> {
  const now = new Date();
  const end = new Date(now.getTime() + days * 86400000);
  return fetchOutlookEvents(token, now.toISOString(), end.toISOString());
}
