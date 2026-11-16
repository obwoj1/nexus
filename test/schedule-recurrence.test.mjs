import test from "node:test";
import assert from "node:assert/strict";
import { nextOccurrence } from "../lib/schedule/recurrence.js";

test("one-time schedules finish after their run", () => {
  assert.equal(nextOccurrence("2026-11-16T05:00:00.000Z", "once", new Date("2026-11-16T12:00:00.000Z")), null);
});

test("daily recurrence advances past missed dates without drifting", () => {
  assert.equal(nextOccurrence("2026-11-14T05:00:00.000Z", "daily", new Date("2026-11-16T12:00:00.000Z")), "2026-11-17T05:00:00.000Z");
});

test("weekday recurrence skips weekends", () => {
  assert.equal(nextOccurrence("2026-11-20T05:00:00.000Z", "weekdays", new Date("2026-11-20T12:00:00.000Z")), "2026-11-23T05:00:00.000Z");
});

test("weekly recurrence preserves the original scheduled time", () => {
  assert.equal(nextOccurrence("2026-11-16T05:00:00.000Z", "weekly", new Date("2026-11-16T12:00:00.000Z")), "2026-11-23T05:00:00.000Z");
});
