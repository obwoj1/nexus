# Nexus — Dev Log

> Session-by-session record of what was built, what broke, and what was learned.
> Complements CHANGELOG.md (what changed) and ISSUES.md (deep bug dives).
> Written for reflection, portfolio, and future-self reference.

---

## Session 1 — Project scaffold (2026-05-11)

**Goal:** Get the project bootstrapped with the right stack and deployed.

**Done:**
- Initialized Next.js 15 with TypeScript strict mode, Tailwind v4, App Router
- Set up private GitHub repo `nexus`, connected to Vercel for auto-deploy
- Configured Supabase project — auth, Postgres, RLS
- Installed all core deps: Supabase SSO, Framer Motion, Lucide, Zod, date-fns, TanStack Query
- Set up shadcn/ui with Nexus black/gold design token system
- Implemented Supabase waitlist table + anonymous insert server action
- Built landing page with waitlist form, dashboard preview, features grid

**Design decisions:**
- Went with App Router + Server Actions over Pages Router — RSC performance and colocation of server logic
- Chose Supabase over Prisma+PlanetScale for the integrated auth + storage + realtime story
- Single-user app from day one — no multi-tenant architecture

---

## Session 2 — Auth + admin panel (2026-05-12)

**Goal:** Lock down the app to owner-only access and build admin tooling.

**Done:**
- Google OAuth via Supabase — login page, callback route, session middleware
- Single-user lockdown via `ALLOWED_EMAIL` env var in middleware
- Profiles table with auto-create trigger on new user signup
- Admin panel at `/admin` — waitlist stats + status management table
- Shell layout: sidebar with 7 nav items (5 disabled with "Soon" tag), topbar, page transitions

**Learned:**
- Supabase RLS silently returns empty results (not errors) when a policy blocks access — this made debugging admin queries very painful until discovering the admin client pattern
- `@supabase/ssr`'s `createServerClient` threads user session through cookies even with the service role key — had to use `@supabase/supabase-js` directly for a true bypass

---

## Session 3 — Phase 1 polish + Vercel deploy (2026-05-13)

**Goal:** Ship Phase 1 to production.

**Done:**
- Vercel deployment live
- Next.js 16 middleware rename (middleware.ts → proxy.ts)
- Dashboard placeholder widgets: greeting, today's events, inbox, portfolio, habits
- Page transition animations with Framer Motion

---

## Session 4 — Phase 2: Calendar + Gmail (2026-05-20)

**Goal:** Wire up real Google Calendar and Gmail data.

**Done:**
- Expanded Google OAuth scopes to include Calendar + Gmail (offline access, refresh tokens)
- Stored provider tokens in profiles table at OAuth callback time
- Token refresh layer: auto-refreshes expired Google access tokens
- Google Calendar API service — today's events, upcoming 7-day view
- Gmail API service — inbox list, unread stats, mark-as-read (needed gmail.modify scope)
- Dashboard converted to server component with live Calendar + Gmail data
- Full Calendar page at /calendar
- Full Mail page at /mail with Quick Read panel (flags emails unread 30+ days)
- Claude AI email analyzer with prompt caching — inbox summary + important email flagging
- Priority Inbox card on dashboard — surfaces top 3 flagged emails

**Learned:**
- Google OAuth tokens (provider_token) are only available in the session object at the exact moment of code exchange — Supabase doesn't persist them. Had to capture them in the callback and store manually.
- Google access tokens expire after 1 hour. Built refresh logic with a 5-minute buffer.
- Gmail readonly scope doesn't allow marking as read — needed gmail.modify.

---

## Session 5 — Phase 3 start: Notes foundation (2026-05-20)

**Goal:** Build the notes feature — block editor, persistence, sidebar.

**Done:**
- Notes table in Supabase (id, user_id, title, content jsonb, is_pinned, updated_at)
- BlockNote v0.51.1 integrated with ssr: false dynamic import
- NoteEditor: title input + block editor, auto-save with 500ms debounce
- NotesList sidebar: create, delete, pin, live title updates via titleOverride prop
- NotesShell: parent component managing active note state

**Major bugs fixed:**
- BlockNote onChange prop unreliable — switched to editor.onChange() subscription
- Content not persisting — stale closure on title; fixed with titleRef
- React Strict Mode double-mount causing spurious saves — fixed with isLoadingRef gate
- Notes list empty on hard refresh — switched page query to createAdminClient() to bypass RLS cookie issues
- Stale navigation data — router.refresh() after every save to bust Next.js Router Cache

---

## Session 6 — Phase 3 continued: Search + Journal + AI assist (2026-05-20)

**Goal:** Finish Phase 3 features.

**Done:**
- Note search: live filter by title in sidebar
- Daily journal: auto-creates today's entry on page load, opens by default
- AI writing assist "Ask Claudia": select text → 4 modes via claude-sonnet-4-6
- BlockNote editor themed to Nexus dark/gold aesthetic

---

## Session 7 — Phase 3 polish: Journal redesign + fixes (2026-05-21)

**Goal:** Redesign journal as dedicated section, fix AI assist.

**Done:**
- Journal sidebar section: separate JOURNAL section with BookOpen icon, collapsible, Today button
- Timezone preference: stored in nexus-tz cookie, globe icon picker with 10 timezone options
- Journal title format: full date "Wednesday, May 21, 2026" using user's timezone
- AI assist fix: selection snapshot stored in ref (from + to + text) — survives editor blur
- Fixed critical: removed is_journal from select query — was silently blanking all notes when column didn't exist
- Added is_journal migration + backfill for existing journal notes (optional, non-blocking)

**Architecture note:**
Learned that Supabase PostgREST errors when you select a non-existent column, and destructuring only `data` hides that error — the whole page goes blank with "No notes yet." Always check `error` alongside `data`.

---

## What's next (Phase 4 target)

- General tracking: habits (daily checkmarks, streaks), subscriptions (amount + billing cycle), goals (milestones + progress)
- Reading list: books + articles, status, ratings
- Health metrics: sleep, water, mood, weight — daily entries + charts
- Important dates: birthdays, deadlines — surface on dashboard
