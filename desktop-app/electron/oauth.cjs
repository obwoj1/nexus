const APP_SCHEME = "com.obwoj1.nexus:";

function getOAuthRedirectForOrigin(origin, nexusOrigin, coursewellOrigin) {
  if (origin === nexusOrigin) return `${APP_SCHEME}//auth/callback`;
  if (origin === coursewellOrigin) return `${APP_SCHEME}//auth/coursewell`;
  return null;
}

function isAllowedGoogleOAuthUrl(rawUrl, redirectTo) {
  try {
    const url = new URL(rawUrl);
    return Boolean(redirectTo)
      && url.protocol === "https:"
      && url.hostname.endsWith(".supabase.co")
      && url.pathname.endsWith("/auth/v1/authorize")
      && url.searchParams.get("redirect_to") === redirectTo
      && url.searchParams.get("provider") === "google";
  } catch {
    return false;
  }
}

function parseOAuthCallback(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== APP_SCHEME || url.hostname !== "auth") return null;
    const product = url.pathname === "/callback" ? "nexus"
      : url.pathname === "/coursewell" ? "coursewell" : null;
    if (!product) return null;
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error_description") || url.searchParams.get("error");
    if (!code && !error) return null;
    return { product, code, error };
  } catch {
    return null;
  }
}

module.exports = { getOAuthRedirectForOrigin, isAllowedGoogleOAuthUrl, parseOAuthCallback };
