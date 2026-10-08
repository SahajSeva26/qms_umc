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
1. **Web frontend first** (`frontend/`) — React + Vite + Tailwind — **in active development**
2. **Mobile app second** (`mobile/`) — React Native + Expo + NativeWind — **NOT started; no `mobile/` folder exists yet.** All mobile references below are the plan, not current reality.
3. Both share the same backend (`backend/`) — Express/TS, **many modules already built** (see `backend/CLAUDE.md`)

> **Current reality (2026-08-03):** only `backend/` and `frontend/` exist on disk. The backend has
> grown well past auth/user — full RBAC plus CRM (lead, project, appointment, division, contact) and
> operations (camp, geoProfile) modules are built. The frontend integrates the real backend for
> access-management, geo-profile, qa-feedback, and auth; the rest is still prototype-driven mock data.
> The `s:\...` prototype path below may be stale — confirm the prototype location with the user if needed.

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
| Auth / Login | ✅ | ✅ | 🔄 built, wired to real auth + `/auth/me` | ⬜ | Real backend auth |
| Command Dashboard | ✅ | ⬜ | ✅ built (mock data) | ⬜ | Web done, no backend |
| CRM & Sales Leads | ✅ | ✅ (`lead`) | ✅ built (Kanban, detail, wizard, Sales Dashboard) | ⬜ | Backend built; web still on mock |
| Camp Management | ✅ | ✅ (`camp`) | ✅ built (list/detail, close-out) | ⬜ | Backend built; web still on mock |
| Diet Camp Management | ✅ | ⬜ | 🔄 diet pages | ⬜ | No backend |
| Pharma Client Portal / Client Mgmt | ✅ | 🔄 (tenant/role) | ✅ built (list/detail, invoices) | ⬜ | Tenancy via access-mgmt; portal mock |
| Field Officer Ops | ✅ | 🔄 (`geoProfile`) | 🔄 fo pages + geo-profile (real) | ⬜ | Geo/allocation backend built; FO ops mostly mock |
| Doctor Management | ✅ | ✅ (`doctor`) | ✅ doctors page | ⬜ | Backend registry built |
| Inventory & Devices | ✅ | 🔄 (`inventory-master`/`device`/`consumable`/`assignment`/`request` built; `transaction` scaffolded) | ⬜ | ⬜ | Backend in progress (branch `feature/inventory-management`) |
| Project / Gantt | ✅ | ✅ (`project`) | ✅ built (list, wizard, Gantt) | ⬜ | Backend built; web still on mock |
| KPI & Order Engine | ✅ | ⬜ | ⬜ | ⬜ | Not started |
| Accounts & Billing | ✅ | 🔄 (`invoice`,`invoiceLineItem` built) | 🔄 billing page + Analytics "Financial" | ⬜ | Backend invoice + line-item built (camp-to-cash core, branch `fixes/camp-flow`); PO/AR/dunning/Tally still pending |
| Analytics & BI | ✅ | ⬜ | ✅ built — full 6-tab module | ⬜ | Web done, no backend |
| Admin / RBAC / Audit | ✅ | ✅ (access-management) | ✅ access-management pages (real) | ⬜ | Full RBAC live; audit-log pending |
| Appointments / Contacts | ✅ | ✅ (`appointment`,`contact`) | ✅ pages (contacts real) | ⬜ | Backend built |
| QA Feedback | — | ✅ (`qa-feedback`) | ✅ review page (real) | ⬜ | Backend + web wired |
| Notifications Engine | ✅ | 🔄 (`notification`) | ⬜ | ⬜ | Backend scaffold built + wired (model + `GET /notifications/me`); NO event triggers + NO delivery sender yet → never populated. See `backend/CLAUDE.md` |

Legend: ✅ Done | 🔄 In Progress / Partial | ⬜ Not started

**The "Backend" column is a summary — `backend/CLAUDE.md` is the source of truth** for the real
backend module list and endpoints. A "Web Screen ✅" with a ⬜/mock backend still runs on
localStorage; those services carry a `// TODO: wire to real API` comment. Where the web screen is
wired to the real backend, the feature uses a `*Real.service.ts` (or a real service) on the shared
axios client. Full frontend detail is in `PROGRESS.md`.

### Build Priority (31 July 2026 target)
1. **P1 — Now**: Auth/Login (fix the 3 confirmed bugs — see §5a), role-based routing shell, FO Mapping, Super Admin
2. **P2**: MR Booking Portal, Operations (Coordinators), Sales/KAM, Notifications
3. **P3 — Phase 2**: Inventory/Device Mapping (~6 months out)

---

## 5a. CURRENT PRIORITIES / OPEN ITEMS

Read this section first in a fresh session — it's the "what's actually going on" summary.

### Update (2026-08-03): backend has advanced far past this section's original snapshot
The narrative below (dated 2026-07-15) is preserved as history, but the backend is now much further
along than "auth + user + RBAC only." Built and wired since: full CRM (`lead`, `project`,
`appointment`, `division`, `contact`), operations (`camp`, `geoProfile`), plus `doctor`, `counter`,
and `qa-feedback` modules — all following the layered convention in `backend/CLAUDE.md`. The frontend
now integrates the **real** backend for access-management, geo-profile, qa-feedback, and auth
(including a real `/auth/me`); remaining features are still prototype/mock and migrate over via the
`*Real.service.ts` pattern. The permission-array-to-client wiring (the locked decision below) is
**still deferred** — the model is live server-side but not yet driving frontend nav/routes. For the
authoritative backend module/endpoint list and conventions, read `backend/CLAUDE.md`, not this table.

### Backend merged in; real RBAC exists now; role-vs-permission decision LOCKED — read before building any new screen

A teammate's backend work (branch `main`, 52 commits) was merged into `feature/login`. The backend
now has real, working: auth (login/logout/refresh-token, JWT access+refresh via httpOnly cookies,
bcrypt, account lockout), a `user` module, and a full `access-management` RBAC module family
(`tenant`/`role-type`/`role`/`permission-group`). **None of it is wired to the frontend yet** — this
is the current, deliberate state, not a bug:

- The backend's authorization model is **permission-code-based**, not role-name-based: each user's
  effective permissions = their `RoleType.permissions` ∪ their own `Role.permissions` override,
  merged server-side into `req.context.permissions` on every request. Backend routes are gated with
  `AuthorizeMiddleware([PERMISSIONS.TENANT.MANAGE.code], 'AND'|'OR')` — permission codes, never role
  strings.
- There are currently **29 permission codes total**, all CRUD-shaped (`create/get/search/update/
  manage`), covering only the 6 backend resources that exist so far: `system`, `user`, `tenant`,
  `permission-group`, `role-type`, `role`. **Nothing the frontend actually renders today** (camps,
  projects, sales, dashboard, analytics, etc.) has a backend permission code yet.
- **The permission array is never sent to the client.** It's computed and used purely server-side
  for route-guarding; `AuthMapper.toResponse`/`UserMapper.toResponse` both omit it, no `/me`-style
  endpoint exists. This is a deeper, separate version of the already-known "role missing from login
  response" bug below — fixing that bug alone (adding `role`) still wouldn't be enough; the
  permission array itself needs its own wiring.
- The backend's 9 `RoleType` codes (`system`/`hr`/`admin`/`sales`/`sales-head` platform,
  `pharma-ho`/`pharma-ms`/`pharms-asm`/`pharma-rsm` customer — note `pharms-asm`/`pharma-ms` look
  like typos, not yet confirmed with the teammate) share **zero exact string matches** with our
  frontend's 18-value `UserRole` enum (`super_admin`/`sales_lead`/`camp_coord`/etc.) — different
  vocabulary, different shape (flat string vs. permission-code array), different coverage.

**Locked decision (2026-07-15, made directly by the user): the frontend will fully adopt the
backend's real permission-based model once wired — gate nav/routes/UI on "what permissions does
this user have," not on an invented role name.** This is the target architecture, not optional.
However, the actual wiring (backend exposing the permission array in an API response + adding
permission codes for the modules that don't have them yet) is **explicitly deferred** — do not start
that migration unprompted. **For any new screen built before that wiring happens: keep using the
current flat-role scaffolding** (`AuthUser.role` + `rolesAllowed` arrays in `navConfig.ts`) exactly
as existing screens do, for consistency — but treat the 18-value `UserRole` enum as a temporary
stand-in being replaced, not a vocabulary worth deepening or "getting right" long-term. Don't invent
new role values beyond what's already there if you can avoid it.

A full adversarially-verified audit of the whole merged codebase was also run this session — 102
findings (13 critical, 27 high), covering real backend security issues (hardcoded JWT-secret
fallback, default admin credentials seeded on every boot if env vars unset, zero rate limiting,
two cross-tenant privilege-escalation paths in the new RBAC code) plus frontend architecture/
integration findings. Full detail in PROGRESS.md's 2026-07-15 entries; the interactive report itself
was delivered as a Claude artifact, not saved as a repo file — ask the user if they still have the
link if you need to reference specific findings again.

### Cross-feature import rule — now fully enforced, resolved via the rule's own stated test (2026-07-15)

User asked directly whether the existing built screens actually follow the project's own rules
(shadcn/Tailwind/TanStack Query/Zustand/cross-feature-imports/useState+Zod). A background audit
found the tech-stack rules were solid, but **cross-feature imports failed** — 8 real violations
(2 previously known + 6 new, including the pre-existing Analytics module reaching into 4 other
features' hooks at once). Resolved the ambiguity in the rule's wording ("features communicate only
through shared `types/`, `hooks/`, or `lib/`" — does a feature's OWN `hooks/` folder count as
"shared"?) using the rule's own stated rationale in §3: **"if a feature is removed, delete its
folder and one line from router.tsx — nothing else breaks."** Any hardcoded `@/features/[other]/...`
import path violates that guarantee regardless of what kind of file sits at the end of it — so the
strict reading was adopted, and Analytics's pre-existing violations were fixed too, not left as a
precedent.

**The fix pattern, now established — follow this for any new cross-feature data need:**
1. Plain mock/seed *data* another feature needs → promote it into the relevant shared `types/*.types.ts`
   file (same pattern as `CLIENTS`/`DIVISIONS`/`STAGES`/`QUARTER`/`ASSIGNMENTS`), with the original
   feature file keeping a backward-compatible re-export.
2. A feature's own *read-only data hook* another feature needs → create a shared, read-only wrapper
   hook in the top-level `frontend/src/hooks/` folder (e.g. `useCampsData`, `useSalesDataShared`,
   `useClientsDataShared`, `useLeadsData`, `useDashboardDataShared`) that calls that feature's own
   service function directly. This mirrors `useAuth.ts`'s existing, already-sanctioned role as the
   shared surface over `features/auth/`'s internals. The feature's OWN hook (`useCamps`,
   `useSalesData`, etc.) keeps its mutations — the shared wrapper is read-only, only for data other
   features need to display, never to mutate.
3. A genuine cross-feature *write action* (e.g. CRM booking a camp, which is fundamentally a
   Camps-owned mutation triggered from outside) → the shared hook gets the mutation too (see
   `useCampsData`'s `addCamp`), and the triggering feature's own hook orchestrates: build the
   domain object via its own service, persist via the shared hook's mutation, do its own
   feature-local side effects (e.g. incrementing an MR's camp-booked count) after.
4. A component/widget that's genuinely used by 2+ features by DESIGN (not just convenience) → it
   isn't really owned by either feature. Move it out entirely to `components/widgets/[name]/` (see
   the Sales KPI panel — `sales.kpis.ts`/`SalesKpiGrid.tsx`/`SalesFilterBar.tsx`, moved out of
   `features/crm/sales/` since the prototype dual-mounts the same executive KPI panel on both the
   Sales Dashboard and the main Dashboard by design).

`useProjects.ts`'s `useAuthStore` import remains the one confirmed, sanctioned exception — `authStore`
is explicitly listed in §3's repository structure as a shared file alongside `axiosClient`/
`queryClient`, not feature-private.

Also found and fixed while doing this: shadcn's `--primary`/`--sidebar-primary`/`--chart-1` tokens
(light AND dark theme, 6 values total) still held the wrong `--brand-600`/lighter-tint shades that
were fixed on `--qms-brand` in an earlier session but never propagated to the shadcn token layer —
corrected to `#3b6dff` in both themes after confirming against the prototype's own dark-theme CSS
that it has no separate brand-color override. Do NOT "fix" `--qms-border*`/`--border`/`--input`
(the `rgba(36,81,240,...)` tokens) if you see them again — those are a genuinely different, correct
shade the prototype itself uses for borders specifically; only `--primary`-family tokens were wrong.

**Separately found while trying to verify this live:** the backend currently fails to boot locally
(`seedSystemUser`'s transaction requires a MongoDB replica set; the local `mongod` is a standalone
instance) — see PROGRESS.md Known Issues. Not caused by this session's changes; a pre-existing
backend/infra gap that blocks live end-to-end testing until fixed.

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
| 2026-08-05 | Backend (branch `fixes/division`): flatten tenant admin role code + e2e verify | ✅ | Changed the runtime tenant admin **role** code from `${tenant.code}.admin` to plain `admin` (`tenant.service.ts createTenant`), for parity with the seeded system tenant and the supervisor case (name kept as the combination — user's call, code only). E2e testing caught a latent regression: `RoleService.create`'s duplicate check ran under `ctx.where()`, which is unscoped for a god-mode (`system:manage`) actor, so plain `admin` collided with the seeded qms admin and 409'd every new tenant. Fixed (user-approved) by scoping the check to `RoleModel.findOne({ tenant, code })` — matching the DB `{tenant, code}` unique index. Division-head code (`${d.code}-head`) left as-is (must stay derived; unique per tenant) and confirmed unaffected. Supervisor functionality validates on role TYPE codes, so no role-code change touches it. Verified via a real running server (rs0 replica set): 31 e2e checks pass across admin-code / cross-tenant coexistence / intra-tenant dup still-409s / sales-head→admin supervisor / division-head. `tsc` clean. Files: `access-management/tenant/tenant.service.ts`, `access-management/role/role.service.ts`. **Not yet committed.** |
| 2026-08-05 | Backend (branch `fixes/division`): make division REQUIRED for pharma roles | ✅ | Reverse of the already-done division→must-be-customer rule: `division` is now **required** for any role on a CUSTOMER tenant, with the **tenant admin role exempt**. Refactored both directions out of `RoleService.set()` into a new `handleDivision()` helper (parallel to `handleSupervisor`): validates a passed division as before, and on CREATE (`entity.isNew`, matching the supervisor pattern) throws `400 "A division is required for roles on a customer tenant"` when none is passed — unless the role type's **code is `admin`** (exempt, since the admin role is minted during `createTenant` before any division exists and isn't tied to one). User chose the basis (customer tenant type) + admin exemption + code check (over the `tenant:admin` permission check) via AskUserQuestion. Enforced on create only; updates keep the existing division; platform-tenant roles stay division-free. Verified on a live server (rs0): **15/15** e2e checks — customer tenant create still works (admin exemption), division onboarding still works, RSM without division → 400, RSM with division → 201, platform sales-head without division → 201. `tsc` clean. File: `access-management/role/role.service.ts`. **Not yet committed.** |
| 2026-08-13 | Context refresh — reconcile CLAUDE.md/memory with committed `feature/inventory-management` backend state | ✅ | No code changes. Read the actual on-disk state: the 2026-08-11 appointment/contact/division/tenant work (previously logged "uncommitted") is now committed on `feature/inventory-management`, and a new **Inventory domain** (`src/modules/inventory/`) landed — commits `8c62d0a` (refactor `inventory-item`→`inventory-master`), `3ddbedb` (consumable), `55f413b` (device). Built + wired + `inventory-*:manage` perms registered: **inventory-master** (global catalog, `code` natural key, type device/consumable/accessory/other, active/inactive soft-delete), **inventory-device** (per-unit, immutable `item`+`serialNumber`, warehouse/FO/camp location, lifecycle status, calibration/warranty), **inventory-consumable** (stock lot keyed (item,batch,location), quantity/expiry, active/expired, FEFO expiry-asc sort). All three: no tenant scoping (global like `doctor`), reads open / writes manage-guarded, follow the layered convention. **inventory-assignment** + **inventory-transaction** exist as empty scaffold files only — not built/wired. `tsc --noEmit` clean. Flagged for the next inventory session: finish assignment+transaction (the 4-concept plan's back half), decide tenant scoping, and fix the two typo constants (`MAINTAINANCE`/`DMAGAED`). Updated `backend/CLAUDE.md` (module structure + What's Done + What's Next) and this table. |
| 2026-08-14 | Backend (branch `feature/inventory-management`): **inventory-assignment** ("who holds what") | ✅ | Built + wired `inventory-assignment` — one record per assignee (Role, must be `field-officer` type), unique/immutable; holds `devices[]` (qty forced to 1) + `consumables[]` (qty). No POST — mutated via `PUT /:assignee` upsert. No tenant scoping (global, like the rest of inventory). Reads open, writes guarded `inventory-assignment:manage`. Deliberately does NOT touch device status / consumable quantity — that's the future transaction ledger's job. Commits `8afdc2e` (assignment per FO) + `6cd44f6` (consumable model refactor). |
| 2026-08-16 | Backend (branch `feature/inventory-management`): **inventory-request** lifecycle + **inventory-manager** role seeding | ✅ | Built + wired `inventory-request` — refill/return request lifecycle; `type` = refill/return; lines ref actual stock (`InventoryDevice`/`InventoryConsumable`) + qty; stageHistory + moveStage; statuses = requested→approved/rejected→received (terminal) + cancelled. Full CRUD perms. `requestedBy` = creator (always FO); `processedBy` = inventory manager. **Own-scope:** non-manage actors see/edit only their own requests. **moveStage authz:** manager does any valid move; requester can only refill→cancelled/received or return→cancelled (approve/reject stay manage-only). Known `FIXME`: FO's refill-received overwrites `processedBy`. Stock movement on `received` (FEFO pull / return restore + transaction + assignment delta) NOT yet wired. Also added a platform **`inventory-manager`** role type on seeding (`:manage` on all 5 inventory modules); FO role type granted `inventory-request` create/get/search/update. Commits `e8cdee5`, `f2e3daa`, `7523933`. |
| 2026-08-16 | Backend (branch `feature/inventory-management`): default sales-person assignment on lead creation | ✅ | A lead now defaults its `salesPerson` to the company's assigned sales person (`tenant.salesPerson`); payload `salesPerson` is now **optional**. Overriding to a different one is **manager-only** (`lead:manage`) — a non-manager override → 403; when the company has no assigned sales person, the payload must supply one. Extracted two helpers: `applyOwnScope()` (dedupes the "reps see only their own leads" logic across `get()`/`search()`, applied LAST in `search()` so a rep can't widen past their own leads via a `salesPerson` filter) and `assertPlatformSalesPerson()` (must exist + be QMS-internal/platform staff), moved out of `set()` into `create()`/`update()` where it's actually gated. Commit `e8c8b83`. Files: `crm/lead/lead.service.ts`, `crm/lead/lead.validators.ts`. Memory: [[todo-lead-creation-scoping]]. |
| 2026-08-30 | Backend (branch `feature/test`): **test-master fixes + patient module + screening module** (camp-day operations) | ✅ built + e2e, all committed | **testMaster** (already existed, hardened): `config` validator now mirrors the model's `inputs[]` exactly (was a data-losing `z.record`), `type` enum references `TEST_MASTER_CONFIG_INPUT_TYPE`; `code` now **auto-generated** from a new `test-master` counter (`tst-`) instead of caller-supplied (dropped from create payload); added `test-master:search`/`get` perms and **locked the previously-open reads** behind them (get/search-or-manage); granted FO read, ops-managers keep manage. **patient** (NEW, `src/modules/operations/patient/`): **global registry** (no tenant — user's explicit call), `code` auto-gen from `patient` counter (`pat-`), `email` optional+lowercased+**sparse-unique**, names trimmed (not lowercased), embedded `address` (`_id:false`), `createdBy` (Role), `active`/`inactive` soft-delete; perms manage/create/search/get/update, reads locked; `create` granted to field-officer + both camp-coordinators. **screening** (NEW, `src/modules/operations/screening/`): **tenant-scoped, tenant DERIVED from camp**, one per (tenant,patient,camp); `stageHistory`+`moveStage` (`pending→completed/cancelled`, seeds a created entry, createdBy/performedBy live in the journal — no separate fields); embedded `consent` with a server-generated 6-digit OTP (new **`OtpHandler`** util `src/shared/utils/otp.ts`, crypto-backed) + `POST /:id/verify-consent`; **completion gated on consent.verified (422)**; **create gated on camp `live` (409)**; **only the assigned FO (`camp.fo`) or a manage actor may create/mutate** (`assertAssignedFoOrManage`, non-assigned → 404 via own-scope); reuses `CampService.get` (populated fo) + `ScreeningService.search` (dedup) via one shared `loadCampForAction` helper (DRY refactor per user); test results deferred to a FUTURE separate entity; FO granted create+update only. Counter gotcha re-confirmed: new entities must be added to BOTH `COUNTER_ENTITY_TYPES` (model enum) and `seedCounters` or boot fails. Each module e2e-verified on live rs0 (17/17 test-master, 21/21 patient, 24/24 screening + RBAC/live-gate/assigned-FO runs). User committed each module as we went: `3aa7804` test-master, `ccc6377` patient, `58f9d8d` screening. Memory: [[test-master-module]], [[patient-module]], [[screening-module]], [[otp-handler]]. |
| 2026-08-31 | Backend (branch `feature/test`): **test module — per-screening results + FO stock deduction** | ✅ built + e2e (19/19), uncommitted | Worked the `test` module (`src/modules/operations/test/`, wired) in small user-driven steps. (1) Removed a dead commented `interpretation` filter from `search`. (2) `create` dedup now **reuses `TestService.search`** (instead of a direct `findOne`) for the one-result-per-(screening,type) check — kept BEFORE the txn (search fires count+find in parallel, forbidden inside a txn); DB unique index `{screening,type}` is the backstop. (3) Added **FO own-scope** (`applyOwnScope`) to `get`/`search`: a non-`test:manage` actor sees only tests they `performedBy`. (4) Since own-scope makes `update`'s `get` 404 others, **dropped the now-redundant assigned-FO check in `update`** (`loadScreeningForAction` still authorizes `create`; refactored it to return `{screening,camp}`). (5) **The feature: FO stock deduction on test create.** In one `withTransaction`, the test is saved and the **camp's assigned FO** (`camp.fo`) has stock drawn down per `TestMaster.consumption` — short stock → 409 + full rollback. **Data-model gotcha caught during e2e prep:** `consumption.item` is a catalog `InventoryMaster` (enforced by testMaster's validator), but the FO holds `InventoryConsumable` **lots** — different id spaces, so a naive `assignment.inventory === consumption.item` match blocks every test. Fixed by bridging item → the FO's lots of it (read-only `InventoryConsumableModel` lookup), then subtracting the exact `rate` across those `InventoryAssignment` holdings via `adjustHolding` (devices carry rate 0 → skipped). User made the calls: block-on-short (not partial), no FEFO (lots already in order), consumables only. Verified with a mongoose-seed + HTTP e2e (camp live → patient → screening → consent OTP → complete → test → stock 10→7; + completed-gate, dedup, short-stock rollback, no-orphan-row) — **19/19 on live rs0**, `tsc` clean. **Follow-ons (same session, all e2e-verified on live rs0):** (a) granted the **field-officer role type** the missing read/update perms — `screening:get/search`, `test:get/search`, `patient:get/search/update` (reads are permission-locked; FO needs to read back what they create) — verified the boot provisioner full-synced it into the DB. (b) **`screening.performedBy`** — new **required** Role field pinned at create from `camp.fo` (safe-required: create needs camp `live`, and live needs an FO; service guards with a clean 409 if absent), surfaced in the mapper. (c) **test create now blocks on a terminal camp** — no test once the camp is `closed`/`cancelled`/`cancelled_charged` (409, before any write/deduction). (d) **read own-scope** on screening (mirrors test): non-`screening:manage` actor pinned to their own `performedBy` in get/search; added a **manage-gated** `performedBy` search filter; `applyOwnScope` moved **up-front** in search (safe — all widening filters are manage-gated) in both `test` and `screening`. Own-scope proven with a **real logged-in FO actor** (8/8 — FO sees only their own screenings, 404s others, can't widen via `performedBy`; manager's filter works). Files: `operations/test/test.service.ts`, `operations/screening/{model,service,validators,mapper}.ts`, `shared/env/defaultRoleTypes.ts`. Memory: [[test-module]], [[screening-module]]. |
| 2026-08-21 | Backend (branch `fixes/camp-flow`): **finance domain — invoice + invoiceLineItem** (camp-to-cash) | ✅ built + e2e | New `src/modules/finance/` with two modules (full layered convention, wired in `app.ts` + swagger). **invoice** (`/invoices`): tenant from a required `project` (ANY status — a project-`live` gate was added then REMOVED per user), `code` from a seeded `invoice` counter (`inv-`), **line items DRIVE the money** (`subtotal`=Σ line amounts, `total`=subtotal+tax−discount via exported `computeInvoiceTotal`; `subtotal` never accepted), `syncToTally` bool (default false), stageHistory+moveStage `draft→approved→issued→{grn_signed→paid\|cancelled}`. **Create takes `camps:[id]`** and bills them in one txn. **invoiceLineItem** (`/invoice-line-items`): one line per camp; **nested resource with NO tenant** (user vetoed a denormalized camp→invoice ref) — scoped transitively via parent invoice, search REQUIRES `invoice` filter; `amount` snapshots project `campCost` (not supplied); **no update path**; mutations only while invoice `draft`; add/delete recompute parent totals in a txn. Shared per-camp rules (`assertCampBillable` + `assertCampEligibleForBilling`, used by both create paths): camp exists, in the invoice's project, `billingType=billable` (void excluded), status `closed`/`cancelled_charged`, not already on a non-cancelled invoice. **No unique index** on line-item camp (a cancelled invoice frees it to re-bill) → uniqueness is the service check (small read-then-write race, accepted). Added **`finance-manager`** platform role type on seeding (`invoice:manage`+`invoice-line-item:manage`); seeded `invoice` counter. Verified via ~60 e2e checks across 4 runs on live rs0 (create/subtotal/total/draft-lock/cancel-frees-camp/void+status rejects). `tsc` clean. **Not committed.** OPEN: `cancelled_charged` billed at FULL campCost (should be cancellation-charge %?); "billable unbilled camps" picker; real Tally push. Memory: [[finance-invoice-module]]. |
| 2026-09-08 | Backend (branch `fixes/feedbacks`): **4 small field/filter changes** (tenant fields, vendor FY filter, inventory-master maxStock removal, consumable optional expiry) | ✅ each built + e2e on live rs0, `tsc` clean, **UNCOMMITTED** | Follow-on to the geoProfile row below, same branch/session. Each done one-at-a-time, model→validators→service→mapper only (controllers/routes are schema-driven → untouched everywhere), each e2e-verified on a booted rs0 server then cleaned up. **(1) tenant `businessLifetime` + `gst`** — both optional; `businessLifetime` = Number; `gst` = **plain String in the model, GSTIN format validated in VALIDATORS ONLY** (regex `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`, trim+upper, per user's explicit "check validation in validators only"). e2e 11/11 (valid/lowercase-upcased/invalid→400/optional/update/rejected-update-preserves). **(2) lead `fyFrom`/`fyTo` search filters** — bound the lead's `createdAt` (financial-year range), `z.coerce.date().optional()` + `.refine(fyFrom<=fyTo)` in `SearchLeadQuerySchema`; service normalizes to inclusive UTC-day bounds via the file's existing `startOfUTCDay`/`endOfUTCDay` and places the range BEFORE `applyOwnScope` (non-manager still can't widen past own leads). **NOTE:** first mis-added to `vendor-master.service.ts` (I keyed off the file path in the user's message), then **fully reverted** and re-added to lead per the user's correction. [[upcoming-lead-module]]. e2e for vendor-master version passed 9/9 before the move; lead version `tsc`-clean, not re-run yet. **(3) inventory-master remove `maxStock`** — dropped from all 4 layers; Zod strips the stray key (no 400), never returned; `minStock` intact; existing DB docs keep the orphan field. e2e 8/8. **(4) inventory-consumable `expiryDate` OPTIONAL** — dropped `required` in model + create validator `.optional()` (update already optional); can be added later via update. ⚠️ FEFO gotcha flagged: null-expiry lots sort FIRST under `{expiryDate:1}`. e2e 10/10. [[upcoming-inventory-devices]]. Also confirmed lot identity is `(item,batch)` unique — NO location field despite older notes. Stale `maxStock` left in `src/shared/test-cases/test-inventory-flow.md` (doc only, flagged not touched). Files: `tenant/{model,validators,service,mapper}.ts`, `vendor-master/{validators,service}.ts`, `inventory-master/{model,validators,service,mapper}.ts`, `inventory-consumable/{model,validators}.ts`. |
| 2026-09-08 | Backend (branch `fixes/feedbacks`): **geoProfile flat address** | ✅ built + e2e (13/13 live rs0), `tsc` clean, **UNCOMMITTED** | Context first reconciled: now on `fixes/feedbacks` (merged `feature/address`+`project/report`+`test`+`frontend/fixes`), working tree was clean — everything my notes marked "uncommitted" (vendor-master `9c5a6df`, doctor bulk `6fcb939`, tenant address `c3f0517`) is now **committed & merged**; new since: `65a1508` **camp location refactor** (camp now has the same embedded address as tenant) and an **empty `src/modules/location/` scaffold** (no files, not tracked). Then the task: added a **flat address** to `geoProfile` mirroring tenant's, but **spread FLAT onto the model, not nested** in an `address` subdoc. **Why flat:** tenant's address subschema carries its own `coordinates`+`2dsphere` index — copying verbatim would give geoProfile a SECOND 2dsphere index, and `$geoNear`/`findNearest` refuses to run with >1 geo index (no `key`) → would break FO allocation. Flat spread reuses the EXISTING top-level `coordinates` as the address geo point (single geo index preserved). 8 fields (`addressLine1`/`addressLine2`/`locality`/`city`/`state`/`country` default India/`pincode`/`googlePlaceId`), all **optional** (tenant made them required inside an optional wrapper; flat has no all-or-nothing wrapper → requiring would break existing creates). Touched only model / validators (`AddressFieldsSchema` spread into Create+Update) / service `set()` / mapper — **controller + routes needed NO change** (schema-driven; Swagger auto-derives). e2e-verified on a live rs0 server booted for the test (13/13: create w/ address, read-back, partial update preserves untouched fields, country default, and critically **findNearest still 200 + finds the new profile at distance 0** → allocation unaffected). Temp test script + booted server cleaned up after. Files: `operations/geoProfile/{model,validators,service,mapper}.ts`. Memory: [[geoprofile-module]]. |
| 2026-09-09 | Backend (branch `feature/brands`): **brand module** (pharma brands per division) + removed division `brandFocus` | ✅ built + e2e (24/24 live rs0) + COMMITTED | Built `src/modules/crm/brand/` — decided it belongs in **crm** (sibling to division), not the `operations/` folder it was first scaffolded in (a brand's parent is `division`; chain tenant→division→brand is master data, not camp-day ops). All layers + wired (app.ts + swagger + permissions registry). **tenant-scoped, tenant DERIVED from the division** (never from payload — mirrors lead). `name` lowercase+trim; **`code`** = name lowercased + ALL whitespace stripped (`toCode()`), **derived by service, set ONLY on create, IMMUTABLE** (out of `set()`; update leaves it → name editable but code frozen, old code stays reserved). **Unique index `{tenant,division,code}`** (same code OK in a different division). Create dedup **reuses `BrandService.search({division,code})`** not raw findOne — added an **exact-match `code` search filter** (name filter stays partial regex). Guards mirror `contact`. Perms `brand:manage/search/create/update/get` — **read** (`get`+`search`) to `sales-rep` + all 4 pharma role types (shared `PHARMA_BRAND_PERMISSIONS`); **manage** to `sales-head` + both ops-managers; boot provisioner full-synced all into DB (seen in seed logs). Side effect: removed the now-redundant **`brandFocus`** field from division (all 4 layers + `test-division-flow.md`). e2e 24/24 on live rs0 (derived code, tenant-from-division, immutability + old-code-stays-reserved, normalized-collision 409, exact-vs-partial code search, division-scoped uniqueness, unique index verified directly in Mongo). `tsc` clean. Committed `fc0aadc` (CRUD+wiring+perms) / `04c6cd9` (drop brandFocus) / `619a2a4` (code+immutable+search-reuse). OPEN: no `E11000→409` translation; no live RBAC login-as-pharma test; frontend not wired. Memory: [[brand-module]]. |
| 2026-08-11 | Backend (branch `feature/inventory-management`): appointment `nextSteps`→history + drop `blocked` status; contact tenant+division scoping; division multi-therapy | ✅ | **Appointment:** (1) moved `nextSteps` from a single mutable field into the `stageHistory` subdoc — each `moveStage` now records its own `nextSteps` alongside from/to/reason/actor, giving a full per-transition history (removed the top-level field from model/create/update/mapper; added optional `nextSteps` to `MoveStagePayloadSchema`). (2) Removed the `blocked` status per user request — kept `released` by explicit choice (AskUserQuestion), even though it's now unreachable (only `blocked`→`released` fed it); dropped `blocked` from `APPOINTMENT_STATUSES` + transition map, removed the blocked-only MoM guard and the blocked→released manage-only release guard. Flow now: planned→done/cancelled (terminal), released→planned/cancelled. **Contact:** added optional `division` ref (create + search), validated to belong to the resolved tenant (404 not-found / 400 cross-tenant, same coherence check as appointment); made division **required for pharma (customer-type) contacts** (type defaults to customer, so omitted type still requires one; platform contacts stay division-free); made `type` **immutable in update** (removed from `UpdateContactPayloadSchema`) — matches the locked-`tenant` rule and closes the platform→customer-via-update loophole around the division requirement. **Division:** `therapy` changed from a single enum to a **list** — a division can span multiple therapy areas. Model field is now `[String]` (enum validates each element) + a min-1 validator; validators use a shared `TherapyListSchema` (non-empty **and** duplicate-free via `.refine`) for both create (required) and update (optional, replaces the list wholesale); service `set()` dedupes as defense-in-depth; mapper returns the array; search filter unchanged (scalar-matches-array in Mongo). Existing single-string docs read fine (Mongoose casts scalar→1-element array on hydration); flagged a lazy-vs-eager backfill choice. **Tenant:** added an optional, updatable `salesPerson` (Role ref, `default: null`) so a platform sales person can be assigned to a tenant account — accepted on create and update (update is `.nullable()` so passing `null` unassigns); service `set()` validates a supplied id resolves to an existing role (404 else, scoped to the actor) **AND** that its role type is `sales-rep` (`ALLOWED_ROLETYPE_CODES.PLATFORM.SALES_REP` — looked up via `RoleService.get(..., { populate: true })` to read `type.code`, 400 otherwise) and clears on explicit null; mapper surfaces it gated behind `system:manage` (same as `owner`). Decisions flagged (not actioned): `system:manage`-gated visibility, no search filter added. `tsc` clean throughout; not yet e2e-verified against a live server. Files: `crm/appointment/{constants,model,validators,service,mapper}.ts`, `crm/contact/{model,validators,service,mapper}.ts`, `crm/division/{model,validators,service}.ts`, `access-management/tenant/{model,validators,service,mapper}.ts`. **Not yet committed.** |
| 2026-09-03 | Backend (branch `feature/address`): **vendor-master module + vendor ref on stock + doctor bulk CSV upload** | ✅ built + e2e (all runs on live rs0), `tsc` clean, **UNCOMMITTED** | Three pieces, each e2e-verified. **(1) vendor-master** (`src/modules/vendor-master/`, standalone, all 7 layers filled from a user-seeded model; wired app.ts + swagger + permissions registry): **global + platform-only** vendor/supplier registry — no tenant scoping, but **every endpoint incl. reads is permission-guarded** (`vendor-master:manage/create/get/search/update`) so only platform roles reach it (customer owner 403s on read AND create, proven). `code` immutable uppercase natural key; `name`; **`contacts[]`** = `{name(req),number,email,designation}` (replaced flat contactPerson/phone/email per user); optional embedded `address` with **optional** `coordinates` (2dsphere) — address fully optional per user; `active`/`inactive` soft-delete (manage-gated). Granted **`vendor-master:manage` to `inventory-manager`** role type. Memory [[vendor-master-module]]. **(2) vendor ref on stock:** both `inventory-device` + `inventory-consumable` now carry a **REQUIRED immutable `vendor`** ref → VendorMaster (the supplier bought from) — validated to exist at create (404), seeded alongside `item`, populated (`{id,code,name}`), `vendor` search filter added. User chose BOTH stock types + REQUIRED. ⚠️ required → breaks legacy stock docs / older callers omitting vendor. 4 files each. **(3) doctor bulk upload:** `POST /doctors/bulk` — multipart CSV (file field `file` + optional `tenant`), guarded **only** by `doctor:manage` (non-manage 403 proven), mirrors division `bulkCreateMr` (CsvHelper→per-row `CreateDoctorPayloadSchema` validate→`processInBatches(DoctorService.create,5)`→summary `{totalRows,validRows,invalidRows,created,failed,errors[]}`, partial→400). **Improvements over MR (doctor only, per user):** in-file pharmaCode dedup (`Map`, first-wins, later dupes clean-rejected before batching) + **`create()` now catches E11000 → clean 409** (field via `keyPattern.email?'email':'pharma code'`; makes single-create race-safe too; covers cross-upload pharmaCode + same-file email races — no raw E11000 anywhere) + invalid rows surfaced with row#+field detail. Reused shared `csvUploader`/`multer`/`CsvHelper`/`processInBatches`. Memory [[doctor-module]]. Also **reviewed doctor** and flagged (not fixed): stale "global" swagger/comments (it's tenant-scoped) + flat location fields not migrated to the embedded `address` pattern this branch standardizes. Files: `vendor-master/*` (8), `inventory/inventory-{device,consumable}/{model,validators,service,mapper}.ts`, `crm/doctor/{validators,service,controller,routes}.ts`, + shared wiring (`app.ts`, `permissions.ts`, `defaultRoleTypes.ts`, `swagger.config.ts`). |
| 2026-10-01 | Backend (branch `fixes/feedback`): **UI-revisions brief — more pointers, one at a time** (2 bugs + stats + deferrals) | ✅ built, `tsc` clean; 4 committed, 5 uncommitted | Worked the UI-revisions brief pointer-by-pointer; also reconciled a NEWER frontend brief with 2 whole new modules (**Pharma Portals** — MR only, **Doctor Management**) + expanded **Inventory** → tracked in memory [[ui-revisions-tracker]] (the on-disk `UI-REVISIONS-PROGRESS.md` predates them). **Committed:** `6d17659` project search ObjectId-cast bug (tenant/division/lead/salesRep filters weren't `toObjectId()`-wrapped → `report.byType` aggregation silently returned 0 for a tenant-scoped `report=true`; `find()` auto-casts so the list worked, `aggregate()` doesn't); `808fcdf` project `report()` own-scope (apply `applyOwnScope` so KPI tiles match the list — narrow-the-report, security-safe); `b4cdf1e` camp non-live-booking block (`POST /camps/book` → **409** on a non-`live` project, before role-type check; `create()` untouched); `73304b5` invoice **`/invoices/report`** (global-by-default for platform / own-tenant for customer; `{totalInvoices,totalInvoiced,statusCounts[]}`; optional tenant/project/date scope, ObjectId-cast) + invoice-card subtitle (project populate extended `division`/`executionMode`) + batched per-invoice **`lineItemCount`**. **Uncommitted (`tsc` clean):** camp status-scoped `report()` (optional `status` → byType scopes to a tab); camp per-row patient stat (`report=true` → `stats.patients/patientsCompleted` from the **screening** collection); doctor per-row `stats.camps/patients/patientsCompleted` (camps via `Camp.doctor`, patients via 2-hop `$lookup` camps→screenings); consumable `report()` **FEFO expiry bands** (5 bands + `noExpiry`, KPI-card totals, reuses the existing `expired` facet). **KEY FINDING:** actual patient/test counts are **DERIVABLE from the `screening`/`test` modules — NOT missing Camp fields** as the brief assumed (unblocks camp-drawer/doctor/pharma patients + the CRM additional-patient-billing dependency). **Decisions/deferrals:** CRM follow-ups appointment-scope → **WON'T FIX** (aggregate counts, not data; revisit only if tiles become click-through); device calibration → **DEFERRED** (frontend uses the existing `update` endpoint — the movement ledger genuinely doesn't model a calibration event; a separate calibration-log would be the home if ever needed); Tally/`tallyInvoiceNo` → deferred; FOC camps → next; consumable `storage` field → parked ("later"). **Still blocked (no model):** Rx count, ★ ratings, camp photos. Pattern reused all session: `report=true` on search → per-row `stats` (lead/doctor/camp) vs a dedicated `report()` endpoint for collection-wide KPI totals (invoice/consumable). Resume 2026-10-02: commit the batch, then FOC / additional-patient-billing. Files: `crm/project/project.service.ts`, `operations/camp/{validators,service,mapper}.ts`, `crm/doctor/{validators,service,mapper}.ts`, `finance/invoice/{validators,service,controller,routes,mapper}.ts`, `inventory/inventory-consumable/{service,mapper}.ts`. See `backend/UI-REVISIONS-PROGRESS.md` (⏸️ RESUME HERE 2026-10-02). |
| 2026-09-29 | Context refresh — reconcile CLAUDE.md/memory with committed backend state on branch `fixes/feedback` | ✅ no code changes, `tsc` clean | **Reconciliation only, no code written.** Read the actual on-disk/git state. **(A) All prior "uncommitted" work is now committed & merged** onto `fixes/feedback` — the 2026-09-14 fo-mapping booking-availability work, the 2026-09-08 `fixes/feedbacks` batch (tenant `businessLifetime`/`gst`, lead `fyFrom`/`fyTo`, inventory-master `maxStock` removal, consumable optional `expiryDate`, geoProfile flat address) are all present in code. Note the branch is `fixes/feedback` (no trailing s) — the `fixes/feedbacks` in older footers appears to have been merged in. **(B) Large frontend UI-redesign wave landed 2026-09-28/29** (PRs #123–#132: tenant logo + user profile picture via AWS, multistep new-tenant form, Google Maps provider centralized, division-scoped doctors, state-city doctor roster filter, UI redesigns of appointments/camps/projects/client-management/CRM-invoicing/FO-management, deleted stale mock FO + inventory data) — frontend, not tracked in this backend-focused log; flagged for awareness. **(C) Today's 8 backend reporting/filter commits** (branch `fixes/feedback`, all committed, `tsc` clean): (1) `8b3c7dc` **mapper coupling fix** — `toSearchResponse` across **all 31 mappers** that have one no longer calls `toResponse`; each now inlines its fields independently (identical output today, adversarially verified as property-for-property parity) so search rows can be trimmed per-module later without affecting `GET /:id`. (2) `8525fdd` **tenant MR count** — `getTenantStats` rollup gained `mrs` (count of field-force roles per tenant). (3) `d9d60b1` **invoice tenant filter** — `SearchInvoiceQuerySchema` + service gained a `tenant` filter (honoured only when `ctx.where()` hasn't already pinned it — customer stays tenant-locked). (4) `a8c3e80` **project report=true** — optional per-type project breakdown (`{total, byType[]}`) over the scoped+filtered set (for client-detail). (5) `3a7a002` **camps executed vs decided** — `report=true` now also returns per-project `stats.executedCamps` (closed + cancelled_charged camps, one aggregate for the page) shown against the project's `totalCamps` quota. (6) `6f5e006` **project code regex search** — added `code` filter (regex, case-insensitive) to project search. (7) `a0b5b22` **division report=true** — per-division `stats` (`totalProjects`/`liveProjects`, one aggregate for the page). (8) `8da03eb` **tenant address search** — `city`/`state` regex filters over the embedded `address`. Pattern across all reporting: an optional `report=true` query triggers an extra aggregate returning a `stats`/`report` block alongside `items`; per-page, single aggregate, no N+1. Updated this row + footer + `backend/CLAUDE.md` What's Done (project/division/tenant/invoice). |
| 2026-09-29 | Backend (branch `fixes/feedback`): **CRM lead search — code + focusTherapy filters + follow-ups `report=true`** (UI-revisions CRM pointers #2, #3) | ✅ built, `tsc` clean, **UNCOMMITTED** (e2e pending) | Two CRM pointers, decided one-by-one with the user then built together. **#3 filter scope:** added **separate** `code` (regex) + `focusTherapy` (regex — matches any element of the lead's therapy array) filters to lead SEARCH (`title` already existed). **No combined `q`/`$or`** box per user — frontend combines client-side; ref-name matching (contact/company name) deferred to frontend (same name→id issue as the reverted project client-name pointer). Param named `focusTherapy` (matches model field), not `therapy`. **#2 follow-ups:** `report=true` on lead SEARCH now attaches per-row `stats.followUps` = count of **every** appointment linked to the lead (all statuses), via one batched `$in:leadIds` aggregate over `AppointmentModel` (new `getLeadFollowUpStats` helper), own-scoped by the same `where` as the list. No model change (`Appointment.lead` ref already exists). This is on the **search** endpoint — distinct from the existing `GET /leads/report` summary facet. No circular-import risk (appointment.model imports only mongoose + its constants). Files: `crm/lead/{validators,service,mapper}.ts`. |
| 2026-09-29 | Backend (branch `fixes/feedback`): **CRM lead `/leads/report` KPI strip — 5 tiles** (UI-revisions CRM pointer #1) | ✅ built backend, `tsc` clean, **UNCOMMITTED**; frontend wiring pending | Extended `report()`'s existing single `$facet` with a `kpis` block (surfaced via mapper alongside `summary`): **pipelineValue** (Σ estimatedValue over open leads), **avgDealSize** (avg estimatedValue over won, all-time), **wonValue**+**wonCount** (won within the from/to range, via `stageHistory` `$elemMatch to:won` + createdAt range), **winRate** (% won/(won+lost) within range), **salesVelocityDays** (avg days lead-created→won transition, all-time, via `$filter`+`$subtract`), **topRep** (`{salesPerson,name,wonValue,wonCount}` — group won by salesPerson, top 1, name via `roles` `$lookup`, all-time). Per user: **windowed tiles use the endpoint's existing `from`/`to` INPUT** (no internal MTD/90-day hardcoding), velocity+topRep all-time; **Avg AI Score omitted** (no scoring model — product decision). Scope follows the existing `report()` `ctx.where()` (own-scope-on-report stays the deferred refactor). Confirmed via frontend inspection that this fills a real gap: `crm.kpis.ts` deliberately omits these tiles today with a comment that `/leads/report` has no estimatedValue aggregation — the brief explicitly says they're "not addable frontend-only." **⬜ Frontend still needs to wire it** (re-add tiles + add `kpis` to `LeadReportResponse`). This closes the CRM module's backend pointers (KPI strip + follow-ups + filter scope all done; contact/company-name search deferred to frontend). Files: `crm/lead/{service,mapper}.ts`. |
| 2026-09-29 | Backend (branch `fixes/feedback`): **project search-by-client-name — built then reverted** (UI-revisions Project Mgmt pointer #3) | ↩️ reverted (code clean), solution documented | Built client-name project search (relax `tenant` filter `objectId`→`z.string()`; in `search()` branch on `isValidObjectID` → id filter direct, else resolve name via `TenantService.search({ name })` → `{ $in: matchedIds }`), then **reverted per user's call — the frontend will handle it via its existing workaround** (resolve client name → tenant id client-side, use the `tenant` id filter). The deferral was partly driven by a caveat: the name resolution called `TenantService.search` with no pagination, relying on Mongoose `.limit(undefined)` = no-limit to return ALL matches — correct but implicit (a future default page size would silently cap resolution). Full proposed solution + caveat preserved in `UI-REVISIONS-PROGRESS.md` #3 for later. Working tree `src/` back to clean, `tsc` clean. Also this session: marked the **`report()` vs `search()` own-scope inconsistency** (Projects + Camps) as a deferred **LATER REFACTOR** per user's call. |
| 2026-09-14 | Backend (branch `feature/fo-mapping`): **camp FO slot-overlap primitives + `/camps/booking-availability` hardening** | ✅ built + e2e **11/11 live rs0**, `tsc` clean | **Overlap:** extracted decoupled primitives in `camp.service.ts` — `SLOT_OVERLAPS` map (3 daytime slots 9am-1pm/10am-2pm/11am-3pm overlap each other; evening 6pm-10pm alone) → `overlappingSlots()` pure fn → `isFoBookedForSlot()`/`assertFoAvailableForSlot()`. Wired a **hard 409** into `create()` **and** `update()` when a supplied FO is already booked (confirmed/live) on an overlapping slot that day; unified `bookedFoRoleIdsOnDate()` (moveStage confirm-guard + auto-assign) to the same `$in: overlappingSlots` rule; `bookingAvailability` reuses `overlappingSlots`. **booking-availability changes (user-driven, one at a time):** (1) route guard → **`camp:book` only** (committed); (2) a service-level customer-tenant 403 guard was added then **commented out by the user** — effective access = `camp:book` route guard + the project 404 below; (3) **`projectID` now validated** — `ProjectService.get` scoped → a project not owned by the caller's tenant → **404** (was accepted-but-unused); (4) FO `$geoNear` + camps lookups made **NOT tenant-scoped** (FOs are global platform staff serving all pharma; an FO booked by any tenant is unavailable to all — this fixed the endpoint returning 0 FOs for a real customer MR); (5) reported slots restricted to the **project's `campTimeSlots`** (fallback: all 4); (6) response **`data.dates` changed from an array to a MAP keyed by `YYYY-MM-DD`** → `{available, slots}`. e2e via restored seed+overlap scripts under `src/shared/env/script/` (`npm run seed:dummy` then `npx tsx …/test-overlap-e2e.ts`). Overlap/scoping/route work committed `c524866`/`1b0d406` (+ `1c6828e` deleted the scripts, since restored); project-404 + slot-restriction + dates-map **UNCOMMITTED**. Memory [[camp-booking-availability]]. Files: `operations/camp/{service,routes}.ts`, `shared/env/script/{seedDummyData,test-overlap-e2e}.ts`. **(7) FO ALLOCATION-SCOPE BUG FIX** (user-reported): `POST /camps/book` runs `create()` under the pharma CUSTOMER ctx, so FO auto-allocation scoped to the customer tenant → 0 platform FOs → camp silently saved `fo:null` (+ a second failure: `RoleService.get(ctx)` rejected the platform FO). Fixed by making the whole FO-allocation sub-operation GLOBAL: geo lookup via new shared `nearestFoProfilesGlobal()` (also now used by booking-availability; dropped the `GeoProfileService.findNearest` call/import), FO role validation via `RoleModel.findById().populate('type')` + field-officer assert, and clash checks (`bookedFoRoleIdsOnDate`/`isFoBookedForSlot`) dropped `ctx.where()`. Pharma authz + camp ownership stay customer-scoped. e2e now **12/12 live rs0** (added: pharma book → customer-owned camp with a platform FO auto-allocated). |
| 2026-10-03 | Backend (branch `fixes/feedback`): **dietitian support for diet camps (FO parity)** | ✅ built, `tsc` clean, **e2e 18/18 live rs0, COMMITTED** (`3a0ed2c`/`cdda34b`/`b7ed264`) | A diet camp (`type: diet`) is now staffed by a **dietitian** exactly as screening/lab camps use a **field officer** — geoProfile, radius allocation, device/consumable assignment, slot-clash, auto-confirm. Built one-at-a-time: (1) added `dietitian` platform **role type** (`ALLOWED_ROLETYPE_CODES.PLATFORM.DIETITIAN` + seeded in `defaultRoleTypes.ts` — camp read + appointment + inventory-request CRUD; patient/screening/test perms OMITTED, consumption deferred); (2) **geoProfile** — no model change (dietitian profile already creatable; later made `findNearest` busy-check type-aware); (3) **inventory-assignment** — assignee gate broadened to field-officer **or** dietitian (`ASSIGNABLE_ROLE_TYPE_CODES`, `assertFieldOfficer`→`assertAssignableFieldStaff`); request lifecycle already ungated (`adjustHolding`); (4) **camp** — the core: new `dietitian` Role field + a **`FieldWorker` descriptor** (`FO_WORKER`/`DIETITIAN_WORKER`) with `workerFor(type)` as the ONLY diet/screening branch; generalized the 5 FO helpers in place to be kind-blind (`isWorkerBooked`/`assertWorkerFree`/`bookedWorkerIds`/`nearestProfiles`/`resolveNearestFreeWorker`) + new `assertWorkerRole`; `set`/`create`/`update`/`moveStage`/`allocateWorker`/`bookingAvailability` all resolve the worker from `camp.type`; `dietitian` on validators/mapper/search; `allocateFo`→**`allocateWorker`**; booking-availability gained optional `type`. **Then, user-driven cleanups:** standalone types moved to `camp.types.ts` (`CampDocument`/`FieldWorker`/`CampStats`); **`PROJECT_TYPES` redefined** → `screening`/`diet`/`lab`/`teleconsultation_diet` (removed `MIXED` — `type` is an array, so mixed = multiple entries; `LEAD_PROJECT_TYPES.MIXED` left, single-value field); **camp-type-in-project validation** in `create()`/`book()` (camp `type` must be in `project.type[]`; `teleconsultation_diet` hosts no physical camp); camp **`type` made IMMUTABLE** (dropped from update payload — also kills the type-flip leftover-field edge); braces added to every `if` in camp + geoProfile `set()`. **DEFERRED: diet-camp consumption** (no diet-session/test entity; FO stock deduction is screening-only). Files: `access-management/role-type/roleType.constants.ts`, `shared/env/defaultRoleTypes.ts`, `inventory/inventory-assignment/inventory-assignment.service.ts`, `operations/camp/{model,validators,mapper,service,types,controller,routes}.ts`, `operations/geoProfile/geoProfile.service.ts`, `crm/project/{constants,validators}.ts`. Memory: [[diet-camp-dietitian]]. |
| 2026-10-04 | Backend (branch `fixes/feedback`): **new `otp` module (service-only) + screening consent rewired to it** | ✅ built, `tsc` clean, **e2e 10/10 live rs0**, **UNCOMMITTED** | Built a generic, **service-only** OTP module at `src/modules/otp/` (no routes/controller/mapper/HTTP — consumed service-to-service, NOT wired into `app.ts`/swagger/permissions by design). Fixed the scaffold's `mongoose.Scehma` typo; model = `purpose`, `channel {type(sms/whatsapp/email), value}`, optional `entity {type,relation,id}` (partial index for lookup), `code` (6-digit server-gen), `status` (pending/verified/expired/blocked, lowercase enum in constants), `expiresAt`, `attempts`, `maxAttempts`(5), `verifiedAt`. **Public surface = `OtpService.request`/`resend`/`verify`; `get`/`search`/`create`/`update` are internal RAW CRUD** (per user: CRUD does only the raw op, all business rules live in request/resend/verify). `request`: expire prior pending for target → gen code+expiry (now+TTL, default 5 min) → raw create (txn). `resend`: requires a prior OTP + `RESEND_COOLDOWN_SECONDS`(60) gap, then reuses request. `verify`: find latest pending by purpose+entity → expired(400)/out-of-attempts(429+block)/wrong(400,++attempts,block-on-last)/match(verified via raw update). `search` is internal, used by verify/resend. **Purposes centralized** in `OTP_PURPOSES` keyed by `OTP_ENTITY_TYPE` (file-module shape; each `{purpose, relation}`). Added shared `scripts/createModule.sh` fix (relative→script-relative path so modules land in the real `src/modules`; removed stray `scripts/src/`). **Screening rewired:** consent subdoc dropped `otp` (code lives in otp module now), keeps `{verified,signature}`; `create` no longer issues the OTP; new **`POST /screenings/:id/request-consent-otp`** (→`OtpService.request`, delivered to patient mobile; **TEMP returns the code** in the response until a sender exists) + **`POST /:id/verify-consent`** (→`OtpService.verify` then sets `consent.verified`), both authorize assigned-worker/manage + block when already verified. Also moved `TestDoc`/`ScreeningDoc` into their `*.types.ts` and trimmed verbose comments in test/screening/otp. e2e 10/10 on live rs0 (request→6-digit code persisted+entity-linked, wrong-code rejected+consent stays false, correct-code→consent.verified+otp verified, re-verify blocked, request-after-verified blocked). Files: `src/modules/otp/*` (constants/model/validators/service/types), `operations/screening/{model,constants,service,controller,routes}.ts`, `scripts/createModule.sh`. Memory: [[otp-module]], [[screening-module]]. **OPEN:** no delivery sender (channel recorded, nothing sends); temp code-in-response on request route; OTP `search` not exported (internal only). |
| 2026-10-04 | Backend (branch `fixes/feedback`): **employee module — dietitian support + `type` repurposed to employment type** | ✅ built, `tsc` clean, **UNCOMMITTED** (not e2e'd) | Reviewed the (previously undocumented) **`employee`** module (`src/modules/access-management/employee/`, a tenant-scoped HR registry linked 1:1 to a `user` — salary/daRule/KYC/bank/location/profile/supervisor; gated by RoleGuard on ROLE TYPE, not perms). It was **field-officer-only**; made a **dietitian** able to carry employee data (dietitian is a user — Role 1:1 User — so it fits): added `PLATFORM.DIETITIAN` to `EMPLOYEE_READ_ROLES` (read own record) and to `ownScope`'s `SELF_ONLY_ROLE_TYPES` (dietitian pinned to own record like FO). **Then corrected a mis-modeled field:** the employee `type` field held role-type-like values (`field-officer`); user clarified `type` means **employment type**, so repurposed `EMPLOYEE_TYPES` → `full-time`/`part-time`/`contractual`/`freelance` and fixed the validators (create/update/search) which **hardcoded `z.enum([FIELD_OFFICER])`** → now `z.enum(Object.values(EMPLOYEE_TYPES))` (the role distinction comes from the linked user's Role, not this field). Reverted the initial wrong `DIETITIAN`-in-`EMPLOYEE_TYPES` add. `tsc` clean. Files: `access-management/employee/{constants,validators,routes,service}.ts`. Memory: [[employee-module]]. |
| 2026-10-05 | Backend (branch `fixes/feedback`): **camp my-camps + void-camps + booking-availability device gate; MR-add-doctor; tenant report divisions count** | ✅ all built + e2e on live rs0 + **COMMITTED** | Five small user-driven features, each e2e-verified then committed. **(1) `GET /camps/my`** (`26f3f74`+`2a6cab6`, e2e 17/17) — field-force (FO/dietitian/MR) list their own camps; new `CampService.myCamps` wraps `search` (forces `report=true` → per-camp patient stats) + a top-level **`summary`** (`getMyCampSummary`: totalCamps + statusCounts + typeCounts over the caller's own-scoped set). Route `RoleGuard([FIELD_OFFICER,DIETITIAN,PHARMA_MR])`, before `/:id`. Also refactored camp **`applyOwnScope`** to scope FO→`fo`/dietitian→`dietitian`/MR→`mr` by role type (specific slot, not a 5-field `$or`); asm/rsm keep the `$or` fallback; division-head + manage branches unchanged. Mapper `toSearchResponse` passes `summary` through. **(2) MR-add-doctor** (`9cc2edc`, e2e 7/7) — new **`doctor:create`** permission (lighter than `doctor:manage`); create route now `AuthorizeMiddleware([doctor:create, doctor:manage],'OR')`; **pharma-mr role type granted `doctor:create`**. Division enforcement already existed in `create()` (customer actor forced to own `ctx.role.division`, foreign div → 403) + read own-scope by division. ⚠️ flagged: existing customer tenants are NOT re-provisioned on boot (the pharma re-sync loop in `seedSystemUser.ts` is commented out), so only NEW tenants' MR role types auto-get `doctor:create`. **(3) booking-availability device gate** (`9cc2edc`, e2e 7/7) — extracted shared `rolesHoldingAllDevices(roleIds, requiredDeviceItems)` (one batched `InventoryAssignment` read; only `status:'assigned'` units count), refactored the allocation path (`resolveNearestFreeWorker`) to use it, and **added the same gate to `bookingAvailability`** — eligible FOs now also narrowed to those holding every device the project's tests require (closes the "available at booking, rejected at allocation" gap). **(4) void-camp** (`6f28075`, e2e 13/13 + 14/14) — **`POST /camps/void-camp`** (guard `camp:manage`/`tenant:manage`): internal team records a camp done WITHOUT a PO (WF-4) — `billingType` forced `void`, lands directly in `requested` (NO auto-allocation/clash/auto-confirm), `mr`+`project` optional (model `mr` made optional; validators still require it for normal create/book). New free-form **`meta`** (Mixed) field on the camp model — optional at model level, but the void route's validator REQUIRES `meta.mailUrl` (a void camp's execution basis is a mail). New **`PATCH /camps/:id/approve-void`** (`approveVoidCamp`, guard `camp:manage`/`tenant:manage`) — void camps use ONLY `requested`→`closed`; approval moves it directly, recorded in stageHistory (approver=`actor`, time=`createdAt`, `reason`); rejects non-void (400) / non-requested (409). Mapper returns `meta`. **(5) tenant report `totalDivisions`** (`fd894df`, e2e 5/5) — `GET /tenants?report=true` per-tenant `stats` gained **`totalDivisions`** (batched `DivisionModel` aggregate in the existing `getTenantStats` `Promise.all`). All `tsc` clean; temp e2e scripts under `src/shared/env/script/` created + removed each run. Memory: [[camp-booking-availability]], [[doctor-module]], [[upcoming-camp-module]]. |
| 2026-10-08 | Backend (branch `feature/notification`): **role code auto-gen fallback** | ✅ built + e2e 7/7 live rs0, `tsc` clean, **UNCOMMITTED** | Follow-on to the tenant/division work. Role `code` was already optional + auto-generated for pharma field-force (MR/ASM/RSM) via the `phr-` counter, but **every other role type threw `"code is required"`** when omitted. User chose (AskUserQuestion) to add a **generic `rol-` counter fallback** for all non-field-force roles. Changes: added `ROLE: 'role'` to `COUNTER_ENTITY_TYPES`; exported `ROLE_COUNTER_ENTITY` from `role.constants.ts`; seeded the `role` counter (`rol-000001`); in `role.service.ts` `set()` replaced the `throwAppError('code is required')` branch with `CounterService.next(ROLE_COUNTER_ENTITY, ctx)` (runs inside the existing create txn). Supplied codes still honored; pharma keeps `phr-`; the tenant admin (`admin`), division head (`div-000001-head`) and seeded system (`system`) roles pass explicit codes → unaffected. **Key finding:** role code is never used for business matching (supervisor tree / single-admin guard / division rules all key off the role-**type** code) — only the seeded `system` role is looked up by code, and it's not created via the service — so auto-gen is safe. e2e 7/7 on live rs0 (admin=`admin`, head=`div-000001-head`, RSM-no-code=`phr-000001`, generic-no-code=`rol-000001`, counter values) with self-cleanup. Files: `counter/counter.constants.ts`, `access-management/role/{constants,service}.ts`, `shared/env/seedCounters.ts`. Memory: [[counter-module]], [[role-code-conventions]]. |
| 2026-10-08 | Backend (branch `feature/notification`): **auto-generated codes for tenant + division** | ✅ built + e2e 8/8 live rs0, `tsc` clean, **UNCOMMITTED** | Tenant & division codes were caller-supplied meaningful natural keys ("cipla"/"sun-cardio"); converted to **fully auto** via the existing `counter` module (user picked fully-auto over optional-override; prefixes `clt-` for tenant/client + `div-` for division). Changes: added `TENANT`/`DIVISION` to `COUNTER_ENTITY_TYPES` (counter model enum — boot fails without it) + exported `TENANT_COUNTER_ENTITY`/`DIVISION_COUNTER_ENTITY` constants; seeded both counters in `seedCounters.ts` (`clt-000001`/`div-000001`, padding 6); **dropped `code` from both create payloads** (+ removed now-unused `stripWhitespace` imports); each `create()` now generates the code via `CounterService.next()` inside its **existing** `withTransaction` (tenant's `createTenant`, division's create txn — rolls back on failure, no burned code) and the duplicate-code check was removed. **Derived codes shifted shape** (expected): tenant permission-group code = `clt-000001`, division-head role code = `div-000001-head`. e2e 8/8 on live rs0 (clt-000001, clt-000002 sequence, div-000001, both derived codes, counter values, uniqueness) with full self-cleanup; temp script removed. ⚠️ Seed scripts (`seedFullDemo`/`seedCampFlow`/`seedMasterData`) still pass a `code` key — Zod silently strips it (no crash) but their find-by-`code` idempotency now mismatches; **left untouched** (dev tooling, out of scope). Files: `counter/counter.constants.ts`, `access-management/tenant/{constants,validators,service}.ts`, `crm/division/{constants,validators,service}.ts`, `shared/env/seedCounters.ts`. Memory: [[counter-module]]. |
| 2026-10-04 | Backend (branch `fixes/feedback`): **project execution-mode regroup + multi-PO + file refs; user/auth `profilePicture` file ref** | ✅ built, `tsc` clean, **UNCOMMITTED** (not e2e'd) | **(A) Project execution mode** — regrouped the flat execution fields into a nested subdoc `{ mode, po:{purchaseOrders:[{number,date,expiry,file}]}, agreement:{number,startDate,endDate,duration,file}, mail:{reference,file} }`. **Now supports MULTIPLE POs** (answering "can it handle multiple POs"). Each PO/agreement/mail carries a **`file`** `ObjectId` ref → `file` module (mail/agreement `document`→`file`). Added nested populate paths (`executionMode.po.purchaseOrders.file`/`.agreement.file`/`.mail.file`). **Fixed a latent bug uncovered here:** execution mode never persisted — payload key was `mode`, service wrote top-level `entity.mode` (strict-mode dropped) + mapper read `project.mode` (always null); now payload key `executionMode`, service assigns whole subdoc, mapper returns it. ⚠️ API change (was flat `mode:{poNumber,...}`) + invoice card must read `executionMode.po.purchaseOrders[0].number`. Files: `crm/project/{model,validators,service,mapper}.ts`. **(B) User `profilePicture`** — added optional `ObjectId` ref → `file` module on the user model (alongside legacy `avatar`); wired populate + `set()` + `UpdateUserPayloadSchema` (accepts a File id) + `user.mapper` returns **both** avatar + profilePicture; **auth** too — `auth.mapper.toResponse` returns it, `auth.service.session` uses `{populate:true}`, `getUserWithPassword` populates it (login + `/auth/me` carry it). Files: `user/{model,validators,service,mapper}.ts`, `auth/{mapper,service}.ts`. Memory: [[project-module]], [[role-user-model]]. |

---

*Last updated: 2026-10-08 (branch `feature/notification`) — **role code auto-gen fallback** (follow-on to the tenant/division work): role `code` already auto-generated for pharma field-force (`phr-`), but other role types threw `"code is required"` when omitted — added a generic **`rol-`** counter fallback (user's call) so any non-field-force role auto-gets a code. Supplied codes still honored; the explicit `admin`/`div-000001-head`/`system` role codes are unaffected. Confirmed role code is never used for business matching (all matching keys off the role-**type** code), so auto-gen is safe. Added `ROLE` to `COUNTER_ENTITY_TYPES` + `seedCounters`; `role.service.ts set()` now calls `CounterService.next(ROLE_COUNTER_ENTITY)` instead of throwing. e2e 7/7 live rs0, `tsc` clean, **UNCOMMITTED**. Files: `counter/counter.constants.ts`, `access-management/role/{constants,service}.ts`, `shared/env/seedCounters.ts`. See the 2026-10-08 role-code session-log row, `backend/CLAUDE.md`, [[counter-module]]/[[role-code-conventions]]. Prior focus (same day): **auto-generated codes for tenant + division** via the existing `counter` module (user chose fully-auto over optional-override; prefixes `clt-` for tenant/client, `div-` for division). `code` dropped from both create payloads; generated with `CounterService.next()` inside each module's existing `withTransaction`; duplicate-code checks removed; added `TENANT`/`DIVISION` to `COUNTER_ENTITY_TYPES` + `seedCounters.ts`. Derived codes shifted shape (tenant perm-group `clt-000001`, division-head role `div-000001-head`). e2e 8/8 on live rs0 (sequence, derived codes, counters, uniqueness) with self-cleanup; `tsc` clean; **UNCOMMITTED**. ⚠️ seed scripts still pass a `code` key (Zod strips it; find-by-code idempotency now mismatches) — left untouched. Files: `counter/counter.constants.ts`, `access-management/tenant/{constants,validators,service}.ts`, `crm/division/{constants,validators,service}.ts`, `shared/env/seedCounters.ts`. See the 2026-10-08 session-log row, `backend/CLAUDE.md`, [[counter-module]]. Prior focus: 2026-10-05 (branch `fixes/feedback`) — five small user-driven backend features, each e2e-verified on live rs0 and **COMMITTED**: **(1)** **`GET /camps/my`** (`26f3f74`+`2a6cab6`) — field-force list their own camps; `CampService.myCamps` wraps `search` (forces per-camp patient stats) + a top-level `summary` (totalCamps + status/type counts, own-scoped); plus refactored camp `applyOwnScope` to scope FO/dietitian/MR to their specific slot (asm/rsm keep `$or`). **(2)** **MR-add-doctor** (`9cc2edc`) — new lighter `doctor:create` perm, create route accepts `[doctor:create, doctor:manage]` OR, pharma-mr granted it; division enforcement already existed (customer forced to own division). ⚠️ existing customer tenants aren't re-provisioned on boot, so only NEW tenants auto-get the perm. **(3)** **booking-availability device gate** (`9cc2edc`) — extracted shared `rolesHoldingAllDevices`, refactored the allocation path to use it, and added the same gate to `bookingAvailability` (eligible FOs now narrowed to those holding the project's required devices — closes the available-vs-allocatable gap). **(4)** **void-camp** (`6f28075`) — `POST /camps/void-camp` (internal, no lifecycle: billingType forced `void`, lands `requested`, no allocation/clash/confirm, mr+project optional, model `mr` made optional) + free-form `meta` (Mixed) field required `meta.mailUrl` on the void route + `PATCH /camps/:id/approve-void` (`approveVoidCamp`: requested→closed, camp:manage, recorded in stageHistory). **(5)** **tenant report `totalDivisions`** (`fd894df`) — `GET /tenants?report=true` per-tenant stats gained a divisions count. e2e: my-camps 17/17, MR-doctor 7/7, device-gate 7/7, void-create 13/13, void-approve 14/14, tenant-divisions 5/5. `tsc` clean. See the 2026-10-05 session-log row, `backend/CLAUDE.md`, [[camp-booking-availability]]/[[doctor-module]]/[[upcoming-camp-module]]. Prior focus: 2026-10-04 (branch `fixes/feedback`) — also this day: **(A)** regrouped project **execution mode** into a nested subdoc that now supports **multiple POs** (`executionMode.po.purchaseOrders[]`) with a **`file`** ref → file module on each PO/agreement/mail (+ nested populate), fixing a latent bug where execution mode never persisted (payload key `mode`→`executionMode`, service wrote a strict-dropped top-level `entity.mode`); **(B)** added a **`profilePicture`** file ref to the user model (alongside legacy `avatar`) and wired it through user service/validators/mapper (returns both) + the auth flow (login + `/auth/me`). `tsc` clean, UNCOMMITTED. See [[project-module]], [[role-user-model]]. Also this day: reviewed the undocumented **`employee`** module (access-management HR registry, 1:1 with a user) and (1) made a **dietitian** able to carry employee data (added dietitian to the read RoleGuard + `ownScope` self-only list — a dietitian is a user, so it fits), (2) **repurposed the `type` field to employment type** (`full-time`/`part-time`/`contractual`/`freelance`) — it was mis-holding role-type values, and the validators hardcoded `[field-officer]`; the role distinction comes from the linked user's Role, not `employee.type`. `tsc` clean, UNCOMMITTED. See [[employee-module]]. Earlier same day — built a new **service-only `otp` module** (`src/modules/otp/`, no HTTP — consumed service-to-service) and **rewired screening consent** to it. OTP public surface = `OtpService.request`/`resend`/`verify` (internal raw CRUD underneath; all business rules in the public methods); model carries `channel {type,value}` + optional `entity {type,relation,id}`; purposes centralized in `OTP_PURPOSES` (file-module shape). Screening now has `POST /:id/request-consent-otp` (TEMP returns the code — no delivery sender yet) + `POST /:id/verify-consent` (sets `consent.verified`); consent subdoc no longer stores the code. Also fixed `scripts/createModule.sh` (script-relative path) and moved `TestDoc`/`ScreeningDoc` into `*.types.ts`. `tsc` clean, **e2e 10/10 live rs0**, **UNCOMMITTED**. OPEN: no delivery sender, temp code-in-response. See the 2026-10-04 session-log row, `backend/CLAUDE.md`, [[otp-module]]/[[screening-module]]. Prior focus: 2026-10-03 (branch `fixes/feedback`) — shipped + e2e-verified (18/18 live rs0) + committed (`3a0ed2c`/`cdda34b`/`b7ed264`) **dietitian support for diet camps** (details below). **PAUSED mid-discussion: lab camps need a TECHNICIAN** (master/reference data, NOT a Role — a new registry module, manual assignment; see [[diet-camp-dietitian]]). **NEXT, paused mid-discussion: lab camps need a TECHNICIAN** — KEY insight the user gave: a technician is **master/reference data, NOT a login user**, so it must NOT be a `Role` and does NOT fit the Role-based FieldWorker/geoProfile/allocation engine. Plan = a new registry module (`src/modules/operations/technician/`, own model, like `doctor`/`patient`), camp gets a `technician` ref picked manually (lab currently defaults to FO in `workerFor` → switch to technician). Open questions the user will answer next session: technician fields, global-vs-tenant scope, technician-only vs technician+field-worker on a lab camp, manual-vs-auto assignment, lifecycle gate. See [[diet-camp-dietitian]] (OPEN/NEXT section). The context/memory edits made after commit `b7ed264` (marking e2e-verified + this resume note) are themselves uncommitted. Prior (same day) focus — built **dietitian support for diet camps**: a diet camp is now staffed by a dietitian with full field-officer parity (role type + geoProfile + inventory-assignment + new camp `dietitian` field + radius allocation). Generalized the camp allocation engine via ONE `FieldWorker` descriptor + `workerFor(type)` (the only diet/screening branch) so every helper is kind-blind — no scattered `if diet`. `allocateFo`→`allocateWorker`. Then user-driven cleanups: moved standalone camp types to `camp.types.ts`; redefined `PROJECT_TYPES` → screening/diet/lab/teleconsultation_diet (removed `mixed` — type is an array); added camp-type-must-be-in-project.type[] validation; made camp `type` immutable; braces on every `if` in camp+geoProfile `set()`. `tsc` clean, **e2e 18/18 on live rs0** (dietitian role-type seed, diet→dietitian + auto-confirm, screening→FO regression, wrong-field 400, camp-type-in-project 400/201, inventory-assignment dietitian gate), **COMMITTED** `3a0ed2c`/`cdda34b`/`b7ed264`. **Consumption DEFERRED** (no diet-session/test entity). See the 2026-10-03 session-log row, `backend/CLAUDE.md`, [[diet-camp-dietitian]]. Prior focus: 2026-10-01 (branch `fixes/feedback`, session PAUSED — resume 2026-10-02) — continued the **UI-revisions backend brief** one pointer at a time, and reconciled a NEWER frontend brief (2 new modules **Pharma Portals**/**Doctor Management** + expanded **Inventory**, tracked in memory [[ui-revisions-tracker]]). **Committed today:** `6d17659` project search ObjectId-cast bug fix, `808fcdf` project `report()` own-scope, `b4cdf1e` camp non-live-booking 409 guard, `73304b5` invoice `/invoices/report` + card subtitle/`lineItemCount`. **Uncommitted (`tsc` clean, COMMIT FIRST next session):** camp status-scoped `report()`; camp per-row patient stat (from **screening** collection); doctor per-row `stats.camps/patients/patientsCompleted` (2-hop camps→screenings); consumable `report()` FEFO expiry bands. **KEY FINDING:** actual patient/test counts are DERIVABLE from the `screening`/`test` modules — NOT missing Camp fields (brief assumed wrong) — unblocking camp-drawer/doctor/pharma patients + CRM additional-patient-billing. **Deferrals:** CRM follow-ups appointment-scope WON'T-FIX (counts not data), device calibration DEFERRED (frontend uses existing update; ledger doesn't fit), Tally deferred, FOC next, consumable `storage` parked. **Still blocked (no model):** Rx, ★ ratings, camp photos. Uncommitted files: `operations/camp/{validators,service,mapper}.ts`, `crm/doctor/{validators,service,mapper}.ts`, `inventory/inventory-consumable/{service,mapper}.ts` + docs. See `backend/UI-REVISIONS-PROGRESS.md` (⏸️ RESUME HERE 2026-10-02), the 2026-10-01 session-log row, [[ui-revisions-tracker]]. Prior focus:*
*2026-09-29 (branch `fixes/feedback`, PAUSED — resumed 2026-10-01) — working the **UI-revisions backend brief** (`backend/UI-REVISIONS-PROGRESS.md`, untracked) one pointer at a time. **CRM module backend pointers all done this session (UNCOMMITTED, `tsc` clean):** (1) lead search `code` + `focusTherapy` regex filters (no combined `q` — frontend combines), (2) follow-ups `report=true` on lead SEARCH → per-row `stats.followUps` (batched `$in:leadIds` over `AppointmentModel`, own-scoped), (3) `/leads/report` **KPI strip** — 5 tiles in the existing `$facet` (`pipelineValue`/`avgDealSize`/`wonValue`+`wonCount`/`winRate`/`salesVelocityDays`/`topRep` via roles `$lookup`; windowed tiles use the endpoint's `from`/`to` input; **Avg AI Score omitted** — no model; frontend wiring still owed). **Project Mgmt earlier this session:** `code` search (committed); client-name search **built then reverted** (→ frontend workaround); **Multi-PO deferred (big)**; **report()-vs-search() own-scope bug → LATER REFACTOR**. Uncommitted files: `crm/lead/{validators,service,mapper}.ts` + docs — **commit at next session start.** **Next: Appointments module** (largest: Weekly-planning panel needs its own model), then Camps/Invoicing/Inventory. See the 2026-09-29 session-log rows, `backend/UI-REVISIONS-PROGRESS.md` (⏸️ RESUME HERE), `backend/CLAUDE.md`. Prior focus this session:*
*2026-09-29 (branch `fixes/feedback`) — **context reconciliation, no code changes.** Confirmed all prior "uncommitted" work (fo-mapping booking-availability; the 2026-09-08 tenant gst/businessLifetime, lead fyFrom/fyTo, inventory-master maxStock removal, consumable optional expiry, geoProfile flat address) is now committed & merged onto `fixes/feedback`; a large frontend UI-redesign wave landed 2026-09-28/29 (PRs #123–#132, not tracked in this backend log). Documented today's **8 backend reporting/filter commits**: `8b3c7dc` mapper-coupling fix (all 31 `toSearchResponse` mappers no longer call `toResponse`, identical output); `8525fdd` tenant `mrs` count in `getTenantStats`; `d9d60b1` invoice `tenant` search filter (customer stays pinned); `a8c3e80` project `report=true` per-type breakdown; `3a7a002` project `report=true` per-project `stats.executedCamps` (closed+cancelled_charged vs `totalCamps`); `6f5e006` project `code` regex search; `a0b5b22` division `report=true` per-division project stats; `8da03eb` tenant `city`/`state` address regex filters. Common pattern: optional `report=true` → extra per-page aggregate returning a `stats`/`report` block. `tsc` clean. See the 2026-09-29 session-log row + `backend/CLAUDE.md` What's Done. Prior entry:*
*2026-09-14 (branch `feature/fo-mapping`) — camp **FO slot-overlap** primitives + **`/camps/booking-availability`** hardening. Extracted `SLOT_OVERLAPS`/`overlappingSlots`/`isFoBookedForSlot`/`assertFoAvailableForSlot` (daytime slots overlap, evening alone); `create`+`update` now hard-block (409) an FO already booked on an overlapping slot; `moveStage`/auto-assign unified to the same rule. booking-availability: route guard → `camp:book` only; `projectID` now validated (foreign project → 404); FO/camps lookups made NOT tenant-scoped (FOs are global platform staff — fixed 0-FO-for-MR bug); slots restricted to the project's `campTimeSlots`; response `data.dates` changed from array → **map keyed by `YYYY-MM-DD`**. A customer-tenant service guard was added then commented out by the user (effective access = camp:book route guard + project 404). **Also fixed a user-reported FO allocation-scope bug:** `POST /camps/book` ran `create()` under the pharma CUSTOMER ctx, so FO auto-allocation scoped to the customer tenant → 0 platform FOs → camp silently saved `fo:null` (+ `RoleService.get(ctx)` rejected the platform FO). Made the whole FO-allocation sub-operation GLOBAL (geo lookup `nearestFoProfilesGlobal`, FO validation via `RoleModel`+field-officer assert, clash checks dropped `ctx.where()`) while keeping pharma authz + camp ownership customer-scoped. e2e **12/12 on live rs0**, `tsc` clean; overlap/scoping/route committed (`c524866`/`1b0d406`), project-404 + slot-restriction + dates-map + allocation-scope fix uncommitted. See the 2026-09-14 session-log row, `backend/CLAUDE.md`, [[camp-booking-availability]]. Prior entry:*
*2026-09-09 (branch `feature/brands`, COMMITTED) — built the **brand module** (`src/modules/crm/brand/`, pharma brands per division). Placed in **crm** (sibling to division), not `operations/` where it was first scaffolded. tenant-scoped + **tenant DERIVED from the division**; `code` = name lowercased + all-whitespace-stripped, **derived by service, set only on create, IMMUTABLE**; **unique `{tenant,division,code}`** (same code OK in another division); create dedup **reuses `BrandService.search`** (added an exact-match `code` filter). Perms: read to sales-rep + all 4 pharma role types, manage to sales-head + both ops-managers (boot provisioner full-synced). Side effect: **removed division `brandFocus`** (all 4 layers + test doc). e2e **24/24 on live rs0** + unique index verified in Mongo, `tsc` clean, committed `fc0aadc`/`04c6cd9`/`619a2a4`. OPEN: no `E11000→409`, no live RBAC login test, frontend not wired. See the 2026-09-09 session-log row, `backend/CLAUDE.md`, [[brand-module]]. Prior entry:*
*2026-09-08 (branch `fixes/feedbacks`, all UNCOMMITTED) — a batch of small one-at-a-time backend field/filter changes, each e2e-verified on live rs0 + `tsc` clean, touching only model/validators/service/mapper (controllers+routes are schema-driven → untouched): **(1)** tenant gained optional `businessLifetime` (Number) + `gst` (**GSTIN format validated in validators ONLY**, plain String in model); **(2)** lead search gained `fyFrom`/`fyTo` date filters over `createdAt` (financial-year range, `z.coerce.date` + `fyFrom<=fyTo` refine, inclusive UTC-day bounds, before own-scope) — briefly mis-added to vendor-master then reverted; **(3)** `maxStock` REMOVED from inventory-master (all layers); **(4)** `expiryDate` made OPTIONAL on inventory-consumable (⚠️ null-expiry sorts first in FEFO). Earlier in the same session: **flat address on geoProfile** (below) and a context reconciliation (now on `fixes/feedbacks`; the prior `feature/address` work — vendor-master/doctor-bulk/tenant-address — is committed & merged; new `65a1508` camp-location refactor + empty `src/modules/location/` scaffold). See the two 2026-09-08 session-log rows, `backend/CLAUDE.md`, [[vendor-master-module]]/[[upcoming-inventory-devices]]/[[geoprofile-module]]. Prior detail:*
*2026-09-08 (branch `fixes/feedbacks`) — added a **flat address to geoProfile** (`addressLine1`/`addressLine2`/`locality`/`city`/`state`/`country` default India/`pincode`/`googlePlaceId`, all optional). Spread **FLAT onto the model, NOT nested** like tenant's — because tenant's address subschema carries its own `coordinates`+`2dsphere`, and a second 2dsphere index would break geoProfile's `$geoNear`/`findNearest` allocation; flat reuses the existing top-level `coordinates` as the address geo point (single geo index). Only model/validators/service/mapper touched (controller+routes are schema-driven → no change). `tsc` clean, e2e **13/13 on live rs0** (incl. findNearest still works). **UNCOMMITTED.** Also reconciled context: now on `fixes/feedbacks`; the prior `feature/address` work (vendor-master, doctor bulk, tenant address) is now **committed & merged**; new `65a1508` camp-location refactor + empty `src/modules/location/` scaffold. See the 2026-09-08 session-log row, `backend/CLAUDE.md`, [[geoprofile-module]]. Prior entry:*
*2026-09-03 (branch `feature/address`) — three backend pieces, all e2e-verified on live rs0, `tsc` clean (then uncommitted, now committed): (1) **vendor-master** module — global + **platform-only** vendor/supplier registry (every endpoint incl. reads permission-guarded; customer 403s), `code` uppercase natural key, `contacts[]` array, optional embedded address (optional coordinates), `vendor-master:manage` granted to `inventory-manager`; (2) **vendor ref on stock** — inventory-device + inventory-consumable now carry a REQUIRED immutable `vendor`→VendorMaster (validated/populated/searchable; ⚠️ breaks legacy stock docs); (3) **doctor bulk CSV upload** `POST /doctors/bulk` (guarded only by `doctor:manage`, mirrors MR bulk) with two doctor-only improvements over MR — in-file pharmaCode dedup + `create()` E11000→clean 409 (race-safe). Reviewed doctor: flagged stale "global" text + flat-address-not-embedded (not migrated). See the 2026-09-03 session-log row, `backend/CLAUDE.md`, [[vendor-master-module]]/[[doctor-module]]/[[upcoming-inventory-devices]]. Prior entry:*
*2026-08-31 (branch `feature/test`) — built the **`test`** module (per-screening results + **FO stock deduction**: on create, in one txn the test is saved and the camp's assigned FO has stock drawn down per `TestMaster.consumption` — catalog `InventoryMaster` bridged to the FO's `InventoryConsumable` lots, exact `rate` subtracted across `InventoryAssignment` holdings; short stock → 409 + rollback; devices rate 0 skipped). Same session follow-ons: granted the **field-officer** role type the missing `screening:get/search` + `test:get/search` + `patient:get/search/update` perms (reads are locked); added required **`screening.performedBy`** (= `camp.fo`); **test create blocked once the camp is closed/cancelled** (409); **read own-scope by `performedBy`** on screening + a manage-gated `performedBy` filter (mirrors test), with `applyOwnScope` moved up-front in both search methods. Completes the camp-day flow: camp live → patient → screening → consent OTP → complete → **test (deducts stock)**. e2e-verified on live rs0 (19/19 flow + 8/8 real-FO own-scope + closed-camp checks), `tsc` clean, **uncommitted**. See the 2026-08-31 session-log row, `backend/CLAUDE.md`, and [[test-module]]/[[screening-module]]. Prior entry:*
*2026-08-30 (branch `feature/test`) — camp-day operations: hardened **testMaster** (config validator mirrors model, counter-generated `tst-` code, reads locked) and built two new global/tenant modules — **patient** (global registry, `pat-` code, optional sparse-unique email, soft-delete; create→FO+camp-coords) and **screening** (tenant-from-camp, stageHistory+moveStage, consent OTP via new `OtpHandler`, live-camp gate, assigned-FO-only create/mutate; refactored to reuse `CampService.get`+`ScreeningService.search` via `loadCampForAction`). All e2e-verified on live rs0 and committed (`3aa7804`/`ccc6377`/`58f9d8d`). See the 2026-08-30 session-log row, `backend/CLAUDE.md`, and [[test-master-module]]/[[patient-module]]/[[screening-module]]/[[otp-handler]]. Prior entry:*
*2026-08-21 (branch `fixes/camp-flow`) — built the **finance domain**: `invoice` + `invoiceLineItem` (camp-to-cash). Invoice-create takes `camps:[id]`; line items DRIVE the invoice subtotal/total; line amount snapshots project `campCost`; line item is a nested resource with no tenant (scoped via parent, no unique index); a camp is billable only if `billable` + `closed`/`cancelled_charged` + not on a non-cancelled invoice (cancel frees it); `syncToTally` flag added; new **`finance-manager`** role type. e2e-verified on live rs0, **uncommitted**. OPEN: `cancelled_charged` should probably bill the cancellation-charge % not full campCost; "billable unbilled camps" picker; real Tally push. See the 2026-08-21 session-log row, `backend/CLAUDE.md`, and [[finance-invoice-module]].)*
*Update this file at the end of every session.*
