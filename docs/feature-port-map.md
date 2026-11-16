# First-party capability map: Coursewell + Obavenus → Nexus

Nexus is the product surface. Coursewell and Obavenus remain separate source repositories; Nexus must own its routes, data model, permissions, and workflows. Do not embed their web apps, deep-link to them, or transfer user data between running apps.

## Coursewell capabilities

| Capability | Nexus destination | Port boundary |
| --- | --- | --- |
| Course list, manual courses, terms | Study → Courses | Store per signed-in Nexus user |
| Canvas connection and course sync | Study → Connections | Read-only Canvas access; encrypted credential storage required before persistence |
| Assignment list, due dates, completion | Study → Planner | First-party records and calendar view |
| Assignment breakdown and weekly plans | Study → Planner / Claudia | Use Nexus's configured model path; user reviews generated steps |
| Uploaded material, extraction, source-grounded search | Study → Library | Private per-user files, bounded extraction, citations to source/page |
| Notes, flashcards, quizzes, spaced review | Study → Review | First-party study artifacts and progress |
| Reminders, backups, MCP connections | Study → Settings | Reuse Nexus scheduling/security patterns; no copied secrets |

## Obavenus capabilities

| Capability | Nexus destination | Port boundary |
| --- | --- | --- |
| Multi-model assistant and provider selection | Claudia / Assistant | Reuse Nexus provider adapters and OAuth; never ask for provider secrets in the browser |
| Team agents, custom agent profiles, reusable workflows | Assistant → Agents / Workflows | First-party definitions, explicit tools and approvals per run |
| Scheduled tasks and recurring workflows | Assistant → Schedule | Persist per user; disclose side effects and allow cancellation |
| Project workspaces, instructions, file context, undo | Projects | Per-user project/file access with bounded reads and explicit write approvals |
| Research browser and connected MCP tools | Assistant → Tools | Allowlisted origins, read/write scopes, per-action review |
| Gmail, resume/profile, federal jobs, study digest | Existing Nexus Mail / Profile / Study | Consolidate duplicate views into Nexus-owned pages |

## Delivery order

1. Ship Nexus-owned Study foundations: courses, assignments, planner, and user-scoped persistence.
2. Add Canvas sync with encrypted token storage and read-only permissions.
3. Add private material library, extraction, source-grounded Ask, and study review artifacts.
4. Bring Obavenus agent profiles, workflows, and scheduled tasks into Nexus's Assistant with explicit tool scopes and approvals.
5. Add project-local context, browser/MCP tools, and deeper automation after isolation, logging, and approval boundaries are established.

Each stage must run within Nexus's authentication and data boundary. Feature parity is not claimed until each capability is implemented and tested in Nexus itself.
