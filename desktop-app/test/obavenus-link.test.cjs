const test = require("node:test");
const assert = require("node:assert/strict");
const { createObavenusDraftUrl } = require("../electron/obavenus-link.cjs");

test("creates an encoded Obavenus draft deep link", () => {
  const url = new URL(createObavenusDraftUrl("Review BIO 101 assignments"));
  assert.equal(url.protocol, "obavenus:");
  assert.equal(url.hostname, "open");
  assert.equal(url.searchParams.get("source"), "nexus");
  assert.equal(url.searchParams.get("prompt"), "Review BIO 101 assignments");
});

test("rejects empty or oversized prompts", () => {
  assert.throws(() => createObavenusDraftUrl("  "));
  assert.throws(() => createObavenusDraftUrl("x".repeat(2001)));
});
