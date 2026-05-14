# Changelog

## [Unreleased]

### Added
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
