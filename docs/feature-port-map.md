# First-party capability map: Coursewell + Obavenus → Nexus

Nexus is the product surface. Coursewell and Obavenus remain separate source repositories; Nexus must own its routes, data model, permissions, and workflows. Do not embed their web apps, deep-link to them, or transfer user data between running apps.

## Coursewell capabilities

| Capability | Nexus destination | Port boundary |
| --- | --- | --- |
| Course list, manual courses, terms | Study → Courses | Store per signed-in Nexus user |
| Canvas connection and course sync | Study → Connections | Read-only requests; token is entered per sync and is never persisted |
| Assignment list, due dates, completion | Study → Planner | First-party records and calendar view |
| Assignment breakdown and weekly plans | Study → Planner / Claudia | Use Nexus's configured model path; user reviews generated steps |
| Pasted material and source-grounded search | Study → Library | Private per-user text, deterministic ranking, bounded excerpts, source markers (implemented) |
| File uploads and PDF/Office extraction | Study → Library | Private per-user files, bounded extraction, citations to source/page (planned) |
| Flashcards and spaced review | Study → Review | First-party cards and review intervals (implemented); generated quizzes planned |
| Reminders, backups, MCP connections | Study → Settings | Reuse Nexus scheduling/security patterns; no copied secrets |

## Obavenus capabilities

| Capability | Nexus destination | Port boundary |
| --- | --- | --- |
| Multi-model assistant and provider selection | Claudia / Assistant | Agent teams can select deployment-configured Claude or Gemini; provider secrets remain server-side. Per-user BYOK/OAuth and OpenAI/Grok adapters are planned |
| Team agents, custom agent profiles, reusable workflows | Assistant → Agents / Workflows | First-party profiles, three bounded Claude reasoning passes, user-triggered runs (implemented); other providers planned |
| Scheduled tasks and recurring workflows | Assistant → Schedule | Persist per user; daily Vercel Hobby schedule checks only; text-only, tool-free runs |
| Project workspaces, instructions, file context, undo | Projects | Per-user project/file access with bounded reads and explicit write approvals |
| Research browser and connected MCP tools | Assistant → Tools | Allowlisted origins, read/write scopes, per-action review |
| Gmail, resume/profile, federal jobs, study digest | Existing Nexus Mail / Profile / Study | Consolidate duplicate views into Nexus-owned pages |

## Delivery order

1. Ship Nexus-owned Study foundations: courses, assignments, planner, Canvas sync, and user-scoped persistence (implemented; Canvas credentials are session-only).
2. Add uploaded file extraction, generated quizzes, richer assignment plans, and reminders.
3. Bring Obavenus agent profiles and workflows into Nexus's Assistant (implemented on server-configured Claude/Gemini); add per-user provider auth and more adapters after provider-account isolation is designed.
4. Add project-local context, browser/MCP tools, and deeper automation after isolation, logging, and approval boundaries are established.
5. Expand schedule precision and throughput when the deployment plan supports it; Hobby cron checks are daily, not exact-time alarms.

Each stage must run within Nexus's authentication and data boundary. Feature parity is not claimed until each capability is implemented and tested in Nexus itself.
