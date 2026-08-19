# QMS Backend — Complete System Analysis

> **Purpose:** Reverse-engineered reference for a new developer joining the QMS backend.
> Read this to understand *how the system works* before opening individual files.
>
> **Analysis date:** 2026-08-14 · **Branch:** `test` · **Scope:** `backend/` only · **No code was modified.**

---

## ⚠️ Read this first — documentation drift

Two framing notes before anything else:

1. **The backend is larger than the root `CLAUDE.md` describes.** 17 modules are wired, including an
   `inventory` domain that root docs still call "Phase 2". `backend/CLAUDE.md` is much closer to
   reality, but even it predates the inventory work.
2. **Root `CLAUDE.md` §5a describes auth bugs that no longer exist in the code.** The hardcoded CORS
   origin and `sameSite: 'strict'` were both fixed. Treat §5a as history, not current state.

Throughout this document, findings are labelled:
- **Confirmed from code** — verified by reading the implementation
- **Inferred** — reasonable deduction, not directly stated
- **NOT FOUND** — searched for, does not exist
- **⚠️ POTENTIAL CONCERN** — flagged for the team, not a recommendation to change

---

## Table of Contents

**Phase 1 — System Understanding**
1. [Project Purpose](#1-project-purpose)
2. [Folder Architecture](#2-folder-architecture)
3. [Application Startup Flow](#3-application-startup-flow)
4. [API Request Lifecycle](#4-api-request-lifecycle--traced)
5. [API Architecture](#5-api-architecture)
6. [Database Architecture](#6-database-architecture)
7. [Multi-Tenancy](#7-multi-tenancy-) ⭐
8. [Authentication](#8-authentication)
9. [Authorization / RBAC](#9--10-authorization--rbac-) ⭐
10. [Role + Permission Flow](#11-complete-role--permission-flow)
11. [Security Architecture](#12-security-architecture--what-is-actually-there)
12. [Error Handling](#13-error-handling)
13. [External Services](#14-external-services--integrations)
14. [Background Jobs](#15-background-jobs--async-processing)
15. [Configuration](#16-configuration)
16. [Logging / Monitoring](#17-logging--monitoring)

**Phase 2** — [Feature Map](#phase-2--feature-map)
**Phase 3** — [Core API Flow Map](#phase-3--core-api-flow-map)
**Phase 4** — [Architecture Diagram](#phase-4--architecture-diagram)
**Phase 5** — [File Responsibility Map](#phase-5--file-responsibility-map)
**Phase 6** — [Read These First](#phase-6--read-these-first-ordered)
**Phase 7** — [What to Learn](#phase-7--what-to-learn-before-developing)
**Phase 8** — [Risks / Complex Areas](#phase-8--risky--complex-areas)
**Final** — [Summary A–J](#final-summary) · [Open Questions](#open-questions-for-the-team)

---

# PHASE 1 — SYSTEM UNDERSTANDING

## 1. Project Purpose

**Confirmed from code.** QMS is a B2B healthcare-operations platform. Pharma companies (customers)
hire QMS (the platform operator) to run medical screening/diet camps at doctor clinics. The backend
manages the full commercial + operational lifecycle:

```
Lead → Project (PO/Agreement) → Camp booking → FO allocation → Camp execution
```

### Business domains (= `src/modules/` folders)

| Domain | Modules | What it does |
|---|---|---|
| `access-management` | tenant, role, role-type, permission-group | Multi-tenancy + RBAC |
| `crm` | lead, project, division, contact, appointment | Sales pipeline |
| `operations` | camp, geoProfile | Camp execution + geo-based field-officer allocation |
| `inventory` | inventory-master (+3 stubs) | Device/consumable catalogue |
| standalone | auth, user, doctor, counter, qa-feedback | Cross-cutting |

### Actor types

The code has **two tenant types** and **14 role-type codes** (`roleType.constants.ts`):

**Platform (QMS internal):**
`system` · `admin` · `sales-rep` · `sales-head` · `camp-coordinator-screening` ·
`camp-coordinator-diet` · `operation-manager-screening` · `operation-manager-diet` · `field-officer`

**Customer (pharma):**
`pharma-division-head` · `pharma-rsm` · `pharma-asm` · `pharma-mr`

> ⚠️ **Important:** the frontend's 18-value `UserRole` enum shares **zero string matches** with these.
> The backend is permission-code-based; the frontend is still role-name-based. That gap is known and
> deferred (see root `CLAUDE.md` §5a "locked decision").

---

## 2. Folder Architecture

**Confirmed.** There is **no repository layer** and **no separate top-level routes/controllers/models
folders**. It is vertical-slice by module.

```
backend/src/
├── bin/
│   ├── server.ts          ← process entry: connect DB → seed → listen
│   └── app.ts             ← Express app: middleware + all route mounts
├── modules/<domain>/<module>/
│   ├── *.constants.ts     ← string enums + this module's *_PERMISSIONS
│   ├── *.validators.ts    ← Zod schemas (+ inferred TS types)
│   ├── *.model.ts         ← Mongoose schema/model  ← THE data layer
│   ├── *.service.ts       ← ALL business logic + all DB queries
│   ├── *.controller.ts    ← HTTP only: validate → service → respond
│   ├── *.mapper.ts        ← Mongoose doc → API response shape
│   └── *.routes.ts        ← Router + middleware + Swagger registration
└── shared/
    ├── config/            app.config.ts (ENV), connectDB.ts, swagger/, axios/
    ├── env/               permissions registry + boot seeders
    ├── middlewares/       authmiddleware, authorizeMiddleware, rateLimiter, upload/
    ├── helpers/           tokenHelper, transactionHelper, csvHelper, expiryHelper
    ├── utils/             contextBuilder, error, responseHandler, requestHandler,
    │                      cookies, dates, strings, batchProcessor, logger(shim)
    ├── logger/            pino + pino-http + redaction + serializers + transport
    ├── providers/         jira/
    └── types/             service.types, permission.types
```

### Actual verified request architecture

```
Request
 → express.json → cookieParser → CORS → rateLimiter
 → httpLogger (pino-http, assigns req.id)
 → buildContext  (creates req.context — ALWAYS runs, even unauthenticated)
 → Router
 → AuthMiddleware       (per-router .use(), except /auth)
 → AuthorizeMiddleware  (per-route permission guard)
 → Controller  (Zod .safeParse → call service)
 → Service     (business rules + ctx.where() scoping + Mongoose)
 → MongoDB
 → Mapper      (strip doc → response shape)
 → ResponseHandler.appResponse  → JSON
```

No repository layer — **services talk to Mongoose models directly**, and services call other services
(e.g. `CampService → GeoProfileService`, `RoleService → UserService`).

---

## 3. Application Startup Flow

**Confirmed, in exact order:**

```
npm run dev                                    package.json → tsx watch src/bin/server.ts
  │
  ├─ import ./app  ──────────────────────────► src/bin/app.ts executes at import time:
  │                                              • app.set('trust proxy', 1)   ← Railway
  │                                              • app.set('etag', false)      ← force fresh 200s
  │                                              • express.json(), cookieParser()
  │                                              • cors() with ENV.App.CorsOrigins allowlist
  │                                              • /api-docs (swagger — imports EVERY routes file
  │                                                as a side effect via swagger.config.ts)
  │                                              • globalRateLimiter on /api/v1
  │                                              • httpLogger → buildContext
  │                                              • 17 app.use('/api/v1/x', XRouter)
  │                                              • GET /health-check
  │
  └─ main()  (src/bin/server.ts)
       1. await connectDB()      shared/config/connectDB.ts
                                 • mongoose.set('transactionAsyncLocalStorage', true)  ← critical
                                 • mongoose.connect(ENV.DB.URI); exits process on failure
       2. await runSeed()        shared/env/index.ts
            ├─ seedSystemUser()  Model.init() ×5, then ONE transaction:
            │    tenant(qms,platform) → permissionGroup → roleTypes(system, admin)
            │    → provisionDefaultRoleTypes(CRM + OPERATION types)
            │    → users(system, admin) → roles(system, admin) → tenant.owner
            └─ seedCounters()    ld- / prj- / cmp- / mtg- sequences
       3. app.listen(ENV.App.Port)
```

### Three things to internalise

- Seeding runs **inside a MongoDB transaction** → the DB **must be a replica set**. A standalone
  `mongod` fails to boot the app. (Root `CLAUDE.md` notes this as a known local-dev blocker — still true.)
- `provisionDefaultRoleTypes` does a **full sync** of seeded role-type permissions on every boot
  (adds *and removes*). Editing `defaultRoleTypes.ts` changes live permissions on next restart.
- **NOT FOUND:** no background jobs, no workers, no cron, no queue, no Redis.

---

## 4. API Request Lifecycle — traced

### Trace A: `POST /api/v1/auth/login` (unauthenticated)

```
Client
  │  { email, password }   credentials: 'include'
  ▼
express.json → cookieParser → CORS allowlist (ENV.App.CorsOrigins)
  ▼
globalRateLimiter (100/min/IP) → authRateLimiter (10/min/IP)   shared/middlewares/rateLimiter.ts
  ▼
httpLogger  → req.id            shared/logger/httpLogger.ts
buildContext → req.context      shared/utils/contextBuilder.ts   (user/role/tenant all null here)
  ▼
AuthRouter  (NO AuthMiddleware on /login)
  ▼
AuthController.login            auth.controller.ts
  │  LoginUserPayloadSchema.safeParse(req.body)
  │  fail → 400 { fields: {...} } via formatZodError
  ▼
AuthService.login(data, ctx)    auth.service.ts
  1  UserService.getUserWithPassword(email)   .select('+password')
     └ not found → 401 'Invalid credentials'  (deliberately generic — no user enumeration)
  2  user.status !== 'active' → 403
  3  lockUntil > now → 403 with remaining minutes
  4  bcrypt.compare → fail: loginAttempts++; at 5 → lockUntil = now+10min → 403
  5  RoleModel.findOne({user}).populate(['tenant','type'])
     └ no role → 403
  6  ACTIVE-CHAIN GATE: tenant.status, type.status, role.status,
     PermissionGroupModel.findOne({tenant}).status — any inactive → 403
  7  TokenHandler.generateAccessToken/RefreshToken
        payload = { _id, email, firstName, lastName, role: <roleId>, tenant: <tenantId> }
  8  user.refreshToken = refreshToken; user.save()     ← single-session storage
  ▼
CookieHandler.setAccessToken / setRefreshToken     shared/utils/cookies.ts
  httpOnly:true, secure:isProd, sameSite: isProd ? 'none' : 'lax'
  ▼
ResponseHandler.appResponse(res, 200, true, msg, AuthMapper.toResponse(user))
  → { success, message, data: { id, email, firstName, lastName, avatar } }
```

> ⚠️ Login's response body carries **no role/permissions**. The frontend must call `GET /auth/me`.

### Trace B: `POST /api/v1/camps` (the richest authenticated flow)

```
Client  { tenant, division, project?, doctor, date, timeSlot, city, state, coordinates }
  ▼
globalRateLimiter → httpLogger → buildContext
  ▼
CampRouter.use(AuthMiddleware)                shared/middlewares/authmiddleware.ts
  1  read req.cookies.accessToken → 401 if absent
  2  TokenHandler.verifyAccessToken → JWT payload
  3  RoleModel.findById(payload.role).populate(['tenant','type'])     ← DB hit #1
  4  re-check active chain: tenant / type / role status
  5  PermissionGroupModel.findOne({tenant})  active?                  ← DB hit #2
  6  ctx.setUser / setRole / setTenant
  7  permissions = role.type.permissions ∪ role.permissions
     filtered against PERMISSIONS_ARRAY, de-duped → ctx.setPermissions()
  ▼
AuthorizeMiddleware([camp:create, camp:manage, tenant:manage], 'OR')
  → ctx.hasAnyPermissions()  — system:manage short-circuits to TRUE always
  ▼
CampController.create → CreateCampPayloadSchema.safeParse
  ▼
CampService.create(model, ctx)                operations/camp/camp.service.ts
  1  DivisionService.get(model.division, ctx)     → 404
  2  division.tenant === model.tenant             → 400 (coherence, not ctx)
  3  optional ProjectService.get → project's division wins
  4  new CampModel({ tenant: division.tenant, division, project })
  5  set(): DoctorService.get, RoleService.get ×4 (fo/mr/asm/rsm), slot, coords
  6  if no fo → resolveNearestFreeFoRole():
       GeoProfileService.findNearest({type:'fo', lng, lat})
         └ $geoNear (spherical, maxDistance=GEO_ALLOCATION_MAX_DISTANCE)
           + $match distance <= per-profile coverageRadius
       → 422 if no coverage
       bookedFoRoleIdsOnDate() — camps CONFIRMED|LIVE on same UTC day
       → 409 if all nearby FOs booked
  7  withTransaction():                        ← $geoNear stays OUTSIDE (Mongo forbids it in txn)
       code = CounterService.next('camp')  → atomic $inc → 'cmp-000123'
       camp.save()
  ▼
CampMapper.toResponse → 201
```

**Error handling at every step:** `throwAppError(msg, status)` throws `AppError`; the **controller's
own `try/catch`** converts it. There is **no global Express error middleware** (verified by grep) —
see [§13](#13-error-handling).

---

## 5. API Architecture

**Confirmed conventions:**

| Aspect | Implementation |
|---|---|
| Routes | One `Router` per module, mounted in `app.ts`. `Router.use(AuthMiddleware)` router-wide (except `/auth`, and `/users` which applies it per-route) |
| REST shape | `GET /` search · `GET /:id` get · `POST /` create · `PUT /:id` update · `PATCH /:id/stage` moveStage · plus verbs: `POST /camps/:id/allocate`, `PATCH /appointments/:id/rsvp`, `POST /divisions/bulk-mr` |
| **No DELETE anywhere** | Nothing is deleted. Status flips to `inactive` — de-facto soft delete |
| Validation | Zod `.safeParse()` in the controller only; `formatZodError` → `400 { data: { fields: {field: msg} } }` |
| Response | Always `ResponseHandler.appResponse` → `{ success, message, data }` |
| Pagination | `RequestHandler.getPagination(filters)` → `{page, limit, skip}`; services use `.limit().skip()`; `search()` returns `{count, items}`; mappers emit `toSearchResponse` |
| Filtering/Search | Per-service `if (filters.x)` blocks; text fields use `$regex/$options:'i'` (**no text indexes — unindexed regex scans**) |
| Sorting | Hardcoded per service (`{createdAt:-1}`, `{updatedAt:-1}`, `{date:-1}`) — not client-controllable |
| File upload | `multer` memoryStorage, 10MB, mimetype allowlist → `csvUploader.single('file')` on `POST /divisions/bulk-mr` only |
| Transactions | `withTransaction` (AsyncLocalStorage + `transactionAsyncLocalStorage`) — session auto-attaches, never threaded manually |
| External calls | Jira only, via `axiosInstance` |

### How to add a new API

From `backend/CLAUDE.md`, matches the code:

1. Create `src/modules/<domain>/<name>/` with all 7 files
2. Define `<NAME>_PERMISSIONS` in constants
3. Register them in `shared/env/permissions.ts` → `PERMISSIONS`
4. `app.use('/api/v1/<name>', <Name>Router)` in `bin/app.ts`
5. Side-effect import the routes file in `swagger.config.ts`
6. In the service: **start every scoped read from `ctx.where()`**

---

## 6. Database Architecture

**Technology:** MongoDB via Mongoose 9. **No migrations framework** — schema changes are implicit;
only boot seeders exist.

### Entity map

```
                        ┌──────────┐
                        │  Tenant  │  type: platform | customer
                        │  code ∪  │  owner→Role, salesPerson→Role(sales-rep)
                        └────┬─────┘
        ┌────────────────────┼──────────────────────┬──────────────────┐
        ▼                    ▼                      ▼                  ▼
┌────────────────┐   ┌──────────────┐        ┌───────────┐     ┌────────────┐
│PermissionGroup │   │   RoleType   │        │ Division  │     │  Contact   │
│ = tenant's     │   │ permissions[]│        │ therapy[] │     │ tenant+div │
│   permission   │   │ isSystem     │        │ owner→Role│     │ user?→User │
│   CEILING      │   │∪(tenant,code)│        │∪(tenant,code)   └────────────┘
└────────────────┘   └──────┬───────┘        └─────┬─────┘
                            │ type                  │
                     ┌──────▼───────────────────────▼──┐
                     │             Role                │  ∪ (tenant, code)
                     │ user→User (1:1) │ tenant │ type │
                     │ division? │ supervisor?→Role    │◄── self-ref org tree
                     │ permissions[]  ← OVERRIDE only  │
                     └──────┬──────────────────────────┘
                            │ user (1:1)
                     ┌──────▼──────────────────────────────────┐
                     │    User                                 │
                     │ email ∪ global · password select:false   │
                     │ refreshToken · loginAttempts · lockUntil │
                     └─────────────────────────────────────────┘

CRM pipeline:   Lead ──1:1──► Project ──►(optional) Camp
                 │              │                     │
   tenant+division from Division; salesPerson→Role    ├─ doctor→Doctor (GLOBAL registry)
   code from Counter (ld-/prj-/cmp-/mtg-)             ├─ fo/mr/asm/rsm →Role
                                                      └─ coordinates [lng,lat] 2dsphere

Appointment: tenant+division · salesPerson→Role · contactPerson→Contact
             parent→Appointment (follow-ups) · internalMembers[]→Role (RSVP)

GeoProfile:  role→Role (UNIQUE 1:1) · coordinates 2dsphere · coverageRadius (meters)
Counter:     global · entity ∪ · atomic $inc
Doctor:      GLOBAL · pharmaCode ∪ · email ∪    ← intentionally NOT tenant-scoped
QaFeedback:  reportedBy→User                    ← intentionally NOT tenant-scoped
InventoryMaster: code ∪                         ← global catalogue, no tenant field
```

### Indexes (confirmed)

- `Tenant.code` unique · `User.email` unique · `PermissionGroup.code` unique
- `Role {tenant, code}` unique · `RoleType {tenant, code}` unique · `Division {tenant, code}` unique
- `Contact {tenant, email}` unique **partial** (`email: {$type:'string'}`) — nulls don't collide
- `Lead.code`, `Project.code`, `Camp.code` unique **globally**
- `GeoProfile.role` unique · `Counter.entity` unique
- `2dsphere` on `Camp.coordinates` and `GeoProfile.coordinates`
- Single-field indexes on `tenant` for Division/Lead/Project/Contact

### Audit fields

- `{ timestamps: true }` on every schema **except `Role`** (Role has no timestamps — a real inconsistency).
- **No `createdBy`/`updatedBy`/`version` fields** despite root `CLAUDE.md` §6 claiming them. The
  409-on-version-mismatch convention documented there is **NOT implemented**.
- The real audit mechanism is the **append-only `stageHistory[]`** on Lead / Project / Camp /
  Appointment: `{from, to, reason (required), actor: {roleId, name, email} frozen snapshot, timestamps}`.
  `moveStage` is the *only* path that changes status.
- **NOT FOUND:** no `audit_log` collection, no `app_config` rules-engine collection. Root
  `CLAUDE.md` §10's "all business rules in `app_config`" is **not implemented** — rules like the
  10-min lockout and 35km radius are hardcoded or schema-defaulted.

### Entity lifecycle example — Camp

| | |
|---|---|
| Created by | `camp:create`/`manage`/`tenant:manage` — coordinators, ops managers, pharma bookers |
| Read by | Anyone with `camp:search`+`get`; a *search-only* actor sees only camps where they are `fo`/`mr`/`asm`/`rsm` (`applyOwnScope`) |
| Updated by | `camp:update`/`manage`; `fo` + `date` **frozen** once status leaves `requested` |
| Status changed by | `PATCH /camps/:id/stage` only, validated against `CAMP_TRANSITION_MAP` |
| Deleted by | Nobody — cancellation is a status |
| APIs | `POST/GET/PUT /camps`, `PATCH /camps/:id/stage`, `POST /camps/:id/allocate` |

---

## 7. Multi-Tenancy ⭐

**Yes — shared-database, shared-collection, discriminator-column multi-tenancy.**

### What a tenant is

A `Tenant` document with `type: 'platform' | 'customer'`. `platform` = QMS itself (seeded as code
`qms`). `customer` = a pharma client. Every business collection carries a `tenant` ObjectId.

### How the current tenant is identified — confirmed

**From the JWT, indirectly via the Role.** Not from a header, subdomain, or URL.

```
login → JWT payload contains { role: <roleId>, tenant: <tenantId> }
        stored in httpOnly `accessToken` cookie
   ▼
AuthMiddleware (every protected request)
   • verify JWT
   • RoleModel.findById(payload.role).populate(['tenant','type'])   ← DB lookup, NOT the JWT claim
   • ctx.setTenant(userRole.tenant)     ← tenant comes from the ROLE DOCUMENT
```

> ⚠️ **Subtle but important:** the `tenant` claim in the JWT is **never trusted** — the tenant is
> re-resolved from the DB role on every request. A forged/stale tenant claim has no effect.
> Good design.

### Where tenant context lives

`req.context` (`shared/utils/contextBuilder.ts`), created fresh per request by `buildContext`. No
AsyncLocalStorage for context (only for DB sessions). It is **explicitly threaded**: every controller
does `const ctx = req.context` and passes `ctx` into every service call.

### How isolation is enforced — `ctx.where()`

```typescript
where() {
    switch (this.tenant.type) {
        case PLATFORM:  break;                        // {} — NO FILTER (god-mode)
        case CUSTOMER:  scope.tenant = this.tenant._id;
        default:        throwAppError('Invalid tenant type', 500);
    }
    return scope;
}
```

**Filtering is MANUAL, not automatic.** There is no Mongoose plugin or query middleware. Every
service must remember to start from `ctx.where()`. **This is the single most important thing to know
before writing backend code here.**

### Full tenant-aware flow

```
Login → Role lookup → JWT(role,tenant) → httpOnly cookie
   ▼
Request + cookie
   ▼
AuthMiddleware → RoleModel.findById().populate('tenant') → ctx.tenant
   ▼
Controller → ctx passed to Service
   ▼
Service:  const where = ctx.where()   // {tenant: X} or {}
          where._id = id
          Model.findOne(where)
   ▼
MongoDB → only that tenant's docs (or all, for platform)
```

### Deliberate design decisions (not bugs)

- **Platform tenants see everything.** A QMS sales rep must see all pharma clients' leads.
  `ctx.where()` returning `{}` for platform is intentional and documented.
- **Coherence checks compare `entity.tenant`, not `ctx.tenant`** — so even a god-mode actor can't
  link a Division from tenant A to a Lead in tenant B.
- `Doctor`, `Counter`, `InventoryMaster`, `QaFeedback` are **intentionally global**.

### ⚠️ Isolation gaps — POTENTIAL CONCERN, verify before relying

These `get()` functions do **not** call `ctx.where()`, so a lookup by id/code crosses tenants:

| Service | `get()` scoping |
|---|---|
| `TenantService.get` | `where = {}` — any authenticated user can fetch any tenant by id/code |
| `DivisionService.get` | `findById(id)` — unscoped |
| `PermissionGroupService.get` | `findOne({_id})` — unscoped |
| `UserService` (`get` **and** `search`) | **no tenant scoping at all** — `GET /users` with `user:search` returns users across every tenant |
| `Doctor`, `Counter`, `InventoryMaster` | unscoped **by design** |

**Concrete consequence worth checking:** `LeadService.create` does
`DivisionService.get(model.division, ctx)` (unscoped) then asserts `division.tenant === model.tenant`.
A customer actor could therefore *create* a lead attached to another tenant's division — though they
couldn't *read* it back, since `LeadService.get/search` are properly scoped.
**Write-side leak, read-side sealed.**

Also: `ctx.where()` dereferences `this.tenant.type` — it would throw on an unauthenticated request.
Currently unreachable because every `ctx.where()` caller sits behind `AuthMiddleware`.

---

## 8. Authentication

**Mechanism:** JWT in **httpOnly cookies** (not `Authorization: Bearer` — root `CLAUDE.md` §7 saying
"Bearer" is **stale**; `AuthMiddleware` reads `req.cookies.accessToken`).

| Feature | Status | Where |
|---|---|---|
| Login | ✅ | `POST /auth/login` |
| Registration | ⚠️ **Disabled** — route + Swagger commented out | `auth.routes.ts:144-149` |
| Password hashing | ✅ bcrypt, salt rounds 10 | `auth.service`, `user.service` |
| Access token | ✅ 15 min (`JWT_ACCESS_EXPIRY_SEC`) | `tokenHelper.ts` |
| Refresh token | ✅ 7 days, **rotated** on every refresh, stored on `user.refreshToken` | `auth.service.refreshToken` |
| Logout | ✅ clears DB `refreshToken` **then** cookies | `auth.controller.logout` |
| Token revocation | ⚠️ Partial — single-string field ⇒ **one session per user**; logging in elsewhere silently kills the previous session. No blacklist for the 15-min access token |
| Account lockout | ✅ 5 fails → 10 min (hardcoded constants) | `auth.service.ts:16-17` |
| Self password change | ✅ verifies current, rejects reuse | `POST /auth/reset-password` |
| Admin password reset | ✅ `tenant:admin`, tenant-scoped via `RoleService.search`, nulls target's refreshToken | `POST /auth/forgot-password` |
| Email/OTP verification | ❌ NOT FOUND | |
| MFA | ❌ NOT FOUND | |
| Forgot-password *email* flow | ❌ NOT FOUND — the "forgot" endpoint is admin-driven; no email is sent, no SES/SMTP anywhere | |

### Authenticated request

```
cookie accessToken
  ▼ AuthMiddleware
verifyAccessToken → payload{_id,email,role,tenant}
  ▼
RoleModel.findById(role).populate(tenant,type)      ← 2 DB queries
PermissionGroupModel.findOne({tenant})                 per request,
  ▼                                                    no caching
ctx.setUser / setRole / setTenant / setPermissions
  ▼ AuthorizeMiddleware → Controller
```

---

## 9 & 10. Authorization / RBAC ⭐

**Yes, RBAC — permission-code based, database-driven, with a two-layer grant model and a tenant-level
ceiling.**

### The model

```
        User  ──1:1──►  Role  ──►  RoleType  ──► permissions[]  (PRIMARY grant)
                          │
                          └──────────────────► permissions[]  (OVERRIDE / temp grants)
                          │
                          ├── tenant  ──► PermissionGroup.permissions[]  (CEILING)
                          ├── division   (optional org placement)
                          └── supervisor (self-ref org tree)

effective = (RoleType.permissions ∪ Role.permissions) ∩ PERMISSIONS_ARRAY
```

### Where each piece lives

- Permission **codes** are defined in code (`<module>.constants.ts` → `X_PERMISSIONS`), aggregated in
  `shared/env/permissions.ts` into `PERMISSIONS` / `PERMISSIONS_ARRAY`.
  Shape: `resource:verb` — `create|get|search|update|manage` (+ `tenant:admin`, `system:manage`,
  `appointment:rsvp`).
- Permission **assignments** are in the DB (`RoleType.permissions[]`, `Role.permissions[]`).
- So: **codes hardcoded, grants database-driven.** Removing a code from `PERMISSIONS_ARRAY` makes it
  instantly inert everywhere — `AuthMiddleware` filters against the registry.

### Key facts

| Question | Answer |
|---|---|
| Can a user have multiple roles? | ❌ **No.** `Role.user` is 1:1 (`RoleModel.findOne({user})` at login). One user = one role = one tenant |
| Are roles tenant-specific? | ✅ **Yes.** `Role` and `RoleType` are unique per `{tenant, code}`, so every tenant has its own `admin` |
| Can permissions be overridden? | ✅ **Additively**, via `Role.permissions[]`, subject to two guards (below) |
| Permission inheritance? | Only the RoleType → Role union. No hierarchical/nested permission inheritance |

**Two guards in `role.service.ts`:**
- `ROLE_FORBIDDEN_PERMISSIONS` denylist — a Role may **never** directly hold `tenant:admin`,
  `tenant:manage`, `system:manage`. No bypass, even for system.
- The actor's tenant `PermissionGroup` is the **ceiling** — you can't grant what your tenant doesn't
  have. `system:manage` bypasses this ceiling only.

### The check itself

```typescript
// shared/middlewares/authorizeMiddleware.ts
AuthorizeMiddleware(codes: string[], type: 'AND' | 'OR' = 'OR')
  → ctx.hasAllPermissions(codes) | ctx.hasAnyPermissions(codes)
  → fail: throwAppError('Forbidden: Insufficient permissions', 403)
```

> ⚠️ **The single most important RBAC fact:** both `hasAny` and `hasAll` begin with
> ```typescript
> if (req.context.permissions.includes(PERMISSIONS.SYSTEM.MANAGE.code)) return true;
> ```
> `system:manage` is an **unconditional skeleton key** — it passes every guard AND gets an unscoped
> `ctx.where()`. It is deliberate, documented, and held only by the seeded `system` role.

### Second-layer authorization inside services

Routes are coarse; services add row-level narrowing:

```typescript
// lead.service.ts — a rep with search-but-not-manage sees only their own leads
if (ctx.hasAnyPermissions([LEAD_PERMISSIONS.SEARCH.code]) &&
   !ctx.hasAnyPermissions([LEAD_PERMISSIONS.MANAGE.code])) {
    where.salesPerson = ctx.role?._id;
}
```

Same pattern in `project.service` (`salesRep`), `camp.service` + `appointment.service`
(`applyOwnScope` over `fo/mr/asm/rsm`). Also **field-level**: `user.service.set` only honours
`status` with `user:manage`; `tenant.service.set` only honours `status` with `tenant:manage`.

### Three real API examples

| API | Route guard | Service-level check |
|---|---|---|
| `GET /api/v1/leads` | `AuthorizeMiddleware(READ_GUARD)` — lead:search/get/manage OR tenant:manage | `ctx.where()` tenant filter **+** own-leads-only if search-without-manage |
| `POST /api/v1/roles` | `AuthorizeMiddleware([tenant:admin, tenant:manage])` (OR) | role-type must match tenant; single-admin-per-tenant 409; forbidden-permission denylist; PermissionGroup ceiling; supervisor-tree validation; division required on customer tenants |
| `POST /api/v1/camps/:id/allocate` | `AuthorizeMiddleware([camp:update, camp:manage, tenant:manage])` | `CampService.get` under `ctx.where()` + `applyOwnScope`; `$geoNear` within `ctx.where()`; 422/409 on no-coverage/all-booked |

---

## 11. Complete role + permission flow

```
1  Client sends request with httpOnly accessToken cookie
2  buildContext            → req.context with empty user/role/tenant/permissions
3  AuthMiddleware
   3a verifyAccessToken                                        tokenHelper.ts
   3b RoleModel.findById(payload.role).populate(tenant,type)   ← ROLE RETRIEVAL
   3c active-chain gate: tenant/type/role status
   3d PermissionGroupModel.findOne({tenant}) active?
   3e ctx.setUser/setRole/setTenant
   3f permissions = type.permissions ∪ role.permissions        ← PERMISSION RETRIEVAL
      .filter(p => PERMISSIONS_ARRAY.includes(p))
      new Set(...)  → ctx.setPermissions()
4  AuthorizeMiddleware(codes, mode) → hasAny/hasAll → 403 or next()   ← THE CHECK
5  Controller: Zod safeParse → Service(data, ctx)
6  Service: where = ctx.where()                                      ← TENANT SCOPE
            + own-record narrowing via ctx.hasAnyPermissions
7  Mongoose query → MongoDB
8  Mapper → ResponseHandler.appResponse
```

> **Note the ordering:** the permission check happens **before** the tenant scope. Authorization says
> *what verb*; `ctx.where()` says *whose data*. Both are required — neither alone is sufficient.

---

## 12. Security Architecture — what is actually there

### ✅ IMPLEMENTED

- JWT auth in httpOnly cookies; access/refresh split; refresh rotation
- bcrypt (salt 10); `password` is `select: false`
- Account lockout (5 → 10 min); generic 401 prevents user enumeration
- Rate limiting: global 100/min/IP + auth 10/min/IP (`express-rate-limit`), `trust proxy: 1` so real
  IPs key correctly
- CORS allowlist from `APP_CORS_ORIGINS` with `credentials: true`
  (**§5a's "hardcoded to :5173" is fixed**)
- Cookies: `httpOnly`, `secure` in prod, `sameSite: 'none'` prod / `'lax'` dev; `clearCookie` passes
  matching attributes
- RBAC guards on essentially every route; `system:manage` deliberately elevated
- Privilege-escalation guards: role-permission denylist + PermissionGroup ceiling +
  single-admin-per-tenant
- Zod validation on every body/query; NoSQL-injection risk is low (Mongoose casting + Zod typing)
- Log redaction (`shared/logger/redact.ts`): passwords, tokens, `authorization`, `cookie`, plus
  `payload.*` wildcards
- Mappers prevent raw-document leakage; `TenantMapper` gates `owner`/`salesPerson` behind
  `system:manage`
- Upload hardening: memoryStorage, 10MB cap, mimetype allowlist
- Deliberate 404-instead-of-403 on cross-tenant reads (no existence disclosure)

### ⚠️ PARTIALLY IMPLEMENTED

- **Tenant isolation** — enforced manually; several `get()`s skip it ([§7](#7-multi-tenancy-))
- **Token revocation** — refresh yes, access token no (15-min window); single-session model
- **Audit logging** — `stageHistory` on 4 entities only; no audit collection, no `createdBy/updatedBy`
- **Rate limiting** — in-memory store: per-instance, resets on deploy, ineffective across replicas
- **Secrets** — real values in `.env` (gitignored), but `app.config.ts` has **insecure fallbacks**

### ❌ NOT FOUND

- `helmet` / security headers (no CSP, HSTS, X-Frame-Options, nosniff)
- CSRF tokens — mitigated in practice by CORS preflight on JSON + `sameSite`, but `sameSite:'none'`
  in prod widens exposure
- Global error handler (see [§13](#13-error-handling))
- Explicit request size limit on `express.json()` (defaults to 100kb — acceptable, but unstated)
- Password complexity beyond `min(6)`
- Any XSS output encoding (JSON-only API, so low relevance)
- MFA, email verification, IP allowlisting, secret rotation

### 🚩 POTENTIAL CONCERN — flag these, don't fix them yet

1. `app.config.ts`: `JWT_ACCESS_SECRET || 'secret'`, `JWT_REFRESH_SECRET || 'refresh-secret'` — if env
   is unset in prod, tokens are forgeable by anyone reading this repo.
2. Same file: `APP_SYSTEM_USER_PASSWORD || 'Test@123'` and `APP_ADMIN_USER_PASSWORD || 'Test@123'` —
   seeded on **every boot**. If unset in prod, `system@gmail.com / Test@123` holds `system:manage`.
3. `UserService.search`/`get` have zero tenant scoping — cross-tenant user directory read for anyone
   with `user:search`.
4. `DivisionService.get` / `TenantService.get` / `PermissionGroupService.get` unscoped ([§7](#7-multi-tenancy-)).
5. **`QaFeedbackService.create` — `entity.save()` is commented out** (`qaFeedback.service.ts`).
   Feedback is returned to the client and pushed to Jira, but **never persisted to MongoDB**. Looks
   like a genuine bug, not a design choice; the surrounding comment ("already persisted above")
   contradicts the code.
6. Regex search on unindexed fields (`name`, `title`, `city`…) — collection scans at scale.
7. `AuthMiddleware` runs 2 uncached DB queries per request.
8. `console.log('Bulk MR creation rows:', validRows)` in `division.service.ts` — logs user PII incl.
   plaintext passwords from the CSV, bypassing pino redaction.

---

## 13. Error Handling

**Confirmed: there is no global error middleware.** Every controller wraps its body in `try/catch`:

```
Service throws throwAppError(msg, statusCode, extra?)  → AppError extends Error
                    │  { statusCode, success:false, isOperational:true, extra }
                    ▼
Controller catch(error) → ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null)
                    ▼
{ success:false, message, data:null }   with the AppError's status
```

| Error class | Handling |
|---|---|
| **Validation** | Zod `.safeParse` → `formatZodError` → `400 { data: { fields: { 'a.b': 'msg' } } }` |
| **Auth (401)** | Thrown inside `AuthMiddleware`, caught by its own try/catch |
| **Authorization (403)** | Thrown inside `AuthorizeMiddleware`, caught by its own try/catch |
| **Database** | A raw Mongoose error has no `statusCode` → `appResponse`'s `status = 500` default applies, but **the raw driver message is echoed to the client** (e.g. duplicate-key details). Minor information disclosure |
| **External API** | `JiraProvider` logs then `throwAppError(..., 502)`; the QA-feedback caller swallows it so Jira downtime doesn't fail the request |

**Gap:** anything thrown *outside* a controller try/catch — CORS rejection, multer
`Invalid file type`, malformed JSON body — reaches Express's default handler and returns an **HTML
stack trace**, not the app's JSON envelope. Confirmed by grep: no
`app.use((err, req, res, next) => …)` exists anywhere.

---

## 14. External Services / Integrations

Only **one**, plus MongoDB.

```
QaFeedbackService.create
    │
    ▼
JiraProvider.createTicket        shared/providers/jira/jira.provider.ts
    │  • config guard → 500 if BaseUrl/Email/ApiToken missing
    │  • Basic auth = base64(email:apiToken)
    │  • description wrapped in Atlassian Document Format (plain string 400s)
    ▼
axiosInstance (30s timeout)      shared/config/axios/axios.ts
    ▼
POST {JIRA_BASE_URL}/rest/api/3/issue
    ▼
{ key: 'QF-123' }  → logged; failures logged + swallowed (502 never surfaces)
```

**NOT FOUND:** no S3, no SES/email, no SMS, no payments, no Redis, no Kafka/queues/pub-sub, no
inbound webhooks, no WebSockets. Root `CLAUDE.md`'s "AWS S3 + SES" is **plan, not code**.

---

## 15. Background Jobs / Async Processing

**NOT FOUND.** No cron, no queues, no workers, no schedulers, no event emitters.

The only non-request async work is:

- **Boot-time seeding** (`runSeed()` before `listen`)
- **`processInBatches`** (`shared/utils/batchProcessor.ts`) — batched `Promise.allSettled`, used
  **synchronously inside** `POST /divisions/bulk-mr` (batch size 2). The HTTP request blocks until the
  whole CSV finishes; returns `{totalRows, validRows, invalidRows, created, failed, errors}`.
- `calculateWorkingExpiry` (`expiryHelper.ts`) — a pure working-hours date calculator;
  **not currently called anywhere** (grep shows no consumers). Likely staged for MoM/SLA deadlines.

Root `CLAUDE.md`'s reminder engine (24h/48h pre-camp) is **not implemented**.

---

## 16. Configuration

- `dotenv` loaded **once**, at the top of `shared/config/app.config.ts`. Everything else imports the
  frozen `ENV` object — no `process.env` reads outside this file (verified).
- Groups: `App`, `Deployment`, `DB`, `JWT`, `Integrations.Jira`, `RateLimit`.
- Env-specific behaviour keys off `APP_ENV === 'development'` in exactly three places: log level
  (`silly` vs `info`), pretty-print transport, and cookie `secure`/`sameSite`.
- Deployment metadata comes from Railway's injected `RAILWAY_GIT_*` vars, surfaced on `/health-check`.
- **Feature flags:** NOT FOUND.
- **Config precedence traps:** `PORT || APP_PORT || 3000`, and `APP_CORS_ORIGINS` wins over the
  per-env fallback.

### Env vars in use

```
APP_PORT · APP_HOST · APP_ENV · APP_CORS_ORIGINS
APP_SYSTEM_USER_EMAIL / _PASSWORD / _PHONE
APP_ADMIN_USER_EMAIL / _PASSWORD / _PHONE
APP_SYSTEM_TENANT_CODE / _NAME / _DESCRIPTION
DB_URI
JWT_ACCESS_SECRET · JWT_ACCESS_EXPIRY_SEC · JWT_REFRESH_SECRET · JWT_REFRESH_EXPIRY_SEC
JIRA_BASE_URL · JIRA_EMAIL · JIRA_API_TOKEN · JIRA_PROJECT_KEY · JIRA_ISSUE_TYPE
RATE_LIMIT_WINDOW_MS · RATE_LIMIT_MAX · AUTH_RATE_LIMIT_WINDOW_MS · AUTH_RATE_LIMIT_MAX
RAILWAY_GIT_COMMIT_SHA / _COMMIT_MESSAGE / _BRANCH   (injected by Railway)
```

---

## 17. Logging / Monitoring

- **Library:** `pino` + `pino-http`. `shared/utils/logger.ts` is a compatibility shim (both default
  and named imports work).
- **Custom levels only:** `silly(10) debug(20) info(30) warn(40) error(50) fatal(60)` —
  `useOnlyCustomLevels: true`. There is **no `trace`**, and **no `success`**.
- **Signature is pino's:** `logger.info({meta}, 'message')` — metadata **first**. Passing
  `(msg, obj)` silently drops the object. (`tenant.service.ts` has one such call:
  `log.error('Tenant creation transaction failed:', error?.message)`.)
- **Request logging:** automatic, one completion line per request; `5xx→error, 4xx→warn, else info`.
- **Correlation IDs:** ✅ `genReqId` honours inbound `x-request-id`, echoes it as a response header,
  and `buildContext` copies it to `ctx.requestID`. `req.log` is a request-bound child logger — that's
  why `backend/CLAUDE.md` says prefer `ctx.logger`.
- **Redaction:** ✅ `shared/logger/redact.ts`.
- **Health check:** `GET /health-check` → env, version, commit, branch, startedAt, uptimeSec. Wired
  to Railway's healthcheck.
- **NOT FOUND:** metrics (Prometheus/OTel), distributed tracing, APM, error-tracking (Sentry), log
  shipping. Prod logs are JSON to stdout only.

---

# PHASE 2 — FEATURE MAP

```
Authentication                          modules/auth/*  ·  Entities: User, Role, Tenant, PermissionGroup
├── Login                    POST /auth/login          public (rate-limited)  · no tenant needed
├── Logout                   POST /auth/logout         authenticated
├── Refresh Token            POST /auth/refresh-token  cookie only, no AuthMiddleware
├── Current Session (me)     GET  /auth/me             authenticated — returns permissions[] ⭐
├── Change Own Password      POST /auth/reset-password authenticated
├── Admin Reset Password     POST /auth/forgot-password  tenant:admin · tenant-scoped
└── Register                 ✖ commented out (users are minted via Role creation)

User Management                         modules/user/*  ·  Entity: User
├── Get / Search / Update    GET|PUT /users[/:id]      user:get / user:search / user:update
└── ⚠ NO tenant scoping · no create route (users come from RoleService.create) · no delete

Tenant Management                       modules/access-management/tenant/*
├── Create Tenant            POST /tenants   tenant:manage — one transaction mints:
│                                            tenant → permission group → admin role type
│                                            → (customer: 4 pharma role types)
│                                            → admin role + owner user (activated)
├── Get / Search / Update    GET|PUT /tenants[/:id]    tenant:get/search/update/admin/manage
└── My Tenant                GET  /tenants/me          any authenticated

Access Management (RBAC)                modules/access-management/{role,role-type,permission-group}/*
├── Roles         GET|POST|PUT /roles[/:id]         tenant:admin | tenant:manage
│                 └ creates+links the User; validates division, supervisor tree, permission ceiling
├── Role Types    GET|POST|PUT /role-types[/:id]    tenant:manage | tenant:admin
│                 └ isSystem codes are reserved against custom creation
└── Permission Groups  GET /permission-groups[/:id], PUT /:id   (create route commented out)

CRM — Divisions                         modules/crm/division/*  ·  Entities: Division, Role, User, RoleType
├── CRUD                     GET|POST|PUT /divisions[/:id]   division:manage | tenant:admin
│                            └ create also mints a pharma-division-head Role + User (one txn)
└── Bulk MR Import           POST /divisions/bulk-mr  (multipart CSV)  division:manage | tenant:admin

CRM — Contacts                          modules/crm/contact/*
└── CRUD  GET|POST|PUT /contacts[/:id]   contact:*
       · tenant(+optional division) scoped · division required for pharma · type immutable on update

CRM — Leads                             modules/crm/lead/*  ·  Entities: Lead, Division, Contact, Role, Counter
├── CRUD                     GET|POST|PUT /leads[/:id]    lead:* — reps see only their own
└── Move Stage               PATCH /leads/:id/stage       lead:manage | tenant:manage  (reason required)

CRM — Projects                          modules/crm/project/*  ·  one project per Lead
├── CRUD                     GET|POST|PUT /projects[/:id]  project:*  — reps see only their own
└── Move Stage               PATCH /projects/:id/stage

CRM — Appointments                      modules/crm/appointment/*
├── CRUD                     GET|POST|PUT /appointments[/:id]   appointment:*
├── Move Stage               PATCH /appointments/:id/stage      (records per-move nextSteps)
└── RSVP                     PATCH /appointments/:id/rsvp       appointment:rsvp | manage

Operations — Camps                      modules/operations/camp/*
│                                       Entities: Camp, Doctor, GeoProfile, Role, Project, Counter
├── CRUD                     GET|POST|PUT /camps[/:id]  camp:*  — assignees see only their camps
│                            └ create auto-allocates nearest free FO
├── Move Stage               PATCH /camps/:id/stage     (FO required to leave `requested`;
│                                                        same-day double-book guard)
└── Allocate FO              POST  /camps/:id/allocate  camp:update|manage|tenant:manage

Operations — Geo Profiles               modules/operations/geoProfile/*  ·  2dsphere
├── CRUD                     GET|POST|PUT /geo-profiles[/:id]   geo-profile:manage to write
└── Find Nearest             GET /geo-profiles/nearest          any authenticated
                                                                ← feeds camp allocation

Doctor Registry                         modules/doctor/*  ·  GLOBAL, no tenant
└── CRUD  GET|POST|PUT /doctors[/:id]   read: any authenticated · write: doctor:manage

Counters (code sequences)               modules/counter/*  ·  GLOBAL
└── GET /counters[/:id] any authenticated · PUT /:id counter:manage · .next() used internally

QA Feedback                             modules/qa-feedback/*  ·  no tenant scoping
├── Create   POST /qa-feedback   any authenticated  → pushes a Jira ticket
│                                ⚠ entity.save() is commented out — NOT persisted
└── Review   GET|PUT /qa-feedback[/:id]   qa-feedback:manage

Inventory                               modules/inventory/*
└── Inventory Master  GET|POST|PUT /inventory-masters[/:id]
        read: authenticated · write: inventory-master:manage
    ⚠ inventory-item / inventory-assignment / inventory-transaction are 1-line stub files — NOT wired
```

---

# PHASE 3 — CORE API FLOW MAP

### 3.1 `POST /api/v1/auth/login`

| | |
|---|---|
| Purpose | Authenticate, issue token pair as httpOnly cookies |
| Auth / Tenant / Permission | ❌ / ❌ (derived from Role) / ❌ |
| Route → Controller → Service | `auth.routes.ts:150` → `AuthController.login` → `AuthService.login` |
| Middleware | globalRateLimiter, authRateLimiter, httpLogger, buildContext |
| Models | `UserModel`, `RoleModel`, `PermissionGroupModel` |
| External | none |
| Response | 200 `{id,email,firstName,lastName,avatar}` + 2 Set-Cookie |
| Errors | 400 validation · 401 bad creds / unknown email · 403 inactive user / locked / no role / inactive tenant-type-role-PG · 429 rate limit |

### 3.2 `GET /api/v1/auth/me` ⭐ the frontend's authorization source of truth

| | |
|---|---|
| Purpose | Hydrate the client: profile + role + roleType + tenant + **flat permission array** |
| Auth / Tenant / Permission | ✅ / implicit / none |
| Flow | `auth.routes.ts:153` → AuthMiddleware → `AuthController.me` → `AuthService.session(ctx)` → `AuthMapper.toSession` |
| Note | role/tenant/permissions come **straight off `ctx`** (already loaded by AuthMiddleware); only the User profile is re-fetched |
| Response | `{ user, role:{id,code,name}, roleType:{id,code,name}, tenant:{id,code,name,type}, permissions:[…] }` |
| Errors | 401 unauthorized · 404 user not found |

### 3.3 `POST /api/v1/tenants` — client onboarding (most complex write)

| | |
|---|---|
| Auth / Tenant / Permission | ✅ / platform actor / `tenant:manage` (`tenant:create` is commented out of the guard) |
| Service | `TenantService.create` → `createTenant()` — **one `withTransaction`** |
| Steps | 1 tenant → 2 PermissionGroup (seeded with user:get/search/update) → 3 admin RoleType via `provisionDefaultRoleTypes` (`isSystem:true`) → 3.1 if customer: 4 pharma role types → 4 `RoleService.create` (mints + links owner User) → 5 `UserModel.updateOne` force-activate owner → 6 `tenant.owner = role._id` |
| Entities | Tenant, PermissionGroup, RoleType ×1-5, User, Role |
| Errors | 409 duplicate code / duplicate owner email · 400 validation · 500 role-type provisioning · **any failure rolls back everything** |
| ⚠️ | Requires a replica set. `create()`'s existence check uses unscoped `TenantService.get` |

### 3.4 `POST /api/v1/roles` — user + role provisioning

| | |
|---|---|
| Permission | `tenant:admin` OR `tenant:manage` (OR) |
| Service | `RoleService.create` → `withTransaction(set() → save())` |
| Validation chain in `set()` | role type exists & same tenant → single-admin-per-tenant (409) → `handleDivision` (exists, tenant-coherent, customer-only; **required on create for customer tenants**, admin exempt) → `handleSupervisor` (no self-ref, same tenant, same division, `ROLE_SUPERVISOR_TREE` legality) → `handlePermissionUpdate` (registry validity → forbidden denylist → PermissionGroup ceiling) → `UserService.create` |
| Entities | Role, User, RoleType, Tenant, Division, PermissionGroup |
| Errors | 404 tenant/role-type/division/supervisor · 409 duplicate code, second admin, existing user email · 400 bad division/supervisor/permissions · 403 forbidden elevated permission |

### 3.5 `POST /api/v1/camps` + `POST /camps/:id/allocate` — geo allocation

| | |
|---|---|
| Permission | `camp:create` / `camp:update` / `camp:manage` / `tenant:manage` (OR) |
| Services | `CampService` → `DivisionService`, `ProjectService`, `DoctorService`, `RoleService`, `GeoProfileService`, `CounterService` |
| Geo | `$geoNear` (spherical, meters) capped by `GEO_ALLOCATION_MAX_DISTANCE`, then `$match distance <= coverageRadius` per profile |
| Transaction boundary | `$geoNear` **outside** the txn (MongoDB forbids it inside); only `CounterService.next` + `save()` are inside |
| Entities | Camp, Division, Project, Doctor, Role, GeoProfile, Counter |
| Errors | 404 division/project/doctor/role · 400 division-tenant mismatch · 422 no coordinates / no FO coverage · 409 all nearby FOs booked |

### 3.6 `PATCH /api/v1/leads/:id/stage` — the pipeline pattern

Identical shape for project / camp / appointment.

| | |
|---|---|
| Permission | `lead:manage` OR `tenant:manage` |
| Service | `LeadService.moveStage` — the **only** path that mutates `status` |
| Guards | scoped `get()` → 404 · no-op move → 400 · `canTransition(LEAD_TRANSITION_MAP)` → 400 |
| Write | push `{from,to,reason,actor:{roleId,name,email}}` to `stageHistory` **and** set `status` in one `save()` |
| Errors | 400 invalid/no-op transition · 404 not found or out of scope |

### 3.7 `POST /api/v1/divisions/bulk-mr` — the only file-upload API

| | |
|---|---|
| Middleware | AuthMiddleware → AuthorizeMiddleware → `csvUploader.single('file')` |
| Flow | validate supervisor (exists, same tenant, same division) → resolve `pharma-mr` RoleType → `CsvHelper.parse(buffer)` → per-row build `ICreateRolePayload` → `CreateRolePayloadSchema.safeParse` → `processInBatches(validRows, RoleService.create, 2)` |
| Response | `{totalRows, validRows, invalidRows, created, failed, errors}` — partial success is a **success** |
| ⚠️ | Synchronous (blocks the request); `console.log` of rows leaks plaintext CSV passwords |

---

# PHASE 4 — ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CLIENTS   React/Vite SPA (cookies: credentials:'include')  ·  Swagger UI    │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │  HTTPS
┌───────────────────────────────────▼─────────────────────────────────────────┐
│  Railway  (NIXPACKS · healthcheck /health-check · trust proxy 1)             │
│  ── no API gateway, no load balancer config, single Node process ──          │
└───────────────────────────────────┬─────────────────────────────────────────┘
┌───────────────────────────────────▼─────────────────────────────────────────┐
│  EXPRESS 5 APP                                       src/bin/app.ts          │
│                                                                             │
│  GLOBAL MIDDLEWARE (in order)                                               │
│   express.json → cookieParser → CORS(allowlist, credentials)                │
│   → /api-docs (swagger-ui)   → globalRateLimiter(/api/v1)                   │
│   → httpLogger(pino-http, x-request-id)  → buildContext(req.context)        │
│                                                                             │
│  ┌───────────────────── PER-ROUTER MIDDLEWARE ──────────────────────────┐   │
│  │ AuthMiddleware  cookie→JWT→RoleModel.findById().populate(tenant,type)│   │
│  │   ├─ active-chain gate (tenant/roleType/role/permissionGroup)        │   │
│  │   └─ ctx.setUser/setRole/setTenant/setPermissions                    │   │
│  │ AuthorizeMiddleware(codes, AND|OR)  → ctx.hasAny/hasAllPermissions   │   │
│  │   └─ system:manage short-circuits every check                        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ROUTERS (17)  /auth /users /tenants /permission-groups /role-types /roles   │
│    /divisions /leads /contacts /appointments /projects /qa-feedback          │
│    /doctors /geo-profiles /camps /counters /inventory-masters                │
│         │                                                                   │
│  CONTROLLERS  Zod .safeParse → Service(ctx) → Mapper → ResponseHandler       │
│         │                              ▲                                    │
│  SERVICES  ALL business logic ─────────┘  service→service calls allowed      │
│    • ctx.where()  ← MANUAL tenant scope     • ctx.hasAnyPermissions() ← row  │
│    • withTransaction (AsyncLocalStorage session, auto-attached)              │
│    • CounterService.next() atomic $inc                                      │
│         │                                                                   │
│  ── NO REPOSITORY LAYER ──  services use Mongoose models directly            │
│  MODELS  Mongoose schemas + indexes ({tenant,code} uniques, 2dsphere)        │
└───────┬──────────────────────────────────────────────────┬──────────────────┘
        │                                                  │
┌───────▼────────────────────┐            ┌────────────────▼──────────────────┐
│  MongoDB (replica set req.)│            │  Jira Cloud REST v3               │
│  ~15 collections           │            │  via shared/providers/jira        │
│  shared DB, tenant column  │            │  + shared/config/axios (30s)      │
│  transactions · $geoNear   │            │  ← the ONLY external service      │
└────────────────────────────┘            └───────────────────────────────────┘

BOOT SEQUENCE (server.ts):  connectDB → runSeed(seedSystemUser, seedCounters) → listen

OBSERVABILITY: pino → stdout (JSON in prod / pino-pretty in dev)
               x-request-id correlation · redaction · /health-check

NOT PRESENT: cache/Redis · queues/Kafka · workers/cron · S3 · email/SMS ·
             metrics/tracing/APM · global error middleware · repository layer
```

---

# PHASE 5 — FILE RESPONSIBILITY MAP

## 🔴 CRITICAL — a mistake here breaks everything

### `src/bin/app.ts`
- **Responsibility:** Assembles the Express app — middleware order, CORS, rate limiting, all 17 route
  mounts, `/health-check`.
- **Called by:** `server.ts` (import-time execution).
- **Calls:** every `*Router`, `buildContext`, `httpLogger`, rate limiters, swagger.
- **Used for:** every API.
- **Flow position:** the very top of the request pipeline.
- **Notes:** middleware **order** is load-bearing — `httpLogger` must precede `buildContext` for
  `req.id`. Every new module registers here.

### `src/shared/utils/contextBuilder.ts`
- **Responsibility:** Defines `RequestContext` and the `buildContext` middleware. Owns `ctx.where()`
  (**the entire tenant-isolation mechanism**), `hasAny/hasAllPermissions` (**including the
  `system:manage` skeleton key**), and the setters `AuthMiddleware` calls.
- **Called by:** `app.ts` (as middleware); read by every controller and service.
- **Flow position:** immediately before routing; consumed everywhere downstream.
- **Notes:** changing `where()` or the skeleton-key line changes authorization semantics app-wide.

### `src/shared/middlewares/authmiddleware.ts`
- **Responsibility:** The authentication gate **and** the permission assembler. Verifies the cookie
  JWT, re-resolves the Role from the DB, enforces the four-part active chain, merges
  `roleType.permissions ∪ role.permissions`, filters against `PERMISSIONS_ARRAY`.
- **Called by:** every router except `/auth` (via `Router.use`).
- **Calls:** `TokenHandler.verifyAccessToken`, `RoleModel`, `PermissionGroupModel`, `ctx.set*`.
- **Notes:** two DB queries per request live here — security **and** performance chokepoint.

### `src/shared/middlewares/authorizeMiddleware.ts`
- **Responsibility:** The permission guard factory: `AuthorizeMiddleware(codes, 'AND'|'OR')`.
- **Flow position:** between AuthMiddleware and every controller.
- **Notes:** thin — the real logic is in `contextBuilder`.

### `src/shared/env/permissions.ts`
- **Responsibility:** The permission **registry**. Aggregates every module's `*_PERMISSIONS` into
  `PERMISSIONS` and flattens to `PERMISSIONS_ARRAY`.
- **Called by:** AuthMiddleware, `role.service` validation, `seedSystemUser`.
- **Notes:** a code absent here is inert everywhere.

### `src/modules/access-management/role/role.service.ts`
- **Responsibility:** The most rule-dense file in the codebase (~400 lines). Owns role↔user 1:1
  creation, single-admin-per-tenant, the forbidden-permission denylist, the PermissionGroup ceiling,
  `handleDivision`, `handleSupervisor`.
- **Called by:** TenantService, DivisionService, roles API, auth `forgotPassword`.
- **Calls:** TenantService, RoleTypeService, UserService, DivisionService, `withTransaction`.

### `src/modules/access-management/tenant/tenant.service.ts`
- **Responsibility:** `createTenant()` — the client-onboarding transaction; `salesPerson` assignment
  validation.
- **Called by:** DivisionService, RoleService, tenants API.
- **Calls:** PermissionGroupService, `provisionDefaultRoleTypes`, RoleService, UserModel.

### `src/modules/auth/auth.service.ts`
- **Responsibility:** Login (lockout, active-chain gate, token issuance), refresh (rotation + DB
  match), logout, session, both password flows.
- **Calls:** UserService, RoleModel, PermissionGroupModel, TokenHandler, bcrypt, RoleService.

### `src/shared/env/seedSystemUser.ts`
- **Responsibility:** Bootstraps the entire platform tenant on every boot: tenant, permission group
  (**reconciled additively**), system + admin role types, both users, both roles.
- **Called by:** `runSeed()` from `server.ts`.
- **Notes:** idempotent, transactional. Determines who can log in on a fresh database.

### `src/bin/server.ts`
- **Responsibility:** Process entry. Enforces the order connect → seed → listen.

### `src/shared/config/app.config.ts`
- **Responsibility:** The single `process.env` reader; the frozen `ENV` object.
- **Notes:** every fallback default in this file is a production risk if the env var is missing.

## 🟠 IMPORTANT

| File | Responsibility |
|---|---|
| `shared/helpers/tokenHelper.ts` | All JWT sign/verify. Never call `jwt.*` directly |
| `shared/utils/cookies.ts` | All cookie set/clear; the `secure`/`sameSite` policy lives here |
| `shared/helpers/transactionHelper.ts` | `withTransaction` — AsyncLocalStorage session, joins rather than nests. **Never `Promise.all` two DB ops inside one** |
| `shared/utils/error.ts` | `AppError`, `throwAppError`, `formatZodError` — the entire error vocabulary |
| `shared/utils/responseHandler.ts` | `appResponse` — the one response envelope |
| `shared/config/connectDB.ts` | Mongoose connect + `transactionAsyncLocalStorage` flag |
| `shared/env/roleTypeProvisioner.ts` | Creates `isSystem` role types bypassing validators; **full-syncs** permissions on every boot |
| `shared/env/defaultRoleTypes.ts` | The actual permission sets for sales/ops/FO role types — edit here to change what a job function can do |
| `modules/access-management/role-type/roleType.constants.ts` | `ALLOWED_ROLETYPE_CODES` — the platform/customer role vocabulary |
| `modules/access-management/role/role.constants.ts` | `ROLE_SUPERVISOR_TREE` + `isValidRoleSupervisor` — the org-hierarchy rules |
| `modules/operations/camp/camp.service.ts` | Camp lifecycle + FO auto-allocation + double-booking guards |
| `modules/operations/geoProfile/geoProfile.service.ts` | `findNearest` `$geoNear` pipeline |
| `modules/crm/lead/lead.service.ts` | **The reference implementation** of scoping + `moveStage` — read before writing any service |
| `modules/counter/counter.service.ts` | Atomic `next()`; transaction-safe code reservation |
| `modules/crm/division/division.service.ts` | Division + head-role transaction; bulk-MR CSV import |
| `modules/user/user.service.ts` | User CRUD + `getUserWithPassword`. ⚠️ no tenant scoping |
| All `*.model.ts` | Schemas, enums, indexes — the real data contract |

## 🟡 SUPPORTING

`shared/utils/requestHandler.ts` (query/pagination parse) · `shared/utils/strings.ts`
(`isValidObjectID`, `toObjectId`, `stripWhitespace`) · `shared/utils/dates.ts` (UTC day boundaries) ·
`shared/logger/*` (pino, http logger, redaction, serializers, transport) ·
`shared/middlewares/rateLimiter.ts` · `shared/middlewares/upload/*` · `shared/helpers/csvHelper.ts` ·
`shared/utils/batchProcessor.ts` · `shared/providers/jira/jira.provider.ts` ·
`shared/config/axios/axios.ts` · all `*.mapper.ts`, `*.controller.ts`, `*.validators.ts` (highly
formulaic — read one, you've read them all) · `shared/helpers/expiryHelper.ts` (**currently unused**)

## ⚙️ CONFIGURATION

`package.json` · `tsconfig.json` · `railway.json` · `.env` (gitignored) · `.prettierrc.json` ·
`shared/config/swagger/*` (⚠️ `swagger.config.ts` must side-effect-import every new routes file) ·
`scripts/createModule.sh` (module scaffolder)

## ⬜ GENERATED / IGNORE

`node_modules/` · `package-lock.json` · `dist/` ·
**`modules/inventory/{inventory-item,inventory-assignment,inventory-transaction}/*` — 24 one-line
stub files, not wired, not implemented**

---

# PHASE 6 — READ THESE FIRST (ordered)

| # | File | Why before anything else |
|---|---|---|
| 1 | `backend/CLAUDE.md` | The team's own conventions. Accurate except for the newest inventory work |
| 2 | `src/bin/app.ts` | The map: every middleware, every route base, in execution order |
| 3 | `src/shared/utils/contextBuilder.ts` | `ctx.where()` + `system:manage`. **Tenant isolation and authorization both live here** |
| 4 | `src/shared/middlewares/authmiddleware.ts` | How identity, tenant, and permissions get onto `ctx` |
| 5 | `src/shared/middlewares/authorizeMiddleware.ts` | The guard you'll put on every route you write |
| 6 | `src/shared/env/permissions.ts` | The permission vocabulary; step 4 of adding any module |
| 7 | `src/modules/crm/lead/lead.service.ts` | **The template.** Scoping, own-record narrowing, transaction, counter, moveStage — all in one readable file |
| 8 | `src/modules/crm/lead/lead.controller.ts` | The controller template: safeParse → service → mapper → appResponse |
| 9 | `src/modules/crm/lead/lead.routes.ts` | The routes template: `Router.use(AuthMiddleware)` + guards + Swagger co-location |
| 10 | `src/shared/utils/error.ts` + `responseHandler.ts` | Every error and every response passes through these two |
| 11 | `src/modules/access-management/role/role.model.ts` | The RBAC join table — Role is the hub of the entire data model |
| 12 | `src/modules/access-management/role-type/roleType.constants.ts` | The 14 role codes; the actual actor vocabulary |
| 13 | `src/shared/env/defaultRoleTypes.ts` | What each job function can actually do, in one place |
| 14 | `src/modules/auth/auth.service.ts` | Login/refresh/lockout — the flow you'll debug most often |
| 15 | `src/modules/access-management/tenant/tenant.service.ts` | `createTenant` — the multi-service transaction pattern |
| 16 | `src/modules/access-management/role/role.service.ts` | The hardest rules in the codebase. Read *after* 11–13 |
| 17 | `src/shared/helpers/transactionHelper.ts` | Short, but the `Promise.all`-inside-a-transaction trap will bite you |
| 18 | `src/shared/env/seedSystemUser.ts` | Explains what exists on a fresh DB and who can log in |
| 19 | `src/shared/config/app.config.ts` | Every env var and every fallback |
| 20 | `src/modules/operations/camp/camp.service.ts` | The most complex domain logic; geo + booking + transaction boundary |

---

# PHASE 7 — WHAT TO LEARN BEFORE DEVELOPING

### MUST KNOW

- **Node.js + TypeScript + `tsx`** — strict mode, `InferSchemaType`, `HydratedDocument`
- **Express 5** — routers, middleware ordering, `req`/`res`, **and specifically that Express 5 does
  *not* auto-catch async errors** (which is why this codebase try/catches in every controller)
- **MongoDB + Mongoose** — schemas, refs, `populate`, `findOne`/`findOneAndUpdate`,
  `countDocuments`, query filters, unique + compound + partial indexes
- **MongoDB transactions** — sessions, replica-set requirement, why parallel ops on one session fail,
  and how `transactionAsyncLocalStorage` auto-attaches
- **JWT** — signing, verification, expiry, access/refresh split, rotation
- **httpOnly cookies + CORS with credentials** — `sameSite` semantics, why `'none'` requires `secure`
- **bcrypt** — salt/compare
- **Zod** — `.safeParse`, `z.infer`, `.refine`, `.preprocess`, `.openapi()` for Swagger
- **RBAC as implemented here** — permission codes, the RoleType/Role two-layer grant, the
  PermissionGroup ceiling, `system:manage`
- **Multi-tenancy as implemented here** — shared collections, discriminator column, **manual**
  `ctx.where()` scoping, platform vs customer semantics
- **This codebase's 7-file module convention** — never skip or merge a layer

### SHOULD KNOW

- **MongoDB geospatial** — `2dsphere`, `$geoNear`, spherical distances in meters, and that `$geoNear`
  is forbidden inside transactions (`camp.service.ts` depends on this)
- **Aggregation pipelines** — `$geoNear` / `$match` / `$limit` / `$expr`
- **pino** — metadata-object-first signature, child loggers, redaction paths, custom levels
- **`AsyncLocalStorage`** — how `withTransaction` works without threading sessions
- **`express-rate-limit`** — window/limit, and that the default store is in-memory
- **OpenAPI / `zod-to-openapi`** — the side-effect-import registration pattern
- **Multer + `@fast-csv/parse`** — memory storage, buffer parsing
- **HTTP status semantics as used here** — 401 vs 403 vs 404-instead-of-403, 409 for conflicts,
  422 for unprocessable

### GOOD TO KNOW

- Railway deployment (NIXPACKS, `RAILWAY_GIT_*`, healthchecks, `trust proxy`)
- Jira Cloud REST v3 + Atlassian Document Format
- MongoDB indexing / query-plan basics (relevant to the `$regex` searches)
- OWASP API Top 10 — particularly BOLA / broken object-level authorization, which is exactly what
  `ctx.where()` defends against

### Explicitly NOT needed for this codebase

Redis · Kafka/queues · WebSockets/Socket.IO · S3 · SES · GraphQL · Prisma/TypeORM · Docker/K8s ·
cron/schedulers

---

# PHASE 8 — RISKY / COMPLEX AREAS

Ranked by blast radius.

### 🔴 1. `contextBuilder.ts` — `ctx.where()` and the permission helpers
Every tenant-scoped query in the app starts here, and `hasAny/hasAllPermissions` gate every route. A
one-line change (e.g. "fixing" the `system:manage` short-circuit or the platform-tenant `{}` case)
silently changes what every role can see and do, across all 17 modules, with **no test suite to catch
it**. There are no automated tests anywhere in this repo.

### 🔴 2. `role.service.ts` — the privilege-escalation surface
`handlePermissionUpdate`'s three-stage validation (registry → denylist → PermissionGroup ceiling) is
the only thing stopping a tenant admin from granting themselves `system:manage`.
`handleDivision`/`handleSupervisor` have subtle create-vs-update asymmetry (`entity.isNew`) and a lazy
cached role-type resolver. Its git history shows past regressions here (the
`where()`-vs-`{tenant,code}` duplicate-check bug that 409'd every new tenant).

### 🔴 3. `authmiddleware.ts` — every protected request
Fails closed today, which is correct. But: it's the only place the active chain is enforced, the only
place permissions are assembled, and it makes 2 uncached DB queries per request — so it's
simultaneously the security chokepoint **and** the performance chokepoint. Any caching added here
risks stale permissions after a role edit.

### 🟠 4. Tenant isolation — because it is manual
There is no safety net. A new service that forgets `ctx.where()` leaks cross-tenant data and nothing
will flag it. Compounded by the existing unscoped `get()`s ([§7](#7-multi-tenancy-)) — you can't infer
the pattern from every neighbouring file, because several neighbours don't follow it.
**Check `ctx.where()` deliberately in every service you write or review.**

### 🟠 5. Multi-write transactions (`createTenant`, `RoleService.create`, `DivisionService.create`)
- `Promise.all` of two DB ops inside a transaction **crashes** MongoDB ("cannot start a new
  transaction at the active transaction number") — which is why `handlePermissionUpdate` uses a bare
  `findOne` instead of `PermissionGroupService.search`.
- `$geoNear` cannot run inside a transaction — hence `camp.service`'s carefully split boundary.
- Requires a replica set; standalone `mongod` fails at boot.
- Nesting joins rather than nests, so an inner failure aborts the outer.

### 🟠 6. Boot seeders (`seedSystemUser`, `roleTypeProvisioner`)
They run on **every** production start and mutate live data. `provisionDefaultRoleTypes`
**full-syncs** permissions — editing `defaultRoleTypes.ts` silently revokes permissions from live
users on the next deploy. The seeder also re-creates the default admin with `Test@123` if env vars are
missing.

### 🟠 7. Missing global error handler
Anything thrown outside a controller `try/catch` (CORS rejection, multer file-type rejection,
malformed JSON) bypasses the app's response envelope and returns an HTML stack trace. Adding one later
changes response shapes the frontend may already depend on.

### 🟡 8. Shared services with many callers
`RoleService` (called by Tenant, Division, Lead, Camp, Auth), `UserService`, `CounterService`,
`DivisionService`. Changing a signature or a validation rule ripples across domains — and since
services call services directly, there's no interface layer to absorb the change.

### 🟡 9. `moveStage` state machines
Four near-identical implementations (lead / project / camp / appointment) with per-module transition
maps. `stageHistory` is append-only audit data — a schema change to the actor snapshot or a
transition-map edit affects historical readability. `camp.moveStage` additionally carries the
FO-required and double-booking guards.

### 🟡 10. The Jira integration
Failure is swallowed by design in `qaFeedback.service`, so an outage is silent. And the
ticket-creating code path is the same one where `entity.save()` is commented out — confirm with the
team before touching anything nearby.

### 🟡 11. Async / global state
`AsyncLocalStorage` in `transactionHelper` is the only global state — but it's implicit. A `save()`
deep inside a call chain silently joins an ancestor's transaction. Hard to reason about, easy to
accidentally enrol something in a transaction you didn't know was open.

---

# FINAL SUMMARY

## A. One-page system summary

A multi-tenant Express 5 + TypeScript + MongoDB REST API for QMS's healthcare camp-operations
business. **17 modules** in vertical slices
(`constants/validators/model/service/controller/mapper/routes`), all mounted under `/api/v1` in
`bin/app.ts`. **No repository layer** — services own all business logic and all DB access; services
call services. Auth is JWT-in-httpOnly-cookies with a 15-min access token and a rotated 7-day refresh
token. Authorization is **permission-code RBAC**: `User —1:1→ Role —→ RoleType`, effective permissions
= RoleType ∪ Role, capped by a per-tenant PermissionGroup, with `system:manage` as an explicit
skeleton key. Multi-tenancy is shared-collection with a `tenant` discriminator, scoped **manually**
via `ctx.where()` — platform tenants get an unscoped view by design. Business state changes on
Lead/Project/Camp/Appointment go through append-only `stageHistory` + `moveStage`. Standout domain
logic: geo-based nearest-free-Field-Officer allocation via `$geoNear` with per-profile coverage radii
and same-day double-booking guards. One external integration (Jira). No cache, no queues, no
background jobs, no email. Logging is pino with request-id correlation and redaction. Deployed to
Railway.

## B. Complete request flow

See [§4 traces](#4-api-request-lifecycle--traced) and the [Phase 4 diagram](#phase-4--architecture-diagram). One-line form:

```
cookie → rateLimit → httpLogger → buildContext → Router
       → AuthMiddleware(JWT→Role→tenant+permissions)
       → AuthorizeMiddleware(codes)
       → Controller(Zod) → Service(ctx.where() + rules + Mongoose)
       → Mapper → appResponse
```

## C. Complete authentication + authorization flow

See [§8](#8-authentication), [§9–11](#9--10-authorization--rbac-). Key points: the tenant is
**re-resolved from the Role document**, never trusted from the JWT claim; the active chain
(tenant / roleType / role / permissionGroup) is enforced at both login and every request; permissions
are filtered through `PERMISSIONS_ARRAY` so removing a code disables it instantly; route guards are
coarse and services add row-level narrowing.

## D. Complete multi-tenancy flow

See [§7](#7-multi-tenancy-). The mechanism is `ctx.where()` — `{tenant: id}` for customers, `{}` for
platform. **Manual, not automatic.** Known unscoped `get()`s: Tenant, Division, PermissionGroup, User
(both get and search).

## E. Database overview

See [§6](#6-database-architecture). MongoDB/Mongoose, ~15 collections, shared-DB multi-tenancy,
compound `{tenant, code}` uniques, 2dsphere geo indexes, transactions requiring a replica set, no
migrations, no soft-delete flag (status enums instead), no `createdBy`/`updatedBy`/`version`,
`stageHistory` as the audit trail.

## F. RBAC / roles / permissions model

See [§9–11](#9--10-authorization--rbac-). `Role.permissions[]` is an *override*, not the primary
grant; `RoleType.permissions[]` is. `Role` is unique per `{tenant, code}`, so each tenant has its own
`admin`. One user = one role = one tenant. Elevated permissions (`system:manage`, `tenant:manage`,
`tenant:admin`) can **never** sit directly on a Role.

## G. Feature map

See [Phase 2](#phase-2--feature-map).

## H. Top 20 files to study

See [Phase 6](#phase-6--read-these-first-ordered).

## I. Biggest complex / risky areas

See [Phase 8](#phase-8--risky--complex-areas). In one line: **`contextBuilder.ts`, `role.service.ts`,
`authmiddleware.ts`, and any transaction boundary** — plus the structural fact that tenant isolation
is manual and there are no tests.

## J. Recommended learning order

1. `backend/CLAUDE.md`
2. `bin/app.ts` (the map)
3. `contextBuilder.ts` + both middlewares (the security core)
4. The full `lead` module, all 7 files (the template)
5. `permissions.ts` + `roleType.constants.ts` + `defaultRoleTypes.ts` (the vocabulary)
6. `role.model.ts` then `role.service.ts` (the hard rules)
7. `auth.service.ts` + `tokenHelper` + `cookies` (the flow you'll debug)
8. `tenant.service.ts` + `transactionHelper.ts` (multi-write patterns)
9. `seedSystemUser.ts` (what exists on a fresh DB)
10. `camp.service.ts` + `geoProfile.service.ts` (the hardest domain logic)

---

# Open Questions for the Team

Before writing any code, get answers to these:

1. **Is `QaFeedbackService.create`'s commented-out `entity.save()` intentional?**
   As written, QA feedback is never persisted — only pushed to Jira. Looks like a bug.
2. **Are the three inventory stub sub-modules in progress by someone else?**
   24 one-line files exist; only `inventory-master` is wired.
3. **Are the unscoped `get()`s (Tenant / Division / PermissionGroup / User) deliberate?**
   Some may be — `TenantService.get` is called during onboarding before context exists.
   `UserService.search` returning cross-tenant users looks unintended.
4. **Is `app_config` (the "no hardcoded business rules" requirement in root `CLAUDE.md` §10) still
   planned?** Nothing implements it; rules like the 10-min lockout and 35km radius are hardcoded.
5. **Should root `CLAUDE.md` §5a be updated?** Its "confirmed unfixed auth bugs" describe CORS and
   `sameSite` behaviour that no longer matches the code.

---

*Generated from a read-only analysis of `backend/` on 2026-08-14. No source files were modified.*
