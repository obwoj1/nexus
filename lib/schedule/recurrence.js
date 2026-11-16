export function nextOccurrence(currentRun, recurrence, now) {
  if (recurrence === "once") return null;
  const next = new Date(currentRun);
  do {
    next.setUTCDate(next.getUTCDate() + (recurrence === "weekly" ? 7 : 1));
  } while (next <= now || (recurrence === "weekdays" && [0, 6].includes(next.getUTCDay())));
  return next.toISOString();
}
