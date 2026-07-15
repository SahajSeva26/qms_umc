# CLAUDE.md — QMS Healthcare Operations Platform
# Read this file at the start of every session before writing any code.
# Update this file at the end of every session.

---

## 0. SESSION RULES (ACTIVE FOR EVERY SESSION)

These rules apply for the entire session. No exceptions.

1. **One thing at a time.** Build only what is asked. Nothing more.
2. **List every file changed** at the end of every response.
3. **Do not touch shared files** (authStore, router, axiosClient, queryClient, env, ui components)
   unless explicitly asked. If you must touch one, say so before doing it.
4. **Do not refactor, clean up, or improve** anything unrequested. If you notice
   something — mention it, do not touch it.
5. **Do not invent API shapes.** If an endpoint doesn't exist, use mock data with:
   `// TODO: wire to POST /v1/x`
6. **Do not store API data in Zustand.** API data → TanStack Query. Zustand is only
   for: auth session, user role, UI state, offline queue.
7. **Flag shared file changes explicitly** so regression testing can happen.
8. **Never silently swallow errors.** Every API call must handle loading + error state.
9. **Do not proceed to the next task** until Rishi confirms the current one works.
10. **If unsure about anything** — ask before building, not after.
11. **Keep everything modular.** Every feature is self-contained. No feature reaches
    into another feature's internals. Features may change, be added, or be removed —
    the structure must support this without cascading breakage.

### Modularity Rules (non-negotiable):
- Each feature owns its own: `components/`, `hooks/`, `pages/`, `schemas/`, `service.ts`, `routes.tsx`
- Features communicate only through shared `types/`, `hooks/`, or `lib/` — never direct cross-feature imports
- Adding a feature = new folder + one line in router. Nothing else changes.
- Deleting a feature = delete folder + one line from router. Nothing else breaks.
- No business logic in pages — pages call hooks only
- No direct axios calls in components — all API calls go through feature service → hook

### Red Flags — Stop and question if you see these in a response:
- "While I'm here, I also..." → Ask what changed. Revert if not requested.
- "I refactored X to make it cleaner..." → Revert. Not requested.
- "I updated the shared component..." → Regression risk. Test everything using it.
- "I simplified the store..." → Major risk. Revert unless explicitly asked.
- "I restructured the folder..." → Never mid-build. Revert.
- "I also fixed a bug I noticed..." → One thing at a time. Revert.

### Session Starter Template (use this at the start of every new conversation):
```
Read CLAUDE.md first.

Session goal: [one sentence]
Module: [which module]
Screen/component: [specific file]
API endpoint: [confirm it exists in Node/Express backend]
Roles that use this: [which of the 18 roles]

Only touch files needed for this task.
Do not refactor anything unrequested.
List every file changed at the end of your response.

What done looks like: [describe it clearly]
```

### Before Moving On — Run This Checklist:
- [ ] Did Claude only touch what was asked?
- [ ] Did Claude touch any shared files? (If yes — regression test now)
- [ ] Does it work when the app is opened?
- [ ] Does it work for the correct roles?
- [ ] Does anything previously working still work?
- [ ] Is CLAUDE.md updated?

### Conversation Rules:
- One conversation per module — start fresh for each new module
- Debug in a separate conversation — never mid-build
- Never carry broken code into a new conversation — fix first
- 50+ messages in a conversation = start fresh, output degrades

---

## 1. PROJECT OVERVIEW

QMS is a healthcare operations company that runs medical screening camps and diet
camps across India on behalf of pharmaceutical clients. Pharma companies hire QMS
to deploy Field Officers, screening devices, and dietitians to conduct camps at
doctor clinics and hospitals.

This app is the internal + external operations platform managing the full lifecycle:
**Lead → Project → Camp Booking → FO Assignment → Camp Execution → Invoice → Collection**

The existing vanilla JS prototype at `s:\QMS-Camp-Portal-feature-qms-sales-ops-suite`
is the **design reference and business logic spec**. Do not copy its code — use it
to understand what to build and how it should look.

### Build Order
1. **Web frontend first** (`qms_umc/frontend/`) — React + Vite + Tailwind
2. **Mobile app second** (`qms_umc/mobile/`) — React Native + Expo + NativeWind
3. Both share the same backend (`qms_umc/backend/`)

---

## 2. TECH STACK (LOCKED — DO NOT DEVIATE)

### Web Frontend (`frontend/`)
| Layer | Technology | Notes |
|---|---|---|
| Framework | React + Vite | TypeScript, `@/` path alias configured |
| Styling | Tailwind CSS v4 | Via `@tailwindcss/vite` plugin |
| Routing | React Router DOM v7 | Feature-based routes, wired in `app/router.tsx` |
| Server State | TanStack Query | All API calls, caching, loading/error states |
| Client State | Zustand | Auth session, user role, UI state only |
| Forms/Validation | Zod | Schema-first validation in `features/*/schemas/` |
| HTTP Client | Axios | Central instance in `lib/api/api.ts` — `withCredentials: true`, no manual token handling |
| UI Components | shadcn (base-nova style) | Uses `@base-ui/react` primitives, `cn()` from `lib/utils.ts` |
| Auth tokens | httpOnly cookies only | Backend sets cookies — frontend never reads/stores tokens manually |

### Mobile App (`mobile/`)
| Layer | Technology | Notes |
|---|---|---|
| Framework | React Native + Expo | iOS + Android, one codebase |
| Styling | NativeWind | Tailwind-like syntax for React Native |
| Routing | Expo Router | File-based routing |
| Server State | TanStack Query | Same pattern as web |
| Client State | Zustand | Same pattern as web |
| Offline Sync | WatermelonDB | Field Officer offline-first sync |
| Push Notifications | Expo Push | Camp reminders, approval alerts |

### Backend (`backend/`)
| Layer | Technology | Notes |
|---|---|---|
| Runtime | Node.js | TypeScript via tsx |
| Framework | Express v5 | Lightweight REST API |
| Database | MongoDB | Via Mongoose |
| Cache | Redis | Optional — add when needed |
| Auth | JWT + httpOnly refresh cookie | Stateless, secure |
| Validation | Zod | Schema-first, shared validators |
| Docs | Swagger / OpenAPI | Via `@asteasolutions/zod-to-openapi` |

### Deployment
| Layer | Technology | Notes |
|---|---|---|
| Hosting | AWS (ap-south-1) | India region, DPDP compliant |
| File Storage | AWS S3 | Documents, photos — presigned URLs |
| Email | AWS SES | Dunning, renewal alerts, reminders |

**Do not suggest alternative libraries or stack changes mid-build.**
**If a library is not listed here, ask before using it.**

---

## 3. REPOSITORY STRUCTURE

```
qms_umc/
├── frontend/                        # React + Vite web app
│   └── src/
│       ├── app/
│       │   ├── App.tsx
│       │   ├── AppProvider.tsx      # All global providers (QueryClient, Router)
│       │   └── router.tsx           # All feature routes wired here
│       ├── config/
│       │   └── env.ts               # ENV object — import once, use everywhere
│       ├── lib/
│       │   ├── api/
│       │   │   ├── api.ts           # Axios instance: withCredentials, 401 redirect
│       │   │   └── queryClient.ts   # TanStack Query client
│       │   └── utils.ts             # shadcn cn() utility
│       ├── components/
│       │   ├── ui/                  # Base: Button, Card, Input, Modal, Badge
│       │   └── layouts/             # RootLayout, AppLayout, AuthLayout
│       ├── hooks/
│       │   └── useAuth.ts           # isAuthenticated, hasRole, isQmsInternal
│       ├── types/
│       │   ├── auth.types.ts        # UserRole, AuthUser
│       │   └── common.types.ts      # ApiResponse, PaginatedResponse, ApiError
│       ├── utils/
│       │   └── formatters.ts        # formatINR, formatDate, formatPercent
│       └── features/                # ONE FOLDER PER MODULE — fully self-contained
│           ├── auth/
│           │   ├── components/      # Auth-specific components (RolePicker, OtpInput)
│           │   ├── hooks/           # useLogin, useLogout
│           │   ├── pages/           # LoginPage, OtpPage
│           │   ├── schemas/         # Zod schemas (loginSchema)
│           │   ├── auth.service.ts  # Axios calls for auth endpoints
│           │   ├── auth.routes.tsx  # Route definitions + AUTH_ROUTES constants
│           │   └── store.ts         # Zustand auth store
│           ├── dashboard/
│           ├── crm/
│           ├── camps/
│           ├── diet/
│           ├── fo/
│           ├── pharma/
│           ├── projects/
│           ├── om/
│           ├── doctors/
│           ├── billing/
│           ├── analytics/
│           └── admin/
│
├── mobile/                          # React Native + Expo app
│   ├── app/                         # Expo Router screens
│   │   ├── (auth)/                  # Login, OTP
│   │   └── (app)/                   # Role-gated screens
│   └── src/                         # Same modular pattern as web
│
├── backend/                         # Node + Express API
│   └── src/
│       ├── bin/                     # server.ts, app.ts
│       ├── modules/                 # ONE FOLDER PER MODULE
│       │   ├── auth/                # controller, service, routes, validators, mapper
│       │   └── user/                # controller, service, routes, validators, model
│       └── shared/
│           ├── config/
│           │   └── app.config.ts    # ENV object — same pattern as frontend
│           ├── middlewares/
│           ├── helpers/
│           └── utils/
│
├── .vscode/
│   └── launch.json                  # Node debugger config
├── CLAUDE.md                        # This file
├── PROGRESS.md                      # Build progress tracker
├── TESTS.md                         # Dependency map for regression testing
└── .gitignore
```

### Why the structure is built this way

This app will grow to 13+ modules with 18 roles. Features will be added, changed, and
removed over time. The structure is designed so that **one feature changing never breaks
another**.

**Why one folder per feature?**
Each feature (auth, crm, camps...) owns everything it needs — its own components, hooks,
page, service, schema, and routes. If a feature is removed, delete its folder and one
line from router.tsx. Nothing else breaks.

**Why does the page only call hooks, never services directly?**
Pages are dumb — they render and handle user events. All data fetching logic lives in
hooks (TanStack Query). This means you can change how data is fetched without touching
the UI, and you can test the hook independently.

**Why does the hook call the service, not axios directly?**
The service is the only place that knows the API shape. If an endpoint changes, you fix
it in one file — not scattered across every hook that uses it.

**Why is Zustand only for auth/UI state, never API data?**
TanStack Query already caches, refetches, and manages loading/error for server data.
Duplicating it in Zustand creates two sources of truth that go out of sync.

**Why is the ENV object imported once and used everywhere?**
`import.meta.env.X` scattered across files makes it impossible to know what config the
app depends on. One ENV object = one place to look, one place to change.

**Why are shared files (axiosClient, queryClient, authStore) in src/lib and src/features/auth?**
They are used by every feature. Keeping them outside any feature folder makes clear
they are global — touching them affects the whole app and requires regression testing.

---

## 4. ALL 18 ROLES

### QMS Internal Roles (14)

| Role ID | Display Name | Primary Function |
|---|---|---|
| `super_admin` | Super Admin | Full org access, all modules, master data, RBAC |
| `admin` | Admin | Tenant admin, users, masters, workflows |
| `sales_lead` | Sales Head | Team pipeline, approvals, targets |
| `sales_rep` | Key Account Manager | Own/assigned pipeline, reports to Sales Head |
| `camp_coord` | Screening Camp Coordinator | Screening camps, FO assignments |
| `diet_camp_coord` | Diet Camp Coordinator | Diet camps, dietitian assignment approvals |
| `om_screening` | Ops Manager — Screening | FO enrollment, device/camp assignment, expense approval |
| `om_diet` | Ops Manager — Diet | Diet camp operations, FO enrollment |
| `fo` | Field Officer | My camps, check-in, patient data, expenses |
| `dedicated_fo` | Dedicated FO | Clinic-stationed, mobile-first, SOP-gated compliance |
| `logistics` | Logistics | Warehouse, device transfers, inventory |
| `accounts` | Accounts | AR, invoices, expenses, P&L, CFO dashboards |
| `dietitian` | Dietitian | My inventory, consumable requests, expiry reporting |
| `analytics_viewer` | Analytics Viewer | Read-only dashboards and exports |

### Pharma External Roles (4)

| Role ID | Display Name | Primary Function |
|---|---|---|
| `pharma_ho` | Pharma HO | Division-level view, RSM→ASM→MR hierarchy |
| `pharma_rsm` | Pharma RSM | Region-wide rollup, book on behalf |
| `pharma_asm` | Pharma ASM | Area-level view, manages MRs |
| `pharma_mr` | Pharma MR | Books camps, uploads Rx, sees own territory only |

### Role Hierarchy
**⚠️ PENDING CONFIRMATION FROM TEAM**

### Pharma Client Hierarchy
```
HO (Head Office)
  └── RSM (Regional Sales Manager)
        └── ASM (Area Sales Manager)
              └── MR (Medical Representative)
```
MRs only see projects mapped to their territory. Pharma clients isolated by tenantId.

---

## 5. MODULE STATUS

Update this table at the end of every session.

| Module | Prototype | Backend | Web Screen | Mobile Screen | Status |
|---|---|---|---|---|---|
| Auth / Login | ✅ | ✅ (partial) | 🔄 built, **has 3 confirmed unfixed bugs** | ⬜ | See PROGRESS.md Known Issues |
| Command Dashboard | ✅ | ⬜ | ✅ built (mock data) | ⬜ | Web done, no backend |
| CRM & Sales Leads | ✅ | ⬜ | ✅ built (Kanban, detail, wizard, Sales Dashboard + Today tab + executive KPI panel + filter bar) | ⬜ | Web done, no backend |
| Camp Management | ✅ | ⬜ | ✅ built (list/detail, close-out) | ⬜ | Web done, no backend |
| Diet Camp Management | ✅ | ⬜ | ⬜ | ⬜ | Not started |
| Pharma Client Portal / Client Mgmt | ✅ | ⬜ | ✅ built (list/detail, invoices) | ⬜ | Web done, no backend |
| Field Officer Ops | ✅ | ⬜ | ⬜ | ⬜ | Not started — deliberately deferred, see §5a |
| Doctor Management | ✅ | ⬜ | 🔄 covered only inside Analytics "Doctors" tab | ⬜ | No standalone module yet |
| Inventory & Devices | ✅ | ⬜ | ⬜ | ⬜ | Phase 2 |
| Project / Gantt | ✅ | ⬜ | ✅ built (list, 6-step wizard, Gantt timeline) | ⬜ | Web done, no backend |
| KPI & Order Engine | ✅ | ⬜ | ⬜ | ⬜ | Not started |
| Accounts & Billing | ✅ | ⬜ | 🔄 AR aging covered only inside Analytics "Financial" tab | ⬜ | No standalone module yet |
| Analytics & BI | ✅ | ⬜ | ✅ built — full 6-tab module | ⬜ | Web done, no backend |
| Admin / RBAC / Audit | ✅ | ⬜ | ⬜ | ⬜ | Not started |
| Notifications Engine | ✅ | ⬜ | ⬜ | ⬜ | Not started |

Legend: ✅ Done | 🔄 In Progress / Partial | ⬜ Not started

**Reminder: "Web Screen ✅" means UI + hooks + mock/localStorage service layer only.** No module
has a real backend endpoint behind it except Auth (partial) and User. Every built feature's
`*.service.ts` has a `// TODO: replace with real API calls once backend endpoints exist` comment.
Full detail (files, sub-components, known bugs) is in `PROGRESS.md` — this table is the summary.

### Build Priority (31 July 2026 target)
1. **P1 — Now**: Auth/Login (fix the 3 confirmed bugs — see §5a), role-based routing shell, FO Mapping, Super Admin
2. **P2**: MR Booking Portal, Operations (Coordinators), Sales/KAM, Notifications
3. **P3 — Phase 2**: Inventory/Device Mapping (~6 months out)

---

## 5a. CURRENT PRIORITIES / OPEN ITEMS (as of 2026-07-15)

Read this section first in a fresh session — it's the "what's actually going on" summary.

### Design-token / prototype-fidelity fixes (2026-07-15)
A user-reported "the wizard contrast looks wrong" turned into a multi-part fidelity audit. Fixed,
in order of what was found:
1. **`--qms-brand` was one shade off** — it held the prototype's `--brand-600` (`#2451f0`, darker)
   instead of `--brand-500` (`#3b6dff`), which is what the prototype actually uses for every active
   state/button/highlight. Fixed at the token level in `index.css` since it's referenced 97 times
   app-wide — full visual regression sweep run afterward, no other screen broke.
2. New wizard components (`PickCard`, `ChipToggle`, `SegButton`, `WzChip`, `ReviewCard`) used
   `--qms-surface-card` (flat opaque) instead of `--qms-surface` (translucent, matches the
   prototype's real `.pick-card`/`.chip-toggle` backgrounds) — fixed scoped to those components
   only, since `--qms-surface-card` is intentionally used elsewhere (pre-existing CRM/camps screens).
3. The shared `Dialog`'s backdrop (`components/ui/dialog.tsx`) was `bg-black/10` vs the prototype's
   `rgba(7,11,28,.5)` + blur — fixed globally (affects all 19 dialogs app-wide, same "fix the shared
   thing once" reasoning as #1).
4. `ProjectTable.tsx`'s wrapper had no background (page gradient showed through) vs the prototype's
   translucent `.card` wrapper — fixed. **`CampTable.tsx` has the identical bug, not yet fixed** —
   see PROGRESS.md Known Issues.

### The two wizards use genuinely different design systems — don't assume one, port the other
Confirmed via direct source research (not assumed): the New Project wizard (`projects-manager.js`)
uses colored icon-tile pick-cards (`.pick-card .ic`, a 28×28px solid-color square with a white
icon) and icon-badge section headers (`.section-h`/`.ic-tile`) throughout. The New Lead wizard
(`crm-sales-leads.js`) uses **neither** — just plain text segmented pills (`.ptype-row .seg`) and
toggle chips (`.wz-chip`), no icon tiles anywhere, and a narrower 720px modal (vs Projects' 900px).
Shared building blocks now live in `components/ui/`: `PickCard`/`PickGrid`, `SectionHeader`,
`ChipToggle`/`ChipRow` (Projects' always-visible toggle-chip pattern — tests, camp slots, states),
`SegButton`/`SegRow` and `WzChip`Toggle/Removable (CRM's pattern), `ReviewCard`/`ReviewGrid`/
`ReviewField` (shared final-review-step grid, used by both). When building a new wizard step or
fixing either wizard's styling, check which system it actually belongs to before copying the other.

### Dashboard's Camp Report segment (built 2026-07-15)
The prototype's `dashboard.js` mounts a separate module (`camp-report.js`) above the "Company-wise"
section — a role-scoped "Camp report — Diet & Screening" chart (5 KPI tiles, Diet/Screening/All
toggle, Month/Day toggle, stacked bar with 3-month run-rate projection). This was entirely missing
from our Dashboard; built as `dashboard.camp-report.ts` (scoping/aggregation logic, ported directly
from the prototype's `build()`/`avg3()` math) + `CampReportSection.tsx`, wired into `DashboardPage.tsx`.
Note: the confirmed 7 section titles in `dashboard.js` (Company-wise/Projects/Field Officers/Sales
team/Accounts/Doctors/Patients) already match our existing `*Section.tsx` components 1:1 — nothing
else is missing from the Dashboard despite how a screenshot comparison might first look; the
"REVENUE & PROFITABILITY" / "PIPELINE & FORECAST" / etc. section groupings a user pointed at
**do not exist** anywhere in the actual prototype source, so don't go looking for them again.
Role-scoping in the new component always resolves to "all accounts" (see next item — same root
gap as the auth `role` issue below) rather than faking a per-rep subset.

### Sales KPI panel — dual-mounted on BOTH the Dashboard AND the Sales Dashboard (built 2026-07-15, corrected same day)
A user screenshot of "REVENUE & PROFITABILITY" etc. was first (wrongly) traced to only `pages/
sales.html` = `SalesDashboardPage.tsx` (`/crm/sales`). **That was incomplete.** A third screenshot
(the actual Dashboard page, `super_admin` account) proved this content also renders directly on the
Dashboard. Re-tracing properly: `dashboard.html` itself loads `sales.js` as one of its own scripts
and contains `<div id="salesFilterBar">`/`<div id="salesKpis">` directly in its template, gated by
an inline bootstrap check — `const isSuper = sess.roleId === 'super_admin'; if (isSuper) initSales();
else hide sec-salescc/salesFilterBar/salesKpis`. So the real design is **dual-mount, both correct**:
(1) `pages/sales.html` → `sales_lead`/`sales_rep`'s own dedicated page (`SalesDashboardPage.tsx`,
gated by `isApprover`/`APPROVER_ROLES`, unchanged from the first build), and (2) `dashboard.html` →
the SAME `sales.js` content merged inline, **`super_admin` only**. Fixed by reusing the exact same
components (`sales.kpis.ts`'s `buildSalesHeadKpis()`, `SalesKpiGrid.tsx`, `SalesFilterBar.tsx` — no
duplication) and wiring them into `DashboardPage.tsx` too, gated `user?.role === 'super_admin'`,
positioned FilterBar → Sales filter bar → TopKpiStrip → Sales KPI grid → CampReportSection (kept our
existing single combined filter bar instead of the prototype's literal two-stacked-filter-bars,
per explicit user call — ours is better UX). **Still not done, deliberately scoped out:** the
prototype's `dashboard.html` also merges the ENTIRE tabbed Sales Command Center (Today/Team/Journey/
Targets/Performance/Approvals/Activity + its own AI banner) further down the same page for
`super_admin` (`#sec-salescc` block) — user explicitly chose "just the KPI strip + filter bar" over
"everything" for this round. The existing `SalesCommandCenter.tsx` already on our Dashboard (a
simplified "Today's task list") is unrelated to this and was left untouched. Two data-model gaps
handled honestly rather than faked: `ClientProjectType` has no `'Mixed'` value (enum is `Screening`/
`Diet`/`Lab` only) so that tile always reads 0; "Total Screenings" reuses the closed-camps count
since `ClientProject` has no patient-count field.

### `navConfig.ts`'s `'sales'` nav item — corrected TWICE in one session, now matches the prototype exactly
First wrongly flagged as "admin/super_admin have no sidebar link to Sales Dashboard, should add
one" → wrongly "fixed" by adding `'sales'` to `FULL_NAV_SECTIONS`. User caught it: "you seem to
have added a sales dashboard page, it is not in the prototype, delete it." Re-checked `roles.js`
properly: `super_admin` has `navExclude:['sales']` with the comment *"The Sales 'Dashboard' is
merged into the main Dashboard for Super Admin, so hide the duplicate sidebar entry."* — no sidebar
link for `super_admin` is the CORRECT, intentional prototype behavior, not a bug. Also found the
nav label itself was wrong: `app.js`'s real nav array (`id:'sales'`) uses label **"Dashboard"**,
not "Sales Dashboard" — that string was invented, never sourced from the prototype. Fixed both:
removed `'sales'` from `FULL_NAV_SECTIONS` (reverted the wrong fix), relabeled `ALL_NAV_ITEMS`'s
`'sales'` entry to `'Dashboard'`. Confirmed via a real Sales Head prototype screenshot: their
sidebar shows only "Dashboard" (→ `pages/sales.html`) with no separate main-Dashboard link at all
— `'dashboard'` and `'sales'` are two DIFFERENT nav ids that both happen to render the label
"Dashboard," never shown to the same role simultaneously. **Lesson for next time:** when a
prototype nav label/behavior looks surprising or asymmetric between roles, read `roles.js`'s
per-role `nav`/`navExclude` arrays directly — don't infer intended behavior from what "seems
missing" in one role's sidebar without checking what the SAME nav id's `navExclude`/comment says
for other roles.

### Color-coding logic (answering a direct user question, 2026-07-15, corrected twice same day)
Full writeup lives in `PROGRESS.md` under "How colors are applied across the app." Short version:
`--qms-brand`/`--qms-teal` are fixed structural tokens (same everywhere, never content-dependent).
Where the prototype *does* vary tile color by meaning, the tone is assigned per-metric-category
(emerald=achieved, rose=at-risk, amber=forecast, etc.), never randomly and never by which section a
tile sits in. The Dashboard's own `.mini-kpi` tiles (our `MiniKpiCard`) genuinely have **no**
per-tile tone coloring — that part was correct. But the broader claim needed a correction: the
`.kpi.tone` glow-blob mechanism (a blurred 18%-opacity colored circle per tile) **is real**, and (as
of the correction above) it now appears on **both** the Sales Dashboard's executive KPI panel AND
the main Dashboard itself (`super_admin` only) — not "a different screen from the Dashboard" as
first written. If you're asked about per-tile tone coloring again, point to `SalesKpiGrid.tsx`
(shared by both mount points), not `MiniKpiCard.tsx`.

### `.kpi`/`.kpi.tone` tile grid — now a shared component, and only used where the prototype actually uses it (fixed 2026-07-15)
User flagged that Sales/FO/Doctor/Financial Analytics (`AnalyticsKpiStrip.tsx`, shared by all 4
Analytics tabs) and Project Gantt (`GanttKpiStrip.tsx`) had tiles packed via `auto-fill`/`auto-fit`
at ~150-180px min-width with no tone coloring, when the prototype's `.kpi-grid` (styles.css line
444) is a FIXED `repeat(4,1fr)` grid (→3/2/1 cols at 1300/980/560px breakpoints) with full
`.kpi.{tone}` glow-blob tiles — same styling already ported once for the Sales KPI panel. Extracted
the tile itself into `components/ui/KpiTile.tsx` (tone-color map + glow-blob + icon badge) so
`AnalyticsKpiStrip`/`GanttKpiStrip`/`SalesKpiGrid` all share one implementation instead of drifting
copies. **Important nuance — not every auto-fill grid in this codebase is a bug**: `TopKpiStrip`'s
`MiniKpiCard` grid genuinely IS `auto-fill,minmax(180px,1fr)` in the prototype (`.mini-kpi-grid`),
and `SalesKpiGrid`'s category grid genuinely IS `auto-fill,minmax(168px,1fr)` too (`.kpi-cat-grid`,
injected by `sales.js` itself) — both were left untouched. Before "fixing" a grid layout anywhere in
this app, check the prototype's actual CSS class for that specific screen first; don't assume one
fix pattern applies everywhere just because the symptom looks similar.

### Viewport height bug — `h-screen` → `h-dvh` (fixed 2026-07-15)
User reported scrolling "ends abruptly" near the bottom of pages in normal windowed browser use, but
looked fine in F11 fullscreen — the textbook symptom of Tailwind's `h-screen` (`100vh`, calculated
against the layout viewport, which doesn't shrink for windowed browser chrome) instead of `h-dvh`
(dynamic viewport height, tracks the actual visible viewport). Fixed in all 4 places this pattern
appeared: `AppLayout.tsx`, `RootLayout.tsx`, `Sidebar.tsx`, and `LoginPage.tsx`. The `LoginPage.tsx`
change is a single-line CSS class swap on the outer wrapper div ONLY (`h-screen` → `h-dvh`) — user
explicitly approved touching this specific line despite the standing "don't touch login/auth code"
rule (see the rule's own memory note), since it's provably zero logic/auth-code change, confirmed
via `git diff` before and after. If `h-screen`/`min-h-screen` shows up in new code anywhere in this
app going forward, prefer `h-dvh`/`min-h-dvh` from the start to avoid reintroducing this.

### Project Management + Gantt module (built 2026-07-14)
Full Project Management list, 6-step New Project wizard, and Project Gantt timeline are built
against `projects-manager.js`/`gantt.js`, following the exact CRM wizard convention (`useState`,
not Zustand; Zod per-step validation). Two things worth knowing before touching this module:
1. **Separate localStorage key.** Projects persists to `qms.master.projects.full`, deliberately
   NOT the `qms.master.projects` key Client Management's `ClientProject`/PO feature already uses
   — the two entity shapes are incompatible (`Project` has ~50 fields incl. multi-PO/void-camps/
   status-history; `ClientProject` is a lighter ~10-field read-model). Both are seeded from the
   same `CLIENTS`/`DIVISIONS` master data so they read as one system, but are not literally the
   same array. If a future task wants them truly unified, that's a real migration, not a quick fix.
2. **`CLIENTS`/`DIVISIONS` now live in `types/client.types.ts`**, not `features/crm/clients/
   clients.mock.ts` (which now just re-exports them) — moved there after an audit caught 8 files
   in `features/projects/` reaching into CRM's internal mock file, a real §3 modularity violation.
   `ChipPicker` was similarly promoted to `components/ui/ChipPicker.tsx` (CRM's copy re-exports it).
   If you add a new feature that needs client/division data, import from `types/client.types.ts`.

### Confirmed, unfixed auth bugs (full detail in PROGRESS.md → Known Issues)
Traced end-to-end via live investigation, not guessed. Three compounding root causes make login
appear to fail right after succeeding:
1. `backend/src/bin/app.ts` hardcodes CORS to `http://localhost:5173` only — any other dev port breaks credentialed requests.
2. `backend/src/shared/utils/cookies.ts` sets `sameSite: 'strict'`, which compounds #1.
3. The global 401 interceptor in `frontend/src/lib/api/api.ts` does `window.location.href = AUTH_ROUTES.LOGIN` (hard reload) instead of `navigate()`, wiping the **non-persisted** Zustand `authStore` on the very next 401 (e.g. the first authenticated dashboard call after login).

Also confirmed: backend `AuthMapper.toResponse` (`backend/src/modules/auth/auth.mapper.ts`) returns
`{id, email, firstName, lastName, avatar}` — no `role`, `id` not `_id` — while frontend `AuthUser`
requires both. `useLogin.ts` papers over this with `role: data.data.data.role ?? 'super_admin'`.
None of this is fixed yet. Recommended fix directions are in PROGRESS.md.

### Field Officer Ops — researched, deliberately not started
User explicitly said "right now, nothing" gets built for FO. Confirmed via prototype research that
FO is actually **4 separate systems**, not one: FO Management (`fo.html`/`fo-manager.js`), My FO
Workspace (`fo-workspace.html`/`fo-portal.js`), FO Config Master (`fo-config-master.html`/
`fo-config-master.js`), Dedicated Ops (`dedicated-ops.html`/`dedicated-ops.js`). There's also a real
35km/50km Haversine-distance FO-to-camp serviceability radius engine in `hq-serviceability.js`/
`hq-mapping.js` with zero equivalent in our app — the "HQ Mapping & Serviceability" nav item is a
dangling link today. Needs a build-order decision before starting any of this.

### Analytics module architecture note
Unlike the prototype (which embeds `analytics.html` per-tab via `<iframe>`), our Analytics module
is one shared `AnalyticsPage` React component with 6 tabs as sub-components — a deliberate
improvement, not a port of the prototype's pattern. `AnalyticsPage.tsx` currently hardcodes 4
literal route strings instead of importing them from `analytics.routes.tsx`, to break a circular
ES-module import (the routes file imports `AnalyticsPage` to build its route table). This is a
known workaround, not the ideal fix — the proper fix is a third, dependency-free constants file.

### Known "fake feature" to fix eventually
`frontend/src/features/crm/crm.kpis.ts` has a literal `vel: 41` and a fully hardcoded `deltas`
object presented as computed trend percentages, regardless of actual lead data. Flagged during a
project evaluation, not yet fixed.

### §8 Design System Tokens — flagged for accuracy, not yet corrected
Verification this session/prior sessions found some documented values in §8 (particularly the
Camp Status Colors table) don't exactly match the real prototype source (`camps-data.js`
`CAMP_STATUSES`). Treat §8 as directionally right but re-verify against prototype source before
depending on exact hex values for a new build.

---

## 6. DATABASE SCHEMA (KEY COLLECTIONS)

MongoDB collections mirror the original PostgreSQL table design.

### Core Collections
```
tenants           — multi-tenant isolation
users             — all users (internal + pharma), see user.model.ts
roles             — role definitions + permissions
people            — QMS internal staff
clients           — pharma companies
divisions         — client divisions
brands            — pharma brands per division
mrs               — Medical Representatives
doctors           — doctor registry
dietitians        — dietitian registry
projects          — PO/Agreement/Mail based projects
camps             — screening/diet/lab camps
leads             — CRM pipeline
lead_stage_history — stage moves with reason (mandatory)
meetings          — sales calendar
invoices          — billing
expenses          — expense claims
payments          — dietitian/FO/vendor payments
fo_claims         — Field Officer expense claims
inventory_items   — devices and consumables (Phase 2)
documents         — S3 file metadata
app_config        — rules engine (ALL business rules here — never hardcode)
audit_log         — tamper-evident audit trail
```

### Key Schema Conventions
- Every document has: `_id`, `tenantId`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `version`
- `version` mismatch returns 409 — handle in every update call
- Nested objects for flexible structures (serviceability, stage history, docs)

---

## 7. API CONVENTIONS

### Base URL
```
Dev:  http://localhost:3000/api/v1
Prod: [TO BE CONFIRMED — AWS]
Swagger: http://localhost:3000/api-docs
Frontend dev server: http://localhost:5173
```

### Dev Commands
```bash
# Backend (run from backend/)
npm run dev     # tsx watch — hot reload
npm run build   # tsc compile
npm start       # run compiled dist

# Frontend (run from frontend/)
npm run dev     # Vite dev server → http://localhost:5173
npm run build   # tsc + vite build
```

### ENV Object Pattern
- **Backend**: `import ENV from '@/shared/config/app.config'` → use `ENV.JWT.AccessTokenSecret`
- **Frontend**: `import ENV from '@/config/env'` → use `ENV.Api.BaseUrl`
- Never use `process.env.X` or `import.meta.env.X` directly outside these config files

### Auth
- Login: `POST /v1/auth/login` → returns `accessToken` + sets httpOnly refresh cookie
- Token on every request: `Authorization: Bearer <accessToken>`
- 401 → redirect to login
- Refresh: `POST /v1/auth/refresh` (httpOnly cookie sent automatically)

### Key Endpoints
```
# Auth
POST   /v1/auth/login
POST   /v1/auth/refresh
POST   /v1/auth/logout
GET    /v1/auth/me

# Users
GET/POST/PUT/DELETE  /v1/users

# Masters
GET/POST/PUT/DELETE  /v1/clients
GET/POST/PUT/DELETE  /v1/people
GET/POST/PUT/DELETE  /v1/doctors
GET/POST/PUT/DELETE  /v1/mrs

# Projects & Camps
GET/POST/PUT/DELETE  /v1/projects
GET/POST/PUT/DELETE  /v1/camps
POST                 /v1/camps/:id/patient-count
POST                 /v1/camps/booking-eval

# CRM
GET/POST/PUT/DELETE  /v1/leads
POST                 /v1/leads/:id/stage    ← requires reason
GET                  /v1/leads/:id/history

# Finance
GET/POST/PUT         /v1/invoices
GET/POST/PUT         /v1/expenses
GET/POST             /v1/payments

# Config (rules engine)
GET/PUT              /v1/config/:key        ← admin only
```

### Error Handling
```typescript
// Every API call must handle:
// 200/201 — success
// 400     — validation error (show field errors)
// 401     — unauthorized (redirect to login)
// 403     — forbidden (show permission error)
// 404     — not found
// 409     — version conflict (prompt user to refresh)
// 500     — server error (generic error message)
```

### TanStack Query Pattern
```typescript
// Fetching
const { data, isLoading, error } = useQuery({
  queryKey: ['camps', filters],
  queryFn: () => campService.getAll(filters),
})

// Mutations
const mutation = useMutation({
  mutationFn: (data) => campService.create(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['camps'] }),
})
```

---

## 8. DESIGN SYSTEM TOKENS

Extracted from the prototype. Apply consistently everywhere.

### Colors
```typescript
navy:          '#17275C'
navyMid:       '#243580'
blue:          '#1557A0'
blueLight:     '#EDF2FB'
green:         '#0B8C5E'
greenBg:       '#EDFAF4'
amber:         '#C97D10'
amberBg:       '#FEF6E4'
red:           '#B91C1C'
redBg:         '#FEF2F2'
textPrimary:   '#111827'
textSecondary: '#4B5563'
textTertiary:  '#6B7280'
border:        '#D8E1F0'
pageBg:        '#F0F3FA'
surface:       '#FFFFFF'
tagBg:         '#EDF2FB'
```

### Camp Status Colors
```typescript
CONFIRMED:         green
LIVE:              blue
REQUESTED:         amber
CANCELLED:         red
CANCELLED_CHARGED: red
CLOSED:            textSecondary
COMPLETED:         green
```

### Typography
```typescript
headingLarge:  { fontSize: 26, fontFamily: 'Georgia' }
headingMedium: { fontSize: 18 }
headingSmall:  { fontSize: 15 }
bodyLarge:     { fontSize: 14 }
bodyMedium:    { fontSize: 13 }
bodySmall:     { fontSize: 12 }
caption:       { fontSize: 10, letterSpacing: 0.1, textTransform: 'uppercase' }
mono:          { fontFamily: 'monospace', fontSize: 11 }
```

---

## 9. NAVIGATION STRUCTURE

### Web (React Router)
- All routes defined per-feature in `features/*/[module].routes.tsx`
- All wired into `app/router.tsx` — one import per feature, nothing else
- Route constants defined in the routes file (e.g. `AUTH_ROUTES.LOGIN`)
- Protected routes wrap children with an auth check component

### Mobile (Expo Router — file-based)
- `app/(auth)/` — unauthenticated screens
- `app/(app)/` — authenticated, role-gated screens

### Role → Home Screen Mapping
```
super_admin       → /dashboard
admin             → /dashboard
sales_lead        → /crm
sales_rep         → /crm
camp_coord        → /camps
diet_camp_coord   → /diet
om_screening      → /om
om_diet           → /om
fo                → /fo
dedicated_fo      → /fo
logistics         → /admin (inventory — Phase 2)
accounts          → /billing
dietitian         → /diet
analytics_viewer  → /analytics
pharma_ho         → /pharma/ho
pharma_mr         → /pharma/mr
pharma_asm        → /pharma/asm
pharma_rsm        → /pharma/rsm
```

---

## 10. BUSINESS RULES (RULES ENGINE)

**ALL business rules live in the `app_config` collection — never hardcoded.**

Key rules:
```
booking.window.leadTimeHours       — advance booking requirement
booking.window.monthlyCutoffDay    — monthly booking cutoff
cancellation.freeWindowHours       — free cancellation window
cancellation.chargePercent         — cancellation charge %
project.renewalTriggerPercent      — auto-renewal at X% completion (default 80%)
reminder.precamp24h                — 24h pre-camp reminder
reminder.precamp48h                — 48h pre-camp reminder
approval.dealValueThreshold        — Sales Head approval threshold (₹50L)
```

Fetch from `GET /v1/config/:key` — never hardcode values.

---

## 11. KEY BUSINESS WORKFLOWS

### WF-1: Project Onboarding
Sales creates project → Configure PO/MSA/camps/slots → Set visibility →
Admin sets LIVE → MRs see project

### WF-2: MR Books a Camp
MR login (territory-filtered) → Select project → Pick slot/date/doctor →
Book → Confirmation ticket → 24h/48h reminders

### WF-3: Camp Execution
Coordinator assigns FO → Camp day → FO executes → Data upload →
Mark complete → At 80% trigger renewal email

### WF-4: Void Camp
Camp done without PO → Add void camp → Upline approval →
PO received → Admin maps PO → Reconciled

### WF-5: Project Renewal
System detects 80% camps done → Auto email →
New PO issued → Admin renews → Cloned project

### WF-6: Cancellation & Billing
MR/FO cancels → Check free window → If outside: apply charge % →
Auto deduct from PO value → Billing updated

---

## 12. SHARED FILES — HIGH RISK

Changing any of these affects the entire app. Flag before touching.

### Web Frontend
| File | What breaks |
|---|---|
| `frontend/src/features/auth/store.ts` | Login, logout, every auth-gated screen |
| `frontend/src/app/router.tsx` | Every route in the app |
| `frontend/src/lib/api/api.ts` | Every API call |
| `frontend/src/lib/api/queryClient.ts` | All TanStack Query caching |
| `frontend/src/config/env.ts` | Base URL for every API call |
| `frontend/src/hooks/useAuth.ts` | Every permission check |
| `frontend/src/components/ui/*` | Every screen using shared components |

### Mobile
| File | What breaks |
|---|---|
| `mobile/src/store/authStore.ts` | Login, logout, every auth-gated screen |
| `mobile/app/_layout.tsx` | Entire app shell |
| `mobile/src/navigation/roleNavConfig.ts` | All 18 role navigations |

### Backend
| File | What breaks |
|---|---|
| `backend/src/bin/app.ts` | All routes |
| `backend/src/shared/config/app.config.ts` | All ENV values |
| `backend/src/shared/middlewares/authmiddleware.ts` | All protected routes |

---

## 13. OFFLINE REQUIREMENTS (FIELD OFFICER — MOBILE ONLY)

- Camp check-in, patient data capture, consumable deductions must work offline
- Data syncs when connectivity returns
- Conflict resolution: server-wins for most fields, field-level merge for patient data
- Technology: WatermelonDB
- Reference: `s:\QMS-Camp-Portal-feature-qms-sales-ops-suite\assets\js\offline-sync.js`

---

## 14. PROTOTYPE REFERENCE FILES

| Module | Reference JS | Reference Page |
|---|---|---|
| Auth | `app.js`, `roles.js` | `index.html` |
| Dashboard | `dashboard.js`, `dashboard-data.js` | `dashboard.html` |
| CRM | `crm.js`, `crm-data.js` | `pages/crm.html` |
| Camps | `camps.js`, `camps-manager.js` | `pages/camps.html` |
| Diet | `diet-camps.js`, `diet-approvals.js` | `pages/diet-camps.html` |
| FO | `fo-portal.js`, `fo-camp-run.js` | `pages/fo-workspace.html` |
| Sales | `sales.js`, `sales-calendar.js` | `pages/sales.html` |
| Billing | `billing-engine.js`, `accounting.js` | `pages/cfo-accounting.html` |
| Admin | `admin.js`, `admin-master.js` | `pages/admin.html` |
| Analytics | `analytics.js`, `kpi-engine.js` | `pages/analytics.html` |
| MR Portal | `mr-portal.js`, `mr-data.js` | `pages/mr-portal.html` |
| OM Portal | `om-portal.js`, `om-data.js` | `pages/om-portal.html` |

All files are at: `s:\QMS-Camp-Portal-feature-qms-sales-ops-suite\assets\js\`

---

## 15. DECISIONS LOG

| Decision | Choice | Why |
|---|---|---|
| Build order | Web first, mobile second | Faster to build + test on web; mobile follows same patterns |
| Web framework | React + Vite | Already scaffolded, TypeScript, fast dev server |
| Mobile framework | React Native + Expo | iOS + Android, one codebase |
| Web styling | Tailwind CSS v4 | Via @tailwindcss/vite, already configured |
| Mobile styling | NativeWind | Tailwind-like DX on React Native |
| Routing (web) | React Router DOM v7 | Feature-based route files, wired in router.tsx |
| Routing (mobile) | Expo Router | File-based, native navigation |
| Server state | TanStack Query | API caching, loading/error, background refetch |
| Client state | Zustand | Lightweight, auth session + UI state only |
| HTTP client | Axios | Central instance, interceptors for token + error handling |
| Validation | Zod | Schema-first, shared between frontend forms and backend |
| Backend | Node.js + Express v5 | Dev team choice |
| Database | MongoDB + Mongoose | Dev team choice |
| Cache | Redis | Optional — add when needed |
| Auth | JWT + httpOnly refresh | Stateless, secure token storage |
| File uploads | S3 + presigned URLs | No base64 in localStorage |
| Offline storage | WatermelonDB | FO offline-first (mobile only) |
| ENV config | Single ENV object per layer | Import once, use everywhere — no scattered process.env |
| Modularity | Feature-based folders | Features can be added/changed/deleted independently |
| Business rules | app_config collection | Ajinkya's hard requirement — no hardcoded values |
| Inventory/devices | Phase 2 | Deferred ~6 months per MOM |
| Realtime | Phase 2 | Socket.IO deferred until core modules stable |

---

## 16. WHAT NOT TO TOUCH

- Do not modify prototype files — reference only
- Do not hardcode business rule values — use `app_config`
- Do not store API response data in Zustand — TanStack Query only
- Do not build Inventory/Device mapping — Phase 2
- Do not build Socket.IO realtime — Phase 2
- Do not import `process.env.X` or `import.meta.env.X` outside config files
- Do not make direct axios calls in components or pages — use feature service → hook

---

## 17. SESSION LOG

| Date | Session Goal | Completed | Notes |
|---|---|---|---|
| 2026-06-29 | Project planning, stack decisions | ✅ | Stack locked |
| 2026-06-30 | Architecture review | ✅ | AWS = S3 + SES only |
| 2026-07-06 | Read all specs, set up folder structure, scaffold frontend + mobile | ✅ | Web frontend first. Feature-based modular structure. ENV pattern. launch.json. PROGRESS.md + TESTS.md created. |
| 2026-07-07 | Login screen dark mode + auth store cleanup | ✅ | themeStore (Zustand+persist), initTheme(), ThemeToggle, dark: variants, removed prop drilling + !important. Cookie-only auth fixed. |
| 2026-07-08 | Simplify login to single-step, refactor navConfig | ✅ | Removed 3-step role/OTP flow. `rolesAllowed` per-item nav + `getNavForRole()`. Route-constant exports per feature. Shared `lib/roles.ts`. Committed `6f3f78b`. |
| 2026-07-13 | Build Command Dashboard, Camps, CRM/Lead pipeline, Client Mgmt, Appointments, Sales Dashboard Today tab | ✅ | All against prototype as spec, mock/localStorage-backed. Two independent Agent audits run, findings fixed (incl. relocating `STAGES`/`LOST_STAGE`/`LOST_CATEGORIES` out of `crm.mock.ts` into shared `types/lead.types.ts` to fix a cross-feature import violation). Full file list in PROGRESS.md. |
| 2026-07-13 | Build full Analytics & BI module (6 tabs, 6 custom chart primitives) | ✅ | One shared `AnalyticsPage`, not the prototype's per-tab iframe pattern. Used `dataviz` skill's palette validator against existing `--chart-1..5` tokens (passes light mode, fails dark-mode lightness-band check — flagged not fixed). Fixed a circular-import blank-screen crash (caught only via live Playwright testing) via a documented workaround. Fixed FunnelChart label clipping. See §5a. |
| 2026-07-13 | Investigate user-reported login bug ("blanks back to login after sign-in") | ✅ analysis, ⬜ fix | Full Agent-based root-cause trace per explicit "no quick fix, proper thorough analysis" instruction. Found 3 compounding bugs (CORS hardcode, sameSite:strict, hard-reload 401 interceptor) + a user-shape mismatch (id/role). None fixed yet — see §5a and PROGRESS.md Known Issues. Surveyed `tenant-flow` reference project for comparison (same fragile pattern, worse — no runtime validation at all). |
| 2026-07-13 | Commit + push all session work; full project evaluation | ✅ | Committed `f4d6962` on `feature/login` (196 files), pushed to origin. Ran brutally-honest recruiter/senior-engineer evaluation (resume bullets, top-10 ranking, 30+ interview questions, L5-interviewer impressed/ordinary/credibility-risk breakdown, top-25 ROI improvement list) — delivered to user, nothing actioned yet. |
| 2026-07-14 | Fix inline-SVG icon inconsistency on LoginPage | ✅ | Swapped hand-coded logo/trust-badge SVGs for `react-icons/fi` (`FiMapPin`/`FiShield`/`FiLock`/`FiGrid`) to match the rest of the codebase. Committed `23af25a`. |
| 2026-07-14 | Build Project Management (list + 6-step New Project wizard) + Project Gantt | ✅ | Full research pass (background Agents) into `projects-manager.js` (2133 lines) and `gantt.js` (743 lines) before writing code. Built against exact prototype field lists, validation rules, KPI thresholds, and Gantt view/pixel constants. Deliberately fixed 4 real prototype bugs (PO-seeding-on-create, void-camps-excluded-from-renewal%, skipped the disconnected payment-workflow feature, wired real role-based scoping) — all per explicit user confirmation via AskUserQuestion. See §5a for the data-model-separation decision (own localStorage key, not Client Management's). Verified via `tsc -b`, `vite build`, and live Playwright runs against the user's own dev instance (logged in, screenshotted, ran the wizard to a real created project) — zero console errors. |
| 2026-07-14 | Independent adversarial audit of the new Projects module | ✅ | User asked to "recheck all the work" against code architecture. Background Agent instructed to actively try to break it, not confirm it. Found 1 real §3 modularity violation (8 files reaching into `crm/clients/clients.mock.ts` directly) — fixed by promoting `CLIENTS`/`DIVISIONS` to `types/client.types.ts` (same pattern as the earlier `STAGES`/`LOST_STAGE` fix). Also fixed a `divisionId` null/empty-string sentinel mismatch, one display-name typo vs the prototype, and a date-validation edge case in the wizard's Agreement step. Committed as `95f3307` (37 files), not yet pushed. |
| 2026-07-15 | Fix wizard visual-fidelity gap (stepper/contrast "looks wrong" vs prototype) | ✅ | Deep-research workflow confirmed the two wizards use different design systems (Projects: icon-tile pick-cards + icon-badge section headers, 900px; CRM: plain segmented pills + toggle chips, no icons, 720px). Built 6 new shared components in `components/ui/` matching each exactly; rewrote all 6 Project + 4 CRM wizard steps and both shells. See §5a. |
| 2026-07-15 | Root-cause and fix the actual color/contrast bug | ✅ | Found `--qms-brand` was one shade off (`#2451f0`/`--brand-600` instead of the real `#3b6dff`/`--brand-500`) — fixed globally (97 references app-wide), full regression sweep clean. Also fixed 6 new components using the wrong (opaque) surface token instead of the prototype's translucent one. Then fixed two more real gaps user pointed at: shared `Dialog` backdrop too light (`bg-black/10` vs prototype's `rgba(7,11,28,.5)`+blur, fixed globally) and `ProjectTable.tsx` missing its card background entirely (fixed; `CampTable.tsx` has the same bug, left unfixed — flagged in PROGRESS.md). |
| 2026-07-15 | Build Dashboard's missing Camp Report segment; explain color-coding logic | ✅ | User compared a prototype Dashboard screenshot and flagged what looked like missing sections — investigation confirmed the 7 main section titles already all exist (nothing missing there), but a genuinely separate module (`camp-report.js`, a role-scoped Camp Report chart) was entirely absent. Built `dashboard.camp-report.ts` + `CampReportSection.tsx`, wired above `CompanySection`. Also answered the "how are tile colors decided" question directly from prototype source — written up in PROGRESS.md. None of today's (2026-07-15) work is committed yet. |

---

*Last updated: 2026-07-15*
*Update this file at the end of every session.*
