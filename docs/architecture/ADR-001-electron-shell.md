# ADR-001: Electron desktop shell for Nexus

**Status:** Accepted for the first desktop release slice  
**Date:** 2026-11-15

## Context

Nexus is a Next.js App Router application deployed on Vercel and backed by Supabase. Its server actions, OAuth callbacks, and application data access currently run on that hosted service. Coursewell is a separate Vite study application, while Obavenus is already an Electron application with local-first data and credentials. A desktop client must not bundle server secrets or merge the products' user stores merely to present them together.

## Decision

Ship Nexus initially as a hardened Electron client for the existing HTTPS Nexus deployment. Keep the Next.js server and Supabase data plane hosted. Start Supabase PKCE in the Electron renderer, open the returned Google authorization URL in the operating system's browser, and return the one-time auth code to the renderer through the registered `com.obwoj1.nexus` app protocol. This keeps the verifier in the originating app session and avoids presenting Google OAuth inside an embedded user-agent. Send unrelated web links to the system browser.

Register Coursewell and Obavenus as separate app destinations in the Nexus shell. Coursewell can explicitly share a minimal upcoming-assignment summary with Nexus through a sender-origin-checked Electron IPC bridge. The data stays in Nexus process memory for the current desktop session; it is not uploaded or persisted. Do not scrape product UIs, share service keys, or merge their databases. Obavenus remains an independently installed Electron app.

## Consequences

- Existing Next.js server actions and Supabase RLS remain the backend; Electron contains no Supabase service-role or provider secrets.
- The desktop app requires network access to the Nexus deployment and its identity/data providers.
- Google consent warnings are controlled by Google Cloud OAuth consent configuration and scope verification. Electron and Supabase cannot suppress Google's warning.
- Cross-product context is opt-in and limited to the current local desktop session; durable multi-device sharing would need an explicit account/linking and data-retention design.
- A future fully offline Nexus would require a separate migration of server actions and auth, and is not part of this first shell.

## Follow-up

1. Package Nexus for macOS and validate its OAuth session inside Electron.
2. Add explicit Coursewell and Obavenus launch/integration surfaces. (Complete for launching; Coursewell summary handoff is implemented.)
3. Consider further narrowly scoped Obavenus context handoff without merging account stores.
4. Add signing/notarization and store-specific packaging when release credentials and target stores are chosen.
