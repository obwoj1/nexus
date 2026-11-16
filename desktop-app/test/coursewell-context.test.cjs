const test = require("node:test");
const assert = require("node:assert/strict");
const { sanitizeCoursewellContext } = require("../electron/coursewell-context.cjs");

test("keeps only bounded assignment fields", () => {
  const value = sanitizeCoursewellContext({ sharedAt: "2026-11-15T12:00:00Z", assignments: [{ title: "Essay", course: "BIO", dueAt: "2026-11-16T12:00:00Z", secret: "drop" }] });
  assert.deepEqual(value.assignments[0], { title: "Essay", course: "BIO", dueAt: "2026-11-16T12:00:00.000Z" });
});

test("rejects malformed payloads and caps assignment count", () => {
  assert.throws(() => sanitizeCoursewellContext({ assignments: [] }));
  const assignments = Array.from({ length: 25 }, (_, index) => ({ title: String(index), course: "C", dueAt: "2026-11-16T12:00:00Z" }));
  assert.equal(sanitizeCoursewellContext({ sharedAt: "2026-11-15", assignments }).assignments.length, 20);
});
