# Nexus — Project Context

## What it is
Nexus is my personal command center — a single web app that consolidates my entire digital life into one dark/gold premium interface. Single-user, private, deployed on Vercel. Not a product, not multi-tenant — just mine.

**Live URL:** https://nexus-kappa-henna.vercel.app  
**Stack:** Next.js 16 (App Router), TypeScript strict, Tailwind v4, shadcn/ui, Supabase (auth + DB + storage), Framer Motion, Anthropic Claude API, Google Gemini API, Finnhub API, CoinGecko API

---

## What's Built (All Live)

### Phase 1 — Auth + Dashboard
- Google OAuth login, single-user lockdown via `ALLOWED_EMAIL` env var
- Dark/gold shell: collapsible sidebar, topbar, page transitions
- Dashboard: live clock, time-based greeting rotation, Claudia AI briefing card, calendar widget, inbox widget, quick-nav cards

### Phase 2 — Gmail + Calendar
- Full Gmail API integration: inbox, unread count, Quick Read panel (bulk mark old emails read)
- Google Calendar: today's events + 7-day upcoming view
- AI email triage: Claude scans inbox, flags important emails, generates digest
- **Dual Google account support:** can connect a second Google account (e.g. school email) — Gmail and Calendar merge both inboxes/calendars automatically
- OAuth callback at `/auth/secondary-callback` saves secondary tokens; middleware updated to not intercept it

### Phase 3 — Notes
- BlockNote v0.51 block editor (Notion-style), dark/gold themed
- Auto-save debounced 1.5s, no manual save button
- Daily journal: auto-creates today's entry per timezone, deduplication on load
- Sidebar: pinned notes, search, journal section with Recent entries
- Lazy content loading: metadata only on page load, content fetched on first open

### Phase 4 — Tracking
- **Habits:** daily check-ins, 7-day dot grid, streaks, 30-day chart, color picker
- **Subscriptions:** monthly/annual burn totals, days until next bill, donut chart by category
- **Goals:** progress slider, target date countdown, horizontal bar chart
- **Reading list:** 3-column kanban (to-read/reading/done), star ratings, library donut chart
- **Health:** sleep (bedtime + wake time pickers → auto-calculates hours), water, mood emoji picker, weight — 14-day trend chart
- **Important Dates:** birthdays, anniversaries, deadlines, recurring yearly, days-until countdown

### Phase 5 — Workouts
- Exercise library (36 seeded across 7 muscle groups) + custom exercises
- Log sessions: sets/reps/weight, live elapsed timer, session notes
- Templates: save/reuse workout plans
- Progress charts: max weight, volume, Est. 1RM (Epley formula)
- PR detection: gold "NEW PR" badge on new personal best
- "Last time" reference: shows previous session's sets inline while logging
- Streak counter, body metrics (weight + BF%), progress photos with lightbox + compare mode
- 7-tab nav: Overview / Log / History / Templates / Progress / Photos / Metrics

### Phase 5b — Wardrobe
- Photo upload: Gemini Vision auto-categorizes each item (category, color, description, brand)
- Ask Claudia: vibe/occasion prompt → Gemini selects outfit + writes stylist caption + generates flat-lay image
- Saved Fits: grid view, mark worn (tracks worn_count + last_worn), expand for pieces
- Storage: Supabase private bucket

### Phase 6 — Investments
- Holdings: manual search/add (Finnhub symbol search), delete
- CSV import: parses Robinhood activity CSV (transaction log format — aggregates Buy/Sell into net positions with weighted avg cost basis, full RFC4180 parser handles multi-line fields)
- Gmail trade scan: scans Robinhood confirmation emails, parses positions, preview before import
- Live prices: Finnhub (stocks) + CoinGecko (crypto), 15s polling, no-flicker updates
- Portfolio donut chart, P&L per holding
- Loading skeletons on all 8 routes for instant nav feel

### Phase 7 — AI (Claudia Ainina)
- **Context engine** (`lib/ai/nexusContext.ts`): pulls all Supabase tables + Google Calendar in one parallel fetch
- **Global chat**: floating gold sparkle button on every page, slide-up panel, sessionStorage history, auto-briefing on first open
- **Dashboard briefing**: daily AI summary cached in sessionStorage (regenerates once per day)
- **System prompt tone**: calm, direct, grounded — "trusted analyst" not overly enthusiastic. Always uses EST. Cross-references data across sections.
- Model: `claude-sonnet-4-6`, max 500 tokens per response

---

## Architecture Notes

```
app/
  (auth)/auth/callback/          # Primary Google OAuth callback (Supabase)
  (auth)/auth/secondary-callback/ # Secondary Google account (manual token exchange)
  (app)/                         # All protected routes
    dashboard, mail, calendar, notes, tracking, workouts, wardrobe, investments
  actions/                       # All server actions (DB mutations, AI calls)

lib/
  supabase/server.ts             # createClient() (RLS) + createAdminClient() (bypasses RLS)
  google/tokens.ts               # getValidGoogleToken + getValidSecondaryGoogleToken + buildSecondaryGoogleAuthUrl
  google/gmail.ts                # Gmail service — merges primary + secondary accounts
  google/calendar.ts             # Calendar service — merges primary + secondary accounts
  ai/nexusContext.ts             # Builds full life context string for Claudia

proxy.ts                         # Middleware (renamed from middleware.ts for Next.js 16)
```

**Key rules:**
- All DB writes use `createAdminClient()` (service role, bypasses RLS)
- All auth reads use `createClient()` (cookie-based, RLS enforced)
- No secrets client-side. All API calls with secret keys are server actions or route handlers.
- Commit directly to `main`. 20+ commits per session. One logical unit per commit.

---

## Current Status

Everything above is live and working. Active bugs/pending:

| Item | Status |
|---|---|
| Investments page UI bugs | Needs session — general polish |
| Gmail trade parsing (Robinhood regex) | May need tuning against real emails |
| Gemini API key | May need updating for wardrobe AI |
| Web push notifications | Live — VAPID, native WebCrypto, daily cron at 8AM EDT |
| S3 swap (Supabase Storage → Amazon S3) | Deferred until all core features done |
| Price alerts for investments | Not built |
| Notes Claudia toolbar | Removed (selection bug) — revisit |

---

## What I Want Help With

*(fill this in before sharing)*
