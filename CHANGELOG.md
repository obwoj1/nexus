# Changelog

## [Unreleased]

### Added — Phase 3: Notes (2026-05-21, Sessions 5–8)
- feat(db): notes table with RLS — id, user_id, title, content (jsonb), is_pinned, is_journal, created_at, updated_at
- feat(notes): full Notion-style block editor via BlockNote v0.51.1, dark/gold Nexus theme
- feat(notes): notes sidebar with pin, delete, real-time title sync via titleOverride prop
- feat(notes): note content persistence — editor.onChange() subscription, replaceBlocks on mount, isLoadingRef gate
- feat(notes): auto-save with 500ms debounce, router.refresh() after save to bust Next.js Router Cache
- feat(notes): createAdminClient() for all DB queries — bypasses RLS cookie propagation issues on hard refresh
- feat(notes): note search — live filter in sidebar by title
- feat(notes): daily journal — auto-creates today's entry on page load using user's timezone (EST default)
- feat(notes): journal section — separate JOURNAL sidebar section with BookOpen icon, collapsible, Today button
- feat(notes): timezone preference — stored in nexus-tz cookie, timezone picker (globe icon) in journal header
- feat(notes): journal title format — full date e.g. "Wednesday, May 21, 2026" using user's timezone
- feat(notes): AI writing assist ("Ask Claudia") — select text → Rewrite / Expand / Summarize / Fix grammar
- feat(notes): AI assist uses claude-sonnet-4-6 via Anthropic SDK, selection snapshot stored in ref to survive editor blur
- style(notes): BlockNote editor themed to Nexus dark/gold — transparent background, gold menus/borders, cream text
- fix(notes): isLoadingRef gate prevents spurious saves during React Strict Mode double-mount
- fix(notes): titleRef keeps current title accessible inside debounced onChange closure
- fix(notes): onMouseDown preventDefault on AI assist buttons preserves ProseMirror selection
- fix(notes): selection snapshot (from + to + text) stored in ref so AI assist works after editor blur
- chore(db): is_journal boolean column added to notes table

### Added — Phase 2 + AI Email (2026-05-20, Session 4)
- feat(auth): expand Google OAuth scopes to include Calendar + Gmail (access_type offline, prompt consent)
- feat(db): add google_access_token, google_refresh_token, google_token_expires_at to profiles table
- feat(auth): save provider_token + provider_refresh_token to profiles on every OAuth login
- feat(google): token refresh layer — auto-refreshes expired Google access tokens via OAuth2 endpoint
- feat(calendar): Google Calendar API service — getTodayEvents, getUpcomingEvents
- feat(gmail): Gmail API service — getInboxMessages, getInboxStats, getOldUnreadMessages, markMessagesAsRead, batchMarkOldAsRead
- feat(dashboard): dashboard page converted to server component — fetches live calendar + Gmail data
- feat(dashboard): Calendar and Inbox widgets show real data; link to /calendar and /mail
- feat(calendar): full calendar page at /calendar — today's agenda + 7-day upcoming view
- feat(mail): full mail page at /mail — inbox list with unread count, sender, subject, snippet
- feat(mail): Quick Read panel — shows emails unread 30+ days, individual + bulk mark-as-read
- feat(ai): Claude email analyzer with prompt caching — flags important emails, generates inbox summary
- feat(mail): AI Inbox Summary card — scan inbox button, Claude digest, flagged items with priority dots
- feat(dashboard): Priority Inbox card — full-width AI row, surfaces top 3 important emails on homepage
- chore(deps): install @anthropic-ai/sdk
- feat(sidebar): Calendar and Mail nav items enabled (live: true)

### Added — Phase 1 completion + Vercel (2026-05-13, Session 3)
- chore(deploy): Vercel deployment live at https://nexus-kappa-henna.vercel.app
- chore(middleware): rename middleware.ts → proxy.ts for Next.js 16 convention

### Added
- feat(db): profiles table with RLS and auto-create trigger on user signup
- feat(auth): upsert profile row on OAuth callback (syncs Google name + avatar)
- feat(admin): server actions — getWaitlist and updateWaitlistStatus (owner-only)
- feat(admin): WaitlistTable client component with inline status dropdown
- feat(admin): waitlist admin page at /admin — stats cards + table, owner-only guard

### Fixed
- fix(types): Zod .issues (was .errors), Framer Motion ease as const

### Added
- chore(setup): scaffold Next.js 15 project with TypeScript, Tailwind v4, App Router
- chore(deps): install Supabase, Framer Motion, Lucide, Zod, React Hook Form, TanStack Query, date-fns, next-themes
- chore(ui): initialize shadcn/ui with Nexus black & gold theme tokens
- style(globals): apply full Nexus design token system to globals.css
- docs: add CLAUDE.md, CHANGELOG.md, README.md
- feat(supabase): browser client, server client, admin client, middleware session helper
- feat(middleware): route protection, multi-user auth, public/private route split
- feat(db): waitlist table with RLS — anon insert only
- feat(waitlist): server action with Zod validation and duplicate email handling
- feat(layout): QueryProvider, Geist fonts, dark mode, Nexus metadata
- feat(landing): hero, waitlist form, dashboard UI preview, features grid, footer CTA
- feat(auth): login page — Google OAuth + email/password
- feat(auth): OAuth callback route — code exchange, redirect to dashboard
- feat(auth): Google OAuth live — Supabase provider configured, redirect URIs set for local + production
