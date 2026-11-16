export type ScheduleRecurrence = "once" | "daily" | "weekdays" | "weekly";
export function nextOccurrence(currentRun: string, recurrence: ScheduleRecurrence, now: Date): string | null;
