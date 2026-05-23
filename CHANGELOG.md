# Changelog

## [Unreleased]

### Added — Phase 5: Workouts — full expansion (2026-05-23, Session 12 continued)
- feat(workouts): streak counter — OverviewSection computes consecutive-day streak from combined session set
- feat(workouts): 1RM estimator — ProgressSection adds dashed gold Est. 1RM line (Epley formula) to max-weight chart + 3-column personal bests grid
- feat(workouts): history search — HistorySection filters sessions by name or any exercise in that session, live as you type
- feat(workouts): duration tracking — LogSection starts a live elapsed timer on session start, Finish button writes duration_minutes to DB
- feat(workouts): "Last time" reference — LogSection builds exerciseId→sets map from recentSessions prop, shows "Last: 3×185 3×185" below each exercise name, zero extra DB queries
- feat(workouts): PR detection — LogSection compares new set weight to previous max; shows 4-second gold "NEW PR" badge on that exercise block
- feat(workouts): photo comparison — PhotosSection compare mode lets you select 2 photos, renders side-by-side animated view via Framer Motion AnimatePresence
- feat(workouts): body metrics log — BodyMetricsSection: daily weight+BF% log, latest snapshot cards, weight trend LineChart (≥2 points), chronological table with delete
- feat(workouts): custom exercises — picker "no results" state shows inline form to create custom exercise (muscle group/equipment/type), immediately added to live session
- feat(workouts): WorkoutsShell — 7-tab nav (Overview / Log / History / Templates / Progress / Photos / Metrics)
- feat(workouts): page fetches custom_exercises + body_metrics, merges with global exercises
- chore(db): custom_exercises table (user_id+name unique) with RLS
- chore(db): body_metrics table (user_id+date unique, upsert-safe) with RLS
- feat(workouts): server actions — upsertBodyMetricAction, deleteBodyMetricAction, createCustomExerciseAction

### Fixed — Workouts reliability (2026-05-23, Session 12 continued)
- fix(workouts): wrap all server actions in try/catch — createSession, updateSession, deleteSession, addSet, updateSet, deleteSet, createTemplate, deleteTemplate, removeExerciseFromTemplate now return {error} instead of throwing silently
- fix(workouts): surface createSession error in LogSection UI — red error banner below empty state
- feat(workouts): close exercise picker on Escape key or click outside (useEffect + ref)
- feat(workouts): session notes visible in HistorySection expanded view

### Added — Phase 5: Workouts expansion (2026-05-23, Session 12)
- feat(workouts): OverviewSection — weekly stats (sessions + lbs moved), muscle group volume donut, 8-week session frequency bar chart, "most trained" callout
- feat(workouts): PhotosSection — upload progress photos, 3-column gallery with date overlay, full lightbox with prev/next nav + delete, optimistic UI
- feat(workouts): server actions — uploadBodyPhotoAction (Supabase Storage), deleteBodyPhotoAction, refreshPhotoUrlAction
- chore(db): body_photos table + storage bucket "body-progress" (private, 10MB limit, images only) with RLS
- feat(workouts): WorkoutsShell — 6-tab nav (Overview / Log / History / Templates / Progress / Photos), defaults to Overview
- feat(workouts): LogSection — session notes textarea, saves on blur via updateSessionAction
- feat(workouts): workouts page fetches 90-day session history + body photos with signed URLs

### Added — Phase 5: Workouts (2026-05-21, Session 11 — partial)
- chore(db): 5 new tables — exercises (global seed), workout_templates, template_exercises, workout_sessions, session_sets — all with RLS
- chore(db): 36 exercises seeded across 7 muscle groups (Chest/Back/Legs/Shoulders/Arms/Core/Cardio)
- feat(workouts): /workouts page — parallel server fetch for exercises, today's session, recent history, templates
- feat(workouts): WorkoutsShell — 4-section left nav (Log / History / Templates / Progress)
- feat(workouts): LogSection — start workout (blank or from template), exercise picker grouped by muscle, inline set logging (reps + lbs), delete sets/exercises, rename session
- feat(workouts): HistorySection — last 20 sessions, expandable to show all exercises + set chips with volume total
- feat(workouts): server actions — createSession, updateSession, deleteSession, addSet, updateSet, deleteSet, createTemplate, deleteTemplate, removeExerciseFromTemplate, getExerciseProgress
- feat(workouts): TemplatesSection — create/manage workout plans, ordered exercise list, remove individual exercises
- feat(workouts): ProgressSection — exercise search dropdown, max weight line chart, total volume line chart, personal bests cards
- feat(sidebar): Workouts nav item enabled (live: true)

### Added — Phase 4: Charts (2026-05-21, Session 10)
- feat(tracking): HabitsSection — 30-day completion bar chart, each bar colored to habit's color
- feat(tracking): SubscriptionsSection — spending-by-category donut chart with legend
- feat(tracking): GoalsSection — horizontal progress bar chart (gold = active, green = done)
- feat(tracking): HealthSection — dual-line trend chart: sleep (h) on left axis, mood /5 on right axis
- feat(tracking): ReadingSection — library split donut (to-read/reading/done) + ratings distribution bar chart

### Added — Phase 4: Claudia AI (2026-05-21, Session 10)
- feat(tracking): Claudia AI integration — `askClaudiaTrackingAction` fetches all 7 tracking tables, formats context, calls claude-sonnet-4-6 with full conversation history
- feat(tracking): ClaudiaPanel — 360px sliding right panel with spring animation, bouncing dots indicator, auto-greeting on first open
- feat(tracking): Ask Claudia button in TrackingShell left nav (bottom), toggles panel open/closed

### Added — Phase 4: Tracking (2026-05-21, Session 9)
- chore(db): 7 new tables — habits, habit_logs, subscriptions, goals, reading_list, health_metrics, important_dates — all with RLS
- feat(tracking): /tracking page — parallel server fetch for all sections
- feat(tracking): TrackingShell — left nav with 6 sections, gold active indicator
- feat(tracking): Habits — 7-day dot grid, streak counter (🔥), color picker, add/delete
- feat(tracking): Subscriptions — monthly & annual burn totals, billing cycle, days until next bill
- feat(tracking): Goals — progress slider (0–100), target date countdown, active/completed split
- feat(tracking): Reading — 3-column kanban (to-read/reading/done), star ratings, status transitions
- feat(tracking): Health — daily sleep/water/mood/weight log with emoji mood picker, 7-day history
- feat(tracking): Dates — birthdays/anniversaries/deadlines, recurring yearly, days-until countdown
- feat(sidebar): Tracking nav item enabled (live: true)

### Added — Phase 3: Notes polish (2026-05-21, Session 8 continued)
- perf(notes): lazy-load note content on demand — page fetches metadata only, content fetched per-note on first open
- perf(notes): today's journal content pre-fetched server-side so it opens instantly
- feat(notes): collapsible "Recent" section in journal sidebar — last 7 past entries, expandable
- fix(notes): removed Ask Claudia from editor (selection bug, revisit Phase 7)
- fix(notes): journal sidebar shows only today; past entries via Recent section

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
