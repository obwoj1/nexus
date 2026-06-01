import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getTodayEvents, getUpcomingEvents, type CalendarEvent } from "@/lib/google/calendar";
import { getOutlookTodayEvents, getOutlookUpcomingEvents } from "@/lib/microsoft/calendar";
import { getValidOutlookToken, buildOutlookAuthUrl } from "@/lib/microsoft/tokens";
import { Topbar } from "@/components/layout/Topbar";
import { OutlookAccountBar } from "@/components/calendar/OutlookAccountBar";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { Calendar, MapPin, Clock, AlertCircle } from "lucide-react";

function formatTime(event: CalendarEvent): string {
  if (event.isAllDay) return "All day";
  try {
    const s = format(parseISO(event.start), "h:mm a");
    const e = format(parseISO(event.end), "h:mm a");
    return `${s} – ${e}`;
  } catch { return ""; }
}

function dayLabel(isoDate: string): string {
  try {
    const d = parseISO(isoDate + (isoDate.includes("T") ? "" : "T00:00:00"));
    if (isToday(d))    return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return format(d, "EEEE, MMMM d");
  } catch { return isoDate; }
}

function EventCard({ event }: { event: CalendarEvent }) {
  const isOutlook = event.id.startsWith("ms-");
  return (
    <div className="flex gap-4 rounded-2xl p-5 transition-colors duration-200 hover:border-[rgba(200,144,10,0.2)]"
      style={{ background: "#161210", border: "1px solid rgba(255,235,180,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
      <div className="w-0.5 rounded-full shrink-0 self-stretch"
        style={{ background: isOutlook
          ? "linear-gradient(180deg, #0078D4, #50B0F0)"
          : "linear-gradient(180deg, #C8900A, #F5CE58, #C8900A)" }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium truncate" style={{ color: "#F5F0E8" }}>{event.title}</p>
          {isOutlook && (
            <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0 font-medium"
              style={{ background: "rgba(0,120,212,0.15)", color: "#50B0F0", border: "1px solid rgba(0,120,212,0.2)" }}>
              Outlook
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 shrink-0" style={{ color: "rgba(200,144,10,0.7)" }} />
            <span className="text-xs" style={{ color: "rgba(245,240,232,0.5)" }}>{formatTime(event)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1 min-w-0">
              <MapPin className="w-3 h-3 shrink-0" style={{ color: "rgba(245,240,232,0.3)" }} />
              <span className="text-xs truncate" style={{ color: "rgba(245,240,232,0.4)" }}>{event.location}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function mergeEvents(a: CalendarEvent[], b: CalendarEvent[]): CalendarEvent[] {
  const seen = new Set<string>();
  return [...a, ...b]
    .filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return true; })
    .sort((x, y) => x.start.localeCompare(y.start));
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const params = await searchParams;
  const justConnected = params.outlook_connected === "1";

  // Fetch Outlook connection info
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("outlook_email")
    .eq("user_id", user.id)
    .single();
  const outlookEmail = profile?.outlook_email ?? null;
  const connectUrl   = buildOutlookAuthUrl();

  // Fetch Outlook token (null if not connected)
  const outlookToken = await getValidOutlookToken(user.id).catch(() => null);

  const [todayResult, upcomingResult, outlookTodayResult, outlookUpcomingResult] = await Promise.allSettled([
    getTodayEvents(user.id),
    getUpcomingEvents(user.id, 7),
    outlookToken ? getOutlookTodayEvents(outlookToken)           : Promise.resolve([]),
    outlookToken ? getOutlookUpcomingEvents(outlookToken, 7)     : Promise.resolve([]),
  ]);

  const googleToday    = todayResult.status    === "fulfilled" ? todayResult.value    : [];
  const googleUpcoming = upcomingResult.status === "fulfilled" ? upcomingResult.value : [];
  const outlookToday   = outlookTodayResult.status    === "fulfilled" ? outlookTodayResult.value    : [];
  const outlookUpcoming = outlookUpcomingResult.status === "fulfilled" ? outlookUpcomingResult.value : [];

  const todayEvents    = mergeEvents(googleToday,    outlookToday);
  const upcomingEvents = mergeEvents(googleUpcoming, outlookUpcoming);
  const hasError = todayResult.status === "rejected";

  const byDay: Record<string, CalendarEvent[]> = {};
  for (const ev of upcomingEvents) {
    const dayKey = ev.start.split("T")[0];
    const d = parseISO(dayKey + "T00:00:00");
    if (isToday(d)) continue;
    if (!byDay[dayKey]) byDay[dayKey] = [];
    byDay[dayKey].push(ev);
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar section="CALENDAR" title="Calendar" />

      <main className="flex-1 p-4 md:p-8 max-w-3xl w-full">
        {hasError && (
          <div className="mb-6 rounded-xl p-4 flex items-center gap-3"
            style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }}>
            <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "rgba(248,113,113,0.8)" }} />
            <p className="text-sm" style={{ color: "rgba(248,113,113,0.9)" }}>
              Could not load Google Calendar. Sign out and back in to reconnect.
            </p>
          </div>
        )}

        {/* Outlook connect bar */}
        <OutlookAccountBar
          connectUrl={connectUrl}
          outlookEmail={outlookEmail}
          justConnected={justConnected}
        />

        {/* Today */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(200,144,10,0.15)", border: "1px solid rgba(200,144,10,0.2)" }}>
              <Calendar className="w-4 h-4" style={{ color: "#C8900A" }} />
            </div>
            <div>
              <p className="text-[10px] tracking-widest uppercase font-medium" style={{ color: "rgba(200,144,10,0.8)" }}>TODAY</p>
              <p className="text-sm font-semibold" style={{ color: "#F5F0E8" }}>
                {format(new Date(), "EEEE, MMMM d")}
              </p>
            </div>
            {todayEvents.length > 0 && (
              <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(200,144,10,0.15)", color: "#E8B428", border: "1px solid rgba(200,144,10,0.2)" }}>
                {todayEvents.length} event{todayEvents.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {todayEvents.length === 0 ? (
            <div className="rounded-2xl p-8 text-center"
              style={{ background: "#161210", border: "1px solid rgba(255,235,180,0.06)" }}>
              <p style={{ color: "rgba(245,240,232,0.3)" }}>Nothing scheduled for today</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {todayEvents.map((ev) => <EventCard key={ev.id} event={ev} />)}
            </div>
          )}
        </section>

        {/* Upcoming */}
        {Object.keys(byDay).length > 0 && (
          <section>
            <p className="text-[10px] tracking-widest uppercase font-medium mb-5"
              style={{ color: "rgba(245,240,232,0.3)" }}>
              COMING UP
            </p>
            <div className="flex flex-col gap-7">
              {Object.entries(byDay).map(([dayKey, events]) => (
                <div key={dayKey}>
                  <p className="text-sm font-medium mb-3" style={{ color: "rgba(245,240,232,0.5)" }}>
                    {dayLabel(dayKey)}
                  </p>
                  <div className="flex flex-col gap-3">
                    {events.map((ev) => <EventCard key={ev.id} event={ev} />)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
