# CLAUDE.md — Nexus

> **The single source of truth for building Nexus.** Read this in full before writing any code. Re-read it at the start of every new session. If anything in this document conflicts with a user request, ask for clarification before proceeding.

---

## 1. WHAT WE'RE BUILDING

**Nexus** is a personal command center — a single web app that consolidates the owner's entire digital life into one beautiful, futuristic interface.

- **Audience:** One user. The owner. This is not a product for the public. No marketing pages, no signup flows for "users," no multi-tenant architecture. Just one person's command center.
- **Long-term path:** Built as a Next.js web app deployed to Vercel. Eventually ported to a native Swift iOS app. Architecture decisions should keep that port in mind (API-first, clean data layer, no logic locked inside React components).
- **Vision keyword:** *Premium.* Every detail should feel intentional, expensive, and refined. This is the owner's daily-use tool — it must be a joy to look at and use.

### Features (in priority order)

1. **Dashboard + Auth** *(Phase 1 — current)*
2. **Calendar + Gmail integration** *(Phase 2)*
3. **Notes** — Notion-style block editor *(Phase 3)*
4. **General tracking** — habits, subscriptions, goals, reading list, health metrics, important dates *(Phase 4)*
5. **Workouts** — exercise library, sets/reps/weight, progression tracking *(Phase 5)*
6. **Investments** — US stocks + crypto, real-time prices, manual holdings + Plaid later *(Phase 6)*
7. **AI layer** — Claude API integrated for note assistance, email summaries, smart suggestions *(Phase 7, after foundation is solid)*
8. **Notifications** — web push for now, email digests later *(woven through phases as needed)*

---

## 2. NON-NEGOTIABLES (Read this twice)

These rules override everything else. Never break them.

### 🔴 Workflow rules

1. **Plan → Approve → Execute.** Before writing or changing any code, propose a plan in plain English. Wait for the owner to approve. Only then execute. Even for "small" changes, propose first. No surprise refactors. No "while I was in there I also fixed..." — that's how scope creep happens.

2. **Push every committable change — silently, immediately.** Every logical unit of work gets committed and pushed right away. Don't batch, don't wait, don't announce each one. Target **20+ commits per session**. A new file, a tweak, a config change — all separate commits. If it changed, it ships. Owner does not need a notification for every push.

3. **Conventional commits.** Every commit message follows this format:
   ```
   <type>(<scope>): <subject>
   ```
   Types: `feat`, `fix`, `style`, `refactor`, `chore`, `docs`, `perf`, `test`
   Examples:
   - `feat(auth): add Supabase Google OAuth flow`
   - `style(dashboard): refine glass blur and gold border on cards`
   - `fix(layout): correct sidebar collapse on mobile`
   - `chore(deps): upgrade Next.js to 15.0.3`

4. **Commit directly to `main`.** Single-developer project — no PR ceremony needed. If a change is risky or experimental, ask the owner if a feature branch is wanted *before* starting.

5. **Update `CHANGELOG.md` with every commit.** Append a one-line entry under an "Unreleased" section. When a phase ships, the entries get grouped under a version tag.

6. **The repo is private. Keep it private.** Never suggest making it public.

### 🔴 Code quality rules

1. **TypeScript strict mode, always.** No `any` unless you can justify it to the owner. Prefer `unknown` and narrow.

2. **No secrets in code, ever.** All keys, tokens, and credentials live in `.env.local` (gitignored). Maintain `.env.example` with placeholder values for every required variable.

3. **Server-side for sensitive operations.** Anything that touches the database, calls a third-party API with a secret, or handles auth — runs in a Server Component, Server Action, or Route Handler. Never expose service-role keys to the client.

4. **No premature optimization, but no obvious waste either.** Don't add Redis before we need it. But also don't fetch the same data five times in one render.

5. **Accessibility is not optional.** Even though this is single-user, the owner deserves a UI that works with keyboards, respects reduced-motion preferences, and uses semantic HTML. shadcn handles a lot of this for free — don't fight it.

6. **Security check on every change.** Before committing any code, mentally audit for: exposed secrets, missing auth checks, SQL injection, XSS, unprotected API routes, service-role key leaking to the client, or missing RLS policies. If a security risk is found, fix it before committing — never ship known vulnerabilities. Flag any security concern to the owner immediately. Security hardening features will be added as a dedicated phase later, but the baseline must always be safe.

### 🔴 Design rules (the look)

The aesthetic is **Apple Vision Pro glass + subtle gold accents + cinematic motion**. Every UI decision should reinforce this.

- **Background:** Deep matte black (`#0A0A0A` to `#000000`), with subtle radial gradients for depth.
- **Glass surfaces:** Frosted blur (`backdrop-blur-xl`), low-opacity white fill (`bg-white/5` to `bg-white/10`), thin gold or white border (`border-white/10` for neutral, `border-[var(--gold)]/30` for emphasis).
- **Gold:** Used sparingly — accents, active states, key CTAs, highlights, dividers on important sections. Never used as a fill for large surfaces. The gold is `#D4AF37` (classic) with a brighter highlight variant `#F4D77E` for hover/glow states. Avoid the "gold gradient text" cliché — keep it elegant.
- **Typography:** `Geist Sans` for body and UI. `Geist Mono` for any numeric/data display. No serif. Tracking slightly tight on headings (`tracking-tight`).
- **Spacing:** Generous. This is a luxury product — let things breathe.
- **Corners:** Soft but not bubbly — `rounded-2xl` for cards, `rounded-xl` for inputs and buttons, `rounded-full` for pills/badges.
- **Animations:** Bold and cinematic. Use Framer Motion. Page transitions should feel like a 3D-layered shift. Cards should respond to hover with subtle lift and gold glow. Avoid bouncy/playful springs — use smooth `easeOut` and `easeInOut` with longer durations (300–600ms) to keep it feeling premium.
- **Reduced motion:** Always respect `prefers-reduced-motion`. Provide a simple fade fallback.

---

## 3. TECH STACK

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15** (App Router) | RSC by default, Server Actions for mutations |
| Language | **TypeScript** (strict) | No `any` without justification |
| Styling | **Tailwind CSS v4** | Use CSS variables for theme tokens |
| Components | **shadcn/ui** | Customized for black & gold theme |
| Backend | **Supabase** | Auth, Postgres, Storage, Realtime |
| Deployment | **Vercel** | Auto-deploy from `main` |
| Server state | **TanStack Query (React Query)** | For client-side data fetching/caching |
| Client state | **Zustand** | Only if/when we actually need it |
| Animation | **Framer Motion** | For all transitions and motion |
| Icons | **Lucide React** | Consistent stroke weight |
| Fonts | **Geist Sans + Geist Mono** | Via `next/font` |
| Validation | **Zod** | All form inputs, all API boundaries |
| Forms | **React Hook Form** + Zod resolver | Standard combo |
| Date handling | **date-fns** | Lightweight, tree-shakeable |

**Versions:** Always use the latest stable. If a major version bump introduces breaking changes, ask the owner before upgrading.

---

## 4. PROJECT STRUCTURE

```
nexus/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login, callback)
│   ├── (app)/                    # Protected app routes
│   │   ├── layout.tsx            # Shell layout (sidebar, topbar)
│   │   ├── dashboard/
│   │   ├── calendar/             # Phase 2
│   │   ├── mail/                 # Phase 2
│   │   ├── notes/                # Phase 3
│   │   ├── tracking/             # Phase 4
│   │   ├── workouts/             # Phase 5
│   │   └── investments/          # Phase 6
│   ├── api/                      # Route handlers (webhooks, OAuth callbacks)
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Tailwind directives + CSS vars
├── components/
│   ├── ui/                       # shadcn primitives (customized)
│   ├── layout/                   # Sidebar, topbar, page shells
│   ├── dashboard/                # Dashboard-specific widgets
│   └── shared/                   # Reusable across features
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client (uses cookies)
│   │   └── middleware.ts         # Session refresh
│   ├── utils.ts                  # cn(), formatters
│   └── constants.ts              # App-wide constants
├── hooks/                        # Custom React hooks
├── types/                        # Shared TypeScript types
├── public/                       # Static assets
├── supabase/
│   └── migrations/               # SQL migrations (versioned)
├── .env.example
├── .env.local                    # gitignored
├── CLAUDE.md                     # This file
├── CHANGELOG.md
├── README.md
└── package.json
```

---

## 5. DESIGN TOKENS

Define these in `app/globals.css` as CSS variables and reference them via Tailwind's `@theme`:

```css
@theme {
  /* Base */
  --color-background: #000000;
  --color-surface: #0A0A0A;
  --color-surface-elevated: rgba(255, 255, 255, 0.04);
  --color-surface-glass: rgba(255, 255, 255, 0.06);

  /* Borders */
  --color-border-subtle: rgba(255, 255, 255, 0.08);
  --color-border-default: rgba(255, 255, 255, 0.12);
  --color-border-gold: rgba(212, 175, 55, 0.3);

  /* Text */
  --color-foreground: #FAFAFA;
  --color-muted: rgba(255, 255, 255, 0.6);
  --color-subtle: rgba(255, 255, 255, 0.4);

  /* Gold (the accent) */
  --color-gold: #D4AF37;
  --color-gold-bright: #F4D77E;
  --color-gold-glow: rgba(212, 175, 55, 0.4);

  /* Semantic */
  --color-success: #4ADE80;
  --color-warning: #FBBF24;
  --color-danger: #F87171;
  --color-info: #60A5FA;

  /* Blur */
  --blur-sm: 8px;
  --blur-md: 16px;
  --blur-lg: 24px;
  --blur-xl: 40px;
}
```

**Reusable patterns** (codify as Tailwind utilities or component variants):

- `.glass-card` → `bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl`
- `.glass-card-gold` → adds `border-[var(--color-gold)]/30` and a subtle gold shadow
- `.gold-glow` → `shadow-[0_0_30px_-5px_rgba(212,175,55,0.4)]`
- Page background: layered radial gradients in deep black with a faint gold accent in one corner

---

## 6. PHASE 1 — DASHBOARD + AUTH (Current)

The goal of Phase 1 is to nail the **foundation, the shell, and the visual identity**. When Phase 1 is done, the owner should log in and feel: *"This is going to be incredible."* The dashboard itself can be mostly placeholder widgets — what matters is the auth flow works, the shell layout is polished, and the design language is locked in.

### 1.1 Setup

1. Initialize Next.js 15 project with TypeScript, Tailwind v4, App Router.
2. Initialize Git, create private GitHub repo `nexus`, set up `main` branch.
3. Set up Vercel deployment connected to the repo (owner will authorize).
4. Set up Supabase project (owner will create and share keys).
5. Install dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `@tanstack/react-query`, `framer-motion`, `lucide-react`, `zod`, `react-hook-form`, `@hookform/resolvers`, `date-fns`, `next-themes` (for completeness, though we're dark-only).
6. Configure shadcn/ui with the custom theme tokens above.
7. Create `.env.example` and `.env.local` with required keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`

### 1.2 Auth

- **Provider:** Supabase Auth with **Google OAuth** (since Phase 2 needs Gmail/Calendar scopes anyway — set the Google Cloud project up correctly from the start).
- **Scopes for Google OAuth:**
  - Phase 1: `openid email profile`
  - Phase 2 will add: `https://www.googleapis.com/auth/gmail.readonly`, `https://www.googleapis.com/auth/calendar`
- **Flow:**
  1. `/login` page — minimalist, centered card with a single "Continue with Google" button (gold accent on hover).
  2. OAuth callback at `/auth/callback` handles the code exchange.
  3. Middleware (`middleware.ts`) protects all `(app)` routes — redirects to `/login` if no session.
  4. Sign out via a button in the user menu (top-right of shell).
- **Single-user lockdown:** Add a hardcoded check (or env var like `ALLOWED_EMAIL`) in middleware that only allows the owner's email through. Anyone else gets signed out immediately. *(Owner will provide their email when ready.)*

### 1.3 Shell layout (the part that matters most visually)

The shell is what the owner sees every single day. Get it right.

- **Persistent sidebar** (left, collapsible):
  - Logo/wordmark "NEXUS" at top in light gold or white with subtle letter-spacing.
  - Nav items with icons (Lucide): Dashboard, Calendar, Mail, Notes, Tracking, Workouts, Investments. Inactive features show as disabled with a subtle "Soon" tag — keeps the vision visible.
  - Active route: gold left-edge indicator + subtle gold-tinted background.
  - User avatar + name at bottom, click for menu (settings, sign out).
- **Topbar** (thin, optional for v1):
  - Page title + breadcrumb on left.
  - Global search shortcut hint (⌘K) on right — even if search isn't wired yet, show the affordance.
  - Notification bell (placeholder).
- **Main content area:**
  - Generous padding.
  - Deep black background with the layered radial gradients.
- **Page transitions:** Framer Motion. When navigating between sections, content area does a smooth fade + slight Y-shift. Sidebar stays put.

### 1.4 Dashboard page (placeholder widgets — refined, not finished)

The dashboard is the landing page after login. Phase 1 version has placeholder cards that hint at the future:

- **Greeting card:** "Good morning, [Name]" with current date/time. Subtle live clock. Weather widget (use a free API like Open-Meteo) — optional but nice.
- **Today card:** Placeholder "0 events" until calendar is wired.
- **Inbox card:** Placeholder "0 unread" until Gmail is wired.
- **Quick notes card:** Placeholder.
- **Portfolio card:** Placeholder.
- **Habit/streak card:** Placeholder.

Each card uses the `.glass-card` pattern. Hover lifts subtly. Layout is a responsive grid (CSS grid, not flexbox-juggling).

### 1.5 Acceptance criteria for Phase 1

- [ ] Repo is live on GitHub (private), every commit pushed.
- [ ] App deploys cleanly to Vercel on `main` push.
- [ ] Owner can log in with Google and only the owner's email is allowed through.
- [ ] After login, owner lands on `/dashboard`.
- [ ] Shell layout (sidebar + main area) is polished and on-brand.
- [ ] All 7 nav items are visible (5 disabled with "Soon" tag).
- [ ] Page transitions feel cinematic.
- [ ] Reduced-motion is respected.
- [ ] `CHANGELOG.md` reflects all changes.
- [ ] `.env.example` is up to date.
- [ ] `README.md` has minimum setup instructions for future-self.

---

## 7. FUTURE PHASES (Roadmap — architecture should accommodate these)

### Phase 2 — Calendar + Gmail
- Google Calendar API: read events, create/edit/delete events, multiple calendars.
- Gmail API: **read-only to start** (view inbox, mark read, get notifications on new mail). Compose/send is a later sub-phase.
- Dashboard widgets become live: today's events, unread count, next meeting.
- "Meeting prep" — when a meeting is within 15 minutes, surface related notes and recent emails from attendees.

### Phase 3 — Notes
- **Notion-style block editor.** Recommend `BlockNote` or `Tiptap` with block extensions.
- Blocks: text, headings, lists, todo, code, quote, divider, image, embed.
- Slash commands (`/`) for inserting blocks.
- Tags + folders + full-text search.
- Daily journal feature (auto-created note per day, optional).
- Data lives in Supabase, syncs in real-time.

### Phase 4 — General tracking
- **Habits:** daily checkmarks, streaks, weekly view, optional reminders.
- **Subscriptions:** name, amount, billing cycle, next bill date, total monthly burn.
- **Goals:** long-term with milestones, progress %, target dates.
- **Reading list:** books + articles, status (to-read / reading / done), ratings, notes.
- **Health metrics:** sleep hours, water intake, mood (1–5), weight — daily entries with charts.
- **Important dates:** birthdays, anniversaries, deadlines — surface on dashboard as they approach.

### Phase 5 — Workouts
- Pre-built exercise library (sourced from a free dataset or custom-seeded).
- Log sets/reps/weight per exercise per session.
- Workout templates (e.g., "Push Day A," "Pull Day B").
- Progression charts per exercise (1RM estimates, volume trends).
- Body metrics: weight log, optional measurements, optional progress photos (Supabase Storage).
- Eventually: Apple Health sync for the Swift port.

### Phase 6 — Investments
- **Markets:** US stocks + crypto.
- **Data source:** Real-time prices via Finnhub or Polygon (free tier first; upgrade if needed). Crypto via CoinGecko.
- **Holdings:** manual entry first (ticker, quantity, cost basis), Plaid integration later for real brokerage sync.
- **Per-holding view:** current value, P/L, % change, mini chart.
- **Portfolio view:** total value, allocation pie, total P/L, performance over time.
- **Alerts:** earnings dates, dividend payments, price targets the owner sets.
- **News feed:** tied to holdings.

### Phase 7 — AI layer (Claude API)
- Owner has Claude API key — owner will provide when this phase begins.
- Use cases:
  - Summarize long emails or threads.
  - "Prep me for this meeting" — synthesize related notes, emails, calendar context.
  - Note assistance: "expand this," "summarize this," "rewrite this."
  - Smart suggestions: "you haven't worked legs in 10 days," "your portfolio is 80% in tech — diversification reminder."
  - Daily briefing: AI-generated morning summary across all data.

### Notifications (woven across phases)
- **Web push** via service workers — start with Phase 2 (new email arrivals, upcoming events).
- **Email digests** later — daily morning summary.

---

## 8. SWIFT PORT — KEEP IN MIND

The web app eventually becomes a native Swift iOS app. To make that port easier:

- **API-first.** All data operations go through Server Actions or Route Handlers. Don't bury business logic inside React components.
- **Supabase works natively in Swift** — `supabase-swift` SDK exists. So auth, DB, storage all transfer cleanly.
- **Design tokens are portable.** Colors, spacing, type — defined in CSS vars now, can be re-expressed as Swift constants later.
- **Avoid web-only dependencies for core logic.** A util function for formatting a portfolio P/L should be pure TS, not bound to React.

---

## 9. HOW CLAUDE SHOULD WORK ON THIS PROJECT

### At the start of every session

1. Read `CLAUDE.md` (this file) in full.
2. Check `CHANGELOG.md` to see where we left off.
3. Check `git status` and `git log -5` to confirm state.
4. Ask the owner what we're working on today.

### When given a task

1. **Propose a plan** in plain English. Cover:
   - What files will be created/modified.
   - What the user-visible result will be.
   - What dependencies (if any) need installing.
   - Estimated commits.
2. **Wait for explicit approval.** A response like "yes," "go," "looks good," or "approved" is approval. If the owner adds modifications, integrate them and confirm before executing.
3. **Execute in small, committed chunks.** Don't write 500 lines and commit once. Write a logical unit, commit, move on.
4. **After each commit, briefly report:** what changed, what's next.
5. **At the end of the session,** update `CHANGELOG.md` with a summary entry and confirm everything is pushed.

### When stuck or uncertain

- **Ask.** Don't guess on architecture decisions. The owner is the director.
- **Show options.** When there's a real tradeoff (e.g., "library X is faster but library Y has better TypeScript support"), present both and let the owner choose.

### What NOT to do

- ❌ Don't refactor unrelated code "while you're in there."
- ❌ Don't add dependencies without proposing them first.
- ❌ Don't commit large work without intermediate commits.
- ❌ Don't write code before the plan is approved.
- ❌ Don't suggest making the repo public.
- ❌ Don't claim something "should work" — test it, or say it's untested.
- ❌ Don't break the design language for convenience. If it doesn't feel premium, it's wrong.

---

## 10. CHANGELOG FORMAT

`CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/) loosely:

```markdown
# Changelog

## [Unreleased]

### Added
- feat(auth): Google OAuth flow with Supabase
- feat(layout): collapsible sidebar with gold active-state indicator

### Changed
- style(dashboard): refined glass blur intensity on greeting card

### Fixed
- fix(middleware): session refresh on protected route navigation

---

## [0.1.0] — Phase 1 shipped
*(when we cut the version, move Unreleased entries here)*
```

---

## 11. README.md (minimum contents)

```markdown
# Nexus

Personal command center. Single-user. Private.

## Stack
Next.js 15 · TypeScript · Tailwind v4 · shadcn/ui · Supabase · Vercel

## Setup
1. `pnpm install` (or `npm install`)
2. Copy `.env.example` → `.env.local`, fill in values
3. `pnpm dev`

## Deploy
Auto-deploys to Vercel on push to `main`.
```

---

## 12. FINAL NOTE TO CLAUDE

This is the owner's most personal project. Every commit, every pixel, every animation choice contributes to something they're going to use every single day for years. Build accordingly.

When in doubt: **propose, don't presume. Commit small. Make it beautiful.**

Let's build Nexus. 🥂
