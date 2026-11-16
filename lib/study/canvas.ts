import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

type CanvasCourse = { id: string; name: string; code: string };
type CanvasAssignment = { id: string; courseId: string; title: string; dueAt: string | null; details: string; completed: boolean };

function publicAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0) || (a === 192 && b === 0 && c === 0));
  }
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    if (normalized.startsWith("::ffff:")) return publicAddress(normalized.slice(7));
    return normalized.startsWith("2") || normalized.startsWith("3");
  }
  return false;
}

export function normalizeCanvasOrigin(input: string) {
  const raw = input.trim();
  const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password || (url.pathname !== "/" && url.pathname !== "") || url.search || url.hash) {
    throw new Error("Enter the HTTPS address of your Canvas school.");
  }
  return url.origin;
}

async function assertPublicCanvasHost(origin: string) {
  const host = new URL(origin).hostname;
  const records = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some(({ address }) => !publicAddress(address))) throw new Error("This school address resolves to a private or reserved network.");
}

async function readCanvasPages(origin: string, token: string, path: string) {
  const results: Record<string, unknown>[] = [];
  let next: URL | null = new URL(path, `${origin}/`);
  for (let page = 0; next && page < 10; page++) {
    if (next.origin !== origin || !next.pathname.startsWith("/api/v1/")) throw new Error("Canvas returned an unsafe pagination link.");
    const response: Response = await fetch(next.toString(), { headers: { authorization: `Bearer ${token}`, accept: "application/json" }, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Canvas rejected this token. Use a read-only Canvas access token." : `Canvas returned ${response.status}. Check the school address and try again.`);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error("Canvas returned an unexpected response.");
    results.push(...data as Record<string, unknown>[]);
    const link = response.headers.get("link") ?? "";
    const href = link.split(",").map((part) => part.trim()).find((part) => /rel="next"/.test(part))?.match(/<([^>]+)>/)?.[1];
    next = href ? new URL(href, origin) : null;
  }
  if (next) throw new Error("Canvas has too many pages to sync at once. Narrow your active course list.");
  return results;
}

export async function syncCanvasCourses(originInput: string, tokenInput: string) {
  const origin = normalizeCanvasOrigin(originInput);
  const token = tokenInput.trim();
  if (!token || token.length > 4096) throw new Error("Enter a valid Canvas access token.");
  await assertPublicCanvasHost(origin);

  const profileResponse = await fetch(new URL("/api/v1/users/self/profile", origin), {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" }, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(20_000),
  });
  if (!profileResponse.ok) throw new Error(profileResponse.status === 401 || profileResponse.status === 403 ? "Canvas rejected this token." : `Canvas returned ${profileResponse.status}.`);
  const profile = await profileResponse.json() as { name?: string };

  const rawCourses = await readCanvasPages(origin, token, "/api/v1/users/self/courses?enrollment_state=active&per_page=50");
  const courses: CanvasCourse[] = rawCourses.filter((item) => item.id && typeof item.name === "string").slice(0, 30).map((item) => ({ id: String(item.id), name: String(item.name).slice(0, 160), code: String(item.course_code ?? "").slice(0, 40) }));
  let cursor = 0;
  const assignments: CanvasAssignment[] = [];
  await Promise.all(Array.from({ length: Math.min(3, courses.length) }, async () => {
    while (cursor < courses.length) {
      const course = courses[cursor++];
      const items = await readCanvasPages(origin, token, `/api/v1/courses/${encodeURIComponent(course.id)}/assignments?per_page=50`);
      for (const item of items.slice(0, 100)) {
        if (!item.id || typeof item.name !== "string") continue;
        const dueAt = typeof item.due_at === "string" && Number.isFinite(Date.parse(item.due_at)) ? new Date(item.due_at).toISOString() : null;
        const description = typeof item.description === "string" ? item.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000) : "";
        assignments.push({ id: `${course.id}:${item.id}`, courseId: course.id, title: item.name.slice(0, 240), dueAt, details: description, completed: item.has_submitted_submissions === true });
      }
    }
  }));
  return { studentName: String(profile.name ?? "Canvas student").slice(0, 100), courses, assignments };
}
