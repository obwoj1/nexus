# Nexus — Dev Log

> Session-by-session record of what was built, what broke, and what was learned.
> Complements CHANGELOG.md (what changed) and ISSUES.md (deep bug dives).
> Written for reflection, portfolio, and future-self reference.

---

## Session 16 — Phase 7: Global Claudia AI (2026-05-26)

**Goal:** Build the AI layer — Claudia accessible from everywhere in the app, not just the Tracking section.

**Done:**

**Context engine (`lib/ai/nexusContext.ts`):**
- Pulls all data in one parallel Promise.all: habits + logs, subscriptions, goals, reading list, health metrics, important dates, investment holdings, workout sessions, recent notes, and calendar events (via Google API)
- Calendar is best-effort — skips silently if token is missing or expired
- Formats everything into a readable context string passed to Claude as the system prompt
- This is now the single source of truth for all AI features — no more per-section context builders

**Global Claudia action (`app/actions/claudia.ts`):**
- Two modes: `chat` (responds to conversation history) and `briefing` (generates a proactive daily summary)
- System prompt frames Claudia as a sharp personal AI who knows the user's actual data and references real numbers
- Replaces the tracking-specific `claudiaTracking.ts` for global use (tracking chat still uses its own for now)

**Floating chat (`components/layout/ClaudiaChat.tsx`):**
- Gold sparkle FAB button fixed to bottom-right on every page
- Click opens a slide-up chat panel (Framer Motion spring animation)
- First open triggers the briefing automatically — Claudia introduces herself with a data-driven summary
- sessionStorage persists last 40 messages for the session
- Mounted in `app/(app)/layout.tsx` so it's present across all routes

**Dashboard briefing card:**
- Added to top of dashboard grid above the greeting
- Calls `askClaudiaAction` in briefing mode on mount
- Caches result in sessionStorage keyed by today's date — only re-fetches once per day
- Shows animated typing dots while loading

**Dashboard greeting rotation:**
- Replaced static "Good morning/afternoon/evening" with 15 funny/flirty lines split by time window
- Cycles by hour so it rotates through the day without being random

**Gmail debug panel:**
- "Show debug info →" link appears under the parse-failure error
- Calls `debugGmailEmailAction` to fetch first Robinhood email and dump MIME type, snippet, decoded body, and regex match result
- Still pending: use this output to confirm whether body extraction or regex is the failure point

**What's next:**
- Use Gmail debug panel to fix trade parsing
- Consider adding Claudia to Notes (summarize note, expand section) as a floating toolbar
- Web push notifications
- Investment price alerts

---

## Session 15 — Investments: Gmail sync + page speed (2026-05-25)

**Goal:** Replace the scrapped Robinhood Bearer token flow with something that actually works. Make page transitions feel faster.

**Done:**

**Robinhood Bearer token — removed:**
- Built and immediately removed an approach that extracted Bearer tokens from DevTools — tokens expire fast, violates TOS, terrible UX
- Documented in ISSUES.md (Issue #22) with full alternatives analysis

**Gmail trade parsing (new, live):**
- Added `scanRobinhoodTrades()` to `lib/google/gmail.ts` — queries Gmail for emails `from:robinhood.com`, fetches full message bodies (base64url decoded), applies regex patterns to extract buy/sell trades
- Multi-part MIME support: prefers `text/plain`, falls back to `text/html` (strips tags)
- `aggregateTrades()` — groups by ticker, nets buys vs sells, computes weighted average cost basis on buys only
- New server action `scanGmailHoldingsAction` — runs the scan, returns positions + email count
- New server action `importGmailPositionsAction` — takes positions + skip list, calls `addHoldingAction` for each
- UI: "Gmail" button in investments header → scanning state → preview panel with per-ticker checkboxes → import button. Already-owned tickers pre-checked as skip

**Page speed (loading.tsx):**
- Added `loading.tsx` to all 8 app routes: dashboard, investments, notes, tracking, workouts, calendar, mail, wardrobe
- Each file shows a glass skeleton that matches the rough layout of that page
- Effect: clicking a nav item shows the skeleton within one frame instead of the app appearing frozen while the server component fetches data
- Sidebar already used Next.js `<Link>` (prefetching was already on) — no changes needed there

**Key technical note — Gmail email body decoding:**
- Gmail API returns message bodies base64url encoded (`-` and `_` instead of `+` and `/`)
- Standard `atob()` doesn't handle this — must replace chars before decoding or use `Buffer.from(data.replace(/-/g,'+').replace(/_/g,'/'), 'base64')`
- Multi-part MIME messages (most modern emails) need to traverse `payload.parts[]` to find the text content

**What's next:**
- Test Gmail scan with real Robinhood emails — regex patterns may need tuning based on actual email format
- Crypto price alerts / notifications
- Gemini API key update (still deferred)

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

## Session 8 — Phase 3 edge cases + performance (2026-05-21)

**Goal:** Long-term journal health, edge cases, lazy loading.

**Done:**
- Removed Ask Claudia (selection bug unfixable without deeper Tiptap work — revisit Phase 7)
- Lazy content loading: page now fetches only metadata for all notes; content loaded on demand per note; journal pre-fetched server-side so it opens instantly
- Journal sidebar: shows only today + collapsible "Recent" section (last 7 past entries)
- Timezone picker in journal header — saves to cookie, server reads it on next load to create journal with correct date

**Edge cases identified:**
- Empty note title saves as "" but displays as "Untitled" in sidebar (acceptable, handled by fallback)
- All journal entries (by title pattern) excluded from regular NOTES section so no collision
- New notes created optimistically get empty content in cache — no unnecessary fetch
- Content for deleted notes removed from cache to prevent memory leak

**Architecture win:**
Switching from "load all content upfront" to "lazy-load per note" means the initial page payload stays small regardless of how many notes/journal entries accumulate. Today's journal is the only content fetched at server render time.

---

## Session 9 — Phase 4: Tracking (2026-05-21)

**Goal:** Build all 6 tracking sections in one session.

**Done:**
- DB: 7 tables with RLS (habits + habit_logs, subscriptions, goals, reading_list, health_metrics, important_dates)
- Tracking page with parallel Promise.all fetch for all sections
- TrackingShell: left nav, section switching
- Habits: 7-day dot grid per habit, streak count from 60-day log history, 8 color options
- Subscriptions: monthly burn + annual total cards, billing cycle normalization (weekly×4.33, annual÷12)
- Goals: progress slider with 5% increments, auto-marks completed at 100%, target date countdown
- Reading: kanban board (3 columns), star ratings on "done" column, one-click status moves
- Health: upsert per day (unique user_id+date), emoji mood picker, 7-day compact log
- Dates: recurring yearly dates (advances to next year if past), urgency highlight within 7 days

**Architecture:**
- All server actions in one `tracking.ts` file for now — split by domain later if it grows
- Page uses `Promise.all` for parallel queries — single round-trip for all section data
- Today's date computed server-side using user's timezone cookie

---

## Session 10 — Phase 4: Charts + Claudia AI (2026-05-21)

**Goal:** Visual analytics per tracking section + Claudia AI integration.

**Charts done:**
- HabitsSection: Bar chart, 30-day completion rate per habit — uses reactive `logs` state (Set of `habit_id|date`) so updates live as user toggles
- SubscriptionsSection: Donut (innerRadius 55, outerRadius 80) split by category, computed from `subs` state with same monthly normalization logic
- GoalsSection: Horizontal bar chart (layout="vertical"), gold for active goals, green for completed, dynamic height based on goal count
- HealthSection: Dual-line chart, sleep on left Y axis (0-12h), mood on right Y axis (0-5), only shown when ≥2 data points exist
- ReadingSection: 2-column grid — status donut + star ratings bar chart (only shown when rated books exist), both conditional on data presence

**Architecture note:**
All chart data is derived inline from existing component state — no new props, no new fetches. Charts are reactive because they read from the same state as the interactive UI. IIFE pattern in ReadingSection keeps the conditional rendering clean without polluting the component scope with chart-only variables.

---

## Session 10 (continued) — Phase 4: Claudia AI integration (2026-05-21)

**Goal:** Give Claudia live access to all tracking data and build an interactive chat panel.

**Done:**
- `app/actions/claudiaTracking.ts` — server action that runs `Promise.all` across all 7 tracking tables, formats data as structured text (completion rates, streaks, burn totals, days-until, avg sleep/mood), injects into Claude's system prompt, calls `claude-sonnet-4-6` with full conversation history
- `components/tracking/ClaudiaPanel.tsx` — 360px right-side panel, spring animation, chat interface, bouncing dots typing indicator, auto-generates personalized greeting on first open
- `TrackingShell.tsx` — "Ask Claudia" button at bottom of left nav; panel slides in/out alongside content area

**How Claudia accesses data:**
Claudia does NOT have a direct database connection. The server action (`askClaudiaTrackingAction`) is what connects to Supabase — it fetches the data, formats it into a readable text block, and injects it as the Claude `system` prompt each turn. Claude's "knowledge" of your data is entirely from that formatted context window. The flow per message is: authenticate user → fetch all tables → format context → build system prompt with context embedded → send to Claude API → return response.

**Architecture note:**
Full conversation history is passed to Claude every turn (as `messages` array). This means Claudia remembers earlier parts of the chat within the session and can answer follow-up questions referencing previous context. History is held in React state only — not persisted to DB, so it resets on panel close.

---

## Session 11 — Phase 5: Workouts (2026-05-21, partial)

**Goal:** Full workout tracker — log sessions, browse history, manage templates, track progression.

**Done this session:**
- DB migration (`20260521_010_workouts.sql`): exercises (global, unique name), workout_templates, template_exercises, workout_sessions, session_sets — all with RLS. 36 exercises seeded across 7 muscle groups.
- `app/actions/workouts.ts`: full CRUD for sessions + sets + templates. Progress action fetches all user sessions, cross-references session_sets by exerciseId, groups by date to compute maxWeight and totalVolume per session.
- `app/(app)/workouts/page.tsx`: server page, Promise.all for exercises + today's session (maybeSingle) + recent 20 sessions + templates.
- `WorkoutsShell.tsx`: same left-nav pattern as TrackingShell, 4 items.
- `LogSection.tsx`: most complex component. State: `SessionState` (sets flat array) + `pendingExercises` (added to UI but no sets yet). Exercise picker dropdown grouped by muscle, searchable. Each exercise shows set rows + input row (reps + lbs + Log button). Enter key submits. Optimistic updates — set appears immediately, server action fires in background.
- `HistorySection.tsx`: expandable session cards. Derives exercise groups client-side from flat `session_sets` array. Shows total volume, unique exercise count.

**Completed next session (2026-05-23):**
- `TemplatesSection.tsx` — create template with name + ordered exercise list (searchable picker), delete template, remove individual exercise tags
- `ProgressSection.tsx` — search input with live dropdown, calls `getExerciseProgressAction` on select, renders max weight line chart + volume line chart + personal bests stat cards
- Sidebar Workouts `live: true` — Phase 5 fully live

**Architecture notes:**
- Sets are the source of truth. An exercise "exists" in a session only if it has ≥1 set OR is in `pendingExercises` state. No exercise-level records needed.
- Ownership checks for set delete/update use a 2-query pattern (get session_id from set, then verify user_id on session) — safer than nested join filter with admin client.
- Progress query: get all user session IDs first, then filter session_sets by exerciseId + those IDs, then group client-side by date. Clean and reliable.

---

## Session 12 — Phase 5: Workouts expansion (2026-05-23)

**Goal:** Make the Workouts module feel complete — analytics overview, progress photos, session notes.

**Done:**
- `OverviewSection.tsx` — landing tab for Workouts. Aggregates all sessions (today + 90-day history) client-side. Stat cards: this week sessions, this week volume (k lbs), total sessions, total volume. Muscle group donut (recharts PieChart with MUSCLE_COLORS map). 8-week session frequency bar chart (sliding window from `today` prop — no extra DB fetch). "Most trained muscle" callout row.
- `PhotosSection.tsx` — body progress photo gallery. Hidden file input triggered by "Add Photo" button. AnimatePresence upload form: image preview + date picker + optional notes. 3-column `aspect-square` grid with gradient date overlay. Click thumbnail → full lightbox (fixed overlay, AnimatePresence, Prev/Next nav with modulo wrapping, delete button). Fully optimistic state updates.
- `app/actions/workouts.ts` — three new server actions: `uploadBodyPhotoAction` (File → Uint8Array → Supabase Storage `body-progress` bucket → signed URL → DB insert), `deleteBodyPhotoAction` (ownership check + storage remove + DB delete), `refreshPhotoUrlAction` (generate fresh signed URL if expired).
- `supabase/migrations/20260523_011_body_photos.sql` — `body_photos` table (user_id, storage_path, date, notes), RLS, storage bucket (private, 10MB, images only), 3 storage RLS policies scoped to `/{user_id}/` folder prefix.
- `workouts/page.tsx` — updated to fetch 90-day session window (was `limit(20)`), now also fetches `body_photos` and generates signed URLs server-side via `Promise.all`.
- `WorkoutsShell.tsx` — expanded to 6-tab nav: Overview | Log | History | Templates | Progress | Photos. Defaults to Overview.
- `LogSection.tsx` — session notes textarea below the session header stats. Saves on blur via `updateSessionAction({ notes })`. `notes` field added to `SessionState` interface.

**Architecture notes:**
- Supabase Storage signed URLs have a 1-hour validity. Generated server-side at page load. `refreshPhotoUrlAction` exists if they expire client-side.
- `File.arrayBuffer()` → `Uint8Array` is required for Supabase Storage upload in Node.js runtime (edge runtime doesn't support it).
- Overview analytics run entirely client-side from the props passed at page render — no additional DB calls on tab switch.

**S3 note:** User expressed interest in swapping Supabase Storage for Amazon S3 post-MVP for real-world AWS experience. Integration would be near-identical (PutObjectCommand, GetObjectCommand with presigned URLs). Deferred until all core features are done.

**What's next:**
- Phase 6: Investments — US stocks + crypto, manual holdings, Finnhub/CoinGecko prices, portfolio view

---

## Session 12 (continued) — Phase 5: Workouts — full expansion + reliability (2026-05-23)

**Goal:** Implement all 8 suggested improvements + fix silent server action failures.

**Done:**
- **Streak counter** (`OverviewSection.tsx`) — `useMemo` iterates backwards from `today`, checks session date Set, counts consecutive days. Replaces the old "Total sessions" stat card.
- **1RM estimator** (`ProgressSection.tsx`) — Epley formula (`weight × (1 + reps/30)`) computed per set in `getExerciseProgressAction`. Max-weight chart gains a second dashed gold line for Est. 1RM. Personal bests grid is now 3 columns: Best Weight | Est. 1RM | Best Volume.
- **History search** (`HistorySection.tsx`) — `search` state + `filtered` memo. Matches against session name AND any exercise name in `session_sets`. Search input at top of section.
- **Duration tracking** (`LogSection.tsx`) — `elapsed` state (seconds) + `startedAtRef` + `setInterval` useEffect shows live "MM:SS" timer in session header. Finish button calls `updateSessionAction({ duration_minutes: Math.round(elapsed/60) || 1 })`.
- **"Last time" reference** (`LogSection.tsx`) — builds `lastTimeSets` map (exerciseId → RecentSet[]) from the `recentSessions` prop already fetched on page load — zero extra DB queries. Each ExerciseBlock shows "Last: 3×185  3×185" row below the exercise name.
- **PR detection** (`LogSection.tsx`) — after logging a set, compares `weightLbs` to `Math.max(...lastTimeSets[exerciseId].map(s => s.weight_lbs))`. Sets `newPRExercise` state for 4 seconds via `setTimeout`. ExerciseBlock renders gold "NEW PR" badge when `isPR` prop is true.
- **Photo comparison** (`PhotosSection.tsx`) — "Compare" toggle button in header. `compareMode` state + `compareIds` array (max 2). Photos show numbered circle badge when selected. `AnimatePresence` side-by-side view renders below grid when exactly 2 are chosen.
- **Body metrics** (`BodyMetricsSection.tsx`, new component) — daily log form (date, weight_lbs, body_fat_pct, notes). Optimistic state updates (filter+prepend). Latest snapshot 2-column card grid. Weight trend `LineChart` (only shown ≥2 weight data points). Chronological log table with trash button per entry.
- **Custom exercises** (`LogSection.tsx`) — picker "no results" state → "Create [name] as custom exercise" button → inline form (muscle group, equipment, type selects). Calls `createCustomExerciseAction`, immediately prepends to exercise list and opens exercise in current session.
- **WorkoutsShell** — expanded to 7 tabs: Overview | Log | History | Templates | Progress | Photos | Metrics.
- **`workouts/page.tsx`** — `Promise.all` now fetches 7 things: exercises, custom_exercises, today's session, 90-day recent sessions, templates, body_photos (with server-signed URLs), body_metrics.
- **All 9 server actions** wrapped in try/catch returning `{ error }` instead of throwing silently into `startTransition`.

**Root cause: "Start Workout does nothing" bug:**
- `AuthApiError: Invalid Refresh Token` → `getUserId()` threw → `startTransition` async callback rejected silently → UI had no feedback.
- Fix: try/catch on all actions + `actionError` state in LogSection for user-visible banner.

**New tables (run in Supabase SQL Editor):**
- `custom_exercises` — user_id + name unique, muscle_group, equipment, type
- `body_metrics` — user_id + date unique, weight_lbs, body_fat_pct, notes; upsert-safe

**Architecture notes:**
- "Last time" reference implemented with zero extra server round-trips by reusing the `recentSessions` prop.
- `upsert` with `onConflict: "user_id,date"` makes daily body metric logging idempotent — same-day re-entry updates instead of errors.
- Custom exercises stored in separate table from global `exercises` to avoid unique constraint conflicts with the 36 seeded exercises.

**What's next:**
- Wardrobe feature (Session 13), then Phase 6: Investments

---

## Session 13 — Wardrobe + Claudia Stylist (2026-05-23)

**Goal:** Build a personal wardrobe manager where Claudia (powered by Gemini) auto-categorizes clothing on upload and generates outfit flat-lay images on demand.

**Done:**
- `supabase/migrations/20260523_014_wardrobe.sql` — `wardrobe_items` (id, user_id, storage_path, category, color, description, brand) and `saved_outfits` (id, user_id, name, item_ids uuid[], generated_image_path, caption, worn_count, last_worn). Private `wardrobe` storage bucket (10MB, images only). RLS on all three.
- `app/actions/wardrobe.ts` — 6 server actions:
  - `uploadWardrobeItemAction` — takes a File from FormData, converts to base64, sends to Gemini Vision alongside a structured JSON prompt, parses returned category/color/description/brand, uploads photo to Supabase Storage, inserts row.
  - `generateOutfitAction` — fetches all wardrobe items + downloads each photo from storage, sends all images + wardrobe inventory text to `gemini-2.0-flash` which returns JSON (selected item IDs + stylist caption). Builds vertical flat-lay prompt from selected items' descriptions, calls `gemini-2.0-flash-preview-image-generation` which returns base64 image data. Uploads generated image to storage, returns signed URL.
  - `saveOutfitAction`, `deleteOutfitAction`, `markOutfitWornAction`, `deleteWardrobeItemAction` — standard CRUD with ownership checks.
- `app/(app)/wardrobe/page.tsx` — parallel fetch for wardrobe items + saved outfits, server-side signed URL generation for all photos.
- `components/wardrobe/WardrobeShell.tsx` — 3-tab nav shell matching Workouts style.
- `components/wardrobe/WardrobeSection.tsx` — multi-file upload (triggers Gemini Vision per file), category filter pills, 5-column photo grid with hover overlay, delete.
- `components/wardrobe/AskClaudiaSection.tsx` — vibe chips + free-text prompt, loading state, generated flat-lay display, Claudia's caption card, piece thumbnails, save button.
- `components/wardrobe/SavedFitsSection.tsx` — 2-column grid, click to expand shows caption + pieces + mark worn + delete.

**Architecture — how the pieces connect:**
- The browser never touches Gemini directly. All AI calls happen in server actions (`"use server"`) running on Vercel's Node.js runtime.
- Gemini Vision receives images as base64 `inlineData` in the `contents` array — alongside a text prompt telling it what JSON to return.
- Image generation uses `responseModalities: ["IMAGE"]` — Gemini returns image bytes as base64 in `candidates[0].content.parts`, decoded with `Buffer.from(base64, "base64")`, uploaded to Supabase Storage.
- `CLAUDIA_WARDROBE_SYSTEM` prompt instructs Claudia to switch tone — precise when categorizing, confident-stylist when building fits.
- Signed URLs are generated server-side at page load (1-hour validity). Client state seeded from these props — no client DB calls.

**Key decision — why two Gemini calls for outfit generation:**
A single call can't both reason about which clothes to pick AND generate an image simultaneously. Call 1 (vision model) picks items + writes caption. Call 2 (image generation model) gets text descriptions of chosen items and generates the flat-lay. The description bridge means the generated image represents the actual selected pieces.

**New env var:** `GEMINI_API_KEY` — added to `.env.local` (gitignored) and `.env.example` (placeholder).

**What's next:**
- Phase 6: Investments — US stocks + crypto, manual holdings, Finnhub/CoinGecko prices, portfolio view
