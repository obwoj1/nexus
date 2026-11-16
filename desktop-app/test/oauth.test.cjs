const test = require("node:test");
const assert = require("node:assert/strict");
const { getOAuthRedirectForOrigin, isAllowedGoogleOAuthUrl, parseOAuthCallback } = require("../electron/oauth.cjs");

const nexus = "https://nexus-kappa-henna.vercel.app";
const coursewell = "https://coursewell.vercel.app";

test("desktop auth returns each product to its own registered callback", () => {
  assert.equal(getOAuthRedirectForOrigin(nexus, nexus, coursewell), "com.obwoj1.nexus://auth/callback");
  assert.equal(getOAuthRedirectForOrigin(coursewell, nexus, coursewell), "com.obwoj1.nexus://auth/coursewell");
  assert.equal(getOAuthRedirectForOrigin("https://unexpected.example", nexus, coursewell), null);
});

test("system browser launch accepts only Google authorization through Supabase to the expected redirect", () => {
  const url = "https://project.supabase.co/auth/v1/authorize?provider=google&redirect_to=com.obwoj1.nexus%3A%2F%2Fauth%2Fcallback";
  assert.equal(isAllowedGoogleOAuthUrl(url, "com.obwoj1.nexus://auth/callback"), true);
  assert.equal(isAllowedGoogleOAuthUrl(url, "com.obwoj1.nexus://auth/coursewell"), false);
  assert.equal(isAllowedGoogleOAuthUrl("https://accounts.google.com/o/oauth2/auth?provider=google", "com.obwoj1.nexus://auth/callback"), false);
});

test("deep link callback accepts only product routes with a code or an auth error", () => {
  assert.deepEqual(parseOAuthCallback("com.obwoj1.nexus://auth/callback?code=one-time-code"), { product: "nexus", code: "one-time-code", error: null });
  assert.deepEqual(parseOAuthCallback("com.obwoj1.nexus://auth/coursewell?code=one-time-code"), { product: "coursewell", code: "one-time-code", error: null });
  assert.equal(parseOAuthCallback("https://example.com/auth/callback?code=x"), null);
  assert.equal(parseOAuthCallback("com.obwoj1.nexus://auth/other?code=x"), null);
  assert.equal(parseOAuthCallback("com.obwoj1.nexus://auth/callback"), null);
});
