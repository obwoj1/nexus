# Nexus

Personal command center. Single-user. Private.

## Stack

Next.js 15 · TypeScript · Tailwind v4 · shadcn/ui · Supabase · Vercel · Anthropic (Claude)

## Live Features

| Phase | Feature | Status |
|---|---|---|
| 1 | Auth (Google OAuth, single-user lockdown) | ✅ Live |
| 1 | Dashboard shell (sidebar, topbar, page transitions) | ✅ Live |
| 2 | Google Calendar — today's events + 7-day view | ✅ Live |
| 2 | Gmail — inbox, unread, Quick Read panel | ✅ Live |
| 2 | AI email analyzer (Claude, prompt caching) | ✅ Live |
| 3 | Notes — BlockNote block editor, auto-save, search | ✅ Live |
| 3 | Daily journal — auto-create per timezone, lazy loading | ✅ Live |
| 4 | Tracking — Habits, Subscriptions, Goals, Reading, Health, Dates | ✅ Live |
| 4 | Tracking charts — recharts per section | ✅ Live |
| 4 | Claudia AI — live data access, interactive chat, sessionStorage | ✅ Live |
| 5 | Workouts — Log, History, Templates, Progress charts | ✅ Live |
| 6 | Investments | 📋 Planned |

## Setup

1. `npm install`
2. Copy `.env.example` → `.env.local`, fill in values
3. Run all Supabase migrations in `supabase/migrations/` (in order) via SQL Editor
4. `npm run dev`

## Required env vars

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
ANTHROPIC_API_KEY=
ALLOWED_EMAIL=
```

## Deploy

Auto-deploys to Vercel on push to `main`.
