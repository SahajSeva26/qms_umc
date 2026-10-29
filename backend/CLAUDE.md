# Backend — Architecture & Conventions

Express 5 + TypeScript + MongoDB. Read this fully before touching any backend file.

---

## Module Structure

Modules are grouped by **domain**. Standalone modules sit directly under `src/modules/`; related
ones are nested under a domain folder:

```
src/modules/
  auth/                     user login / refresh / password reset
  user/                     user records (linked 1:1 to a Role)
  counter/                  global atomic per-entity sequence (feeds LEAD-/PROJECT-/CAMP- codes)
  qa-feedback/              QA feedback
  vendor-master/            global platform-only vendor/supplier registry
  file/                     generic file/attachment store — presigned direct-to-S3 upload flow
  otp/                      global OTP issue/verify store — SERVICE-ONLY (no routes/controller/HTTP)
  notification/             per-user notification inbox — 🔄 scaffold (GET /me only; no triggers/sender yet)
  access-management/        tenant, role, role-type, permission-group (RBAC), employee (HR registry)
  crm/                      division, brand, lead, project, appointment, contact, doctor (tenant-scoped registry)
  operations/               camp, geoProfile (field-staff geo + camp allocation),
                            testMaster (global test catalog), patient (global patient registry),
                            screening (per-patient camp screening + consent OTP),
                            test (per-screening test result + FO stock deduction)
  inventory/                inventory-master (catalog), inventory-device, inventory-consumable,
                            inventory-assignment (who holds what), inventory-request (refill/return lifecycle)
                            (+ inventory-transaction — scaffolded, not built)
  finance/                  invoice (camp-to-cash bill), invoiceLineItem (one line per billed camp)
```

Every module contains exactly these files:

```
[module].constants.ts   → string literal enums + this module's *_PERMISSIONS
[module].validators.ts  → Zod schemas + inferred types
[module].model.ts       → Mongoose schema + model (only if module owns a collection)
[module].service.ts     → business logic + DB queries
[module].controller.ts  → HTTP layer (validate → call service → respond)
[module].mapper.ts      → transforms DB documents to API response shape
[module].routes.ts      → Express Router + Swagger registration
```

Never skip a layer. Never merge them.

### Adding a new module

1. Create folder `src/modules/[domain]/[name]/` (or `src/modules/[name]/` if standalone)
2. Create all 6–7 files above
3. Register the router in `src/bin/app.ts` under `app.use('/api/v1/[name]', [Name]Router)`
4. Add this module's `*_PERMISSIONS` to the registry in `src/shared/env/permissions.ts`
5. Import the routes file in the Swagger config (side-effect import) so its paths register

---

## Request Flow

```
Route → AuthMiddleware (if protected) → AuthorizeMiddleware (if guarded) → Controller → Service → DB
                                                                                       ↘ Other Services
```

- **Routes**: define HTTP method + path, register Swagger, apply middleware
- **Controller**: parse & validate input, call service, send response — NO business logic
- **Service**: ALL business logic, DB calls, calls to other services — NO HTTP
- **Mapper**: strips internal fields, shapes the response — called in controller before responding

---

## Shared Utilities — USE THESE, DON'T REINVENT

### `ResponseHandler` (`src/shared/utils/responseHandler.ts`)
Single response shape for the entire app. Always use this in controllers.

```typescript
ResponseHandler.appResponse(res, StatusCodes.OK, true, 'message', data)
ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null)

// For paginated endpoints:
const meta = ResponseHandler.paginationResponseData(items, count, pagination)
```

### `RequestHandler` (`src/shared/utils/requestHandler.ts`)
Use in controllers for query parsing and pagination.

```typescript
const query = RequestHandler.parseQuery(req)          // extracts all query params
const pagination = RequestHandler.getPagination(req)  // { page, limit, skip }
```

Always pass both to the service as `options: { pagination }`.

### `throwAppError` / `AppError` (`src/shared/utils/error.ts`)
Never use `throw new Error(...)`. Always use:

```typescript
throwAppError('message', StatusCodes.NOT_FOUND)
throwAppError('message', StatusCodes.CONFLICT, { extra: 'data' })
```

Catch in controller: `catch (error: any) → error?.statusCode, error?.message`

### `formatZodError` (`src/shared/utils/error.ts`)
Use after `.safeParse()` failure to format field-level validation errors:

```typescript
const { data, success, error } = Schema.safeParse(req.body)
if (!success) {
    const validationErrors = formatZodError(error)
    return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
        fields: validationErrors,
    })
}
```

### `CookieHandler` (`src/shared/utils/cookies.ts`)
Never set cookies manually. Use:

```typescript
CookieHandler.setAccessToken(res, token)
CookieHandler.setRefreshToken(res, token)
CookieHandler.get(req, 'keyName')
CookieHandler.clear(res, AUTH_TOKENS.ACCESS_TOKEN)
```

Cookies are: `httpOnly: true`, `secure: true` in production, `sameSite: strict`.

### `TokenHandler` (`src/shared/helpers/tokenHelper.ts`)
Never call `jwt.*` directly. Use:

```typescript
TokenHandler.generateAccessToken(payload)   // { _id, email, role, tenant }
TokenHandler.generateRefreshToken(payload)
TokenHandler.verifyAccessToken(token)       // throws on invalid
TokenHandler.verifyRefreshToken(token)      // throws on invalid/missing
TokenHandler.decodePayload(token)           // decode without verify
```

`ITokenPayload` shape: `{ _id: string; email: string; role: string; tenant: string }`

### `logger` (`src/shared/utils/logger.ts`)
Never use `console.log`. Use logger everywhere. Backed by **pino** (`src/shared/logger/`);
`src/shared/utils/logger.ts` is a shim re-exporting it (both `import logger` and `import { logger }` work).

Pino's signature is **metadata object first, message second** — the reverse of the old logger. Passing `(msg, obj)` silently drops the object.

```typescript
import { logger } from '../../shared/utils/logger'
logger.info({ userId }, 'message')     // metadata object FIRST
logger.error({ err }, 'message')       // use the `err` key → expands stack via serializer
logger.info('message')                 // plain string is fine when there's no metadata
logger.debug({ meta }, 'message')      // only logs outside production
```

Levels: `silly, debug, info, warn, error, fatal` (no `success` — use `info`).
Prefer `ctx.logger` inside request handlers — it's the request-scoped child logger and auto-includes the request id.
HTTP request logging is automatic via the `pino-http` middleware (`src/shared/logger/httpLogger.ts`); don't log requests by hand.

### `RequestContext` (`src/shared/utils/contextBuilder.ts`)
Every request gets a context injected by the `buildContext` middleware. In controllers and services, always receive and thread it as `ctx: RequestContext`.

```typescript
const ctx: RequestContext = req.context
// ctx.user         → { _id, email, role, tenant } | null (set by AuthMiddleware)
// ctx.role         → populated role document | null (set by AuthMiddleware)
// ctx.tenant       → tenant id / document | null (set by AuthMiddleware)
// ctx.permissions  → string[] (merged from role.permissions + role.type.permissions)
// ctx.requestID    → UUID per request
// ctx.ipAddress    → client IP
// ctx.logger       → scoped logger
// ctx.meta         → { changes: string[] } — free per-request bag; `changes` holds the names
//                    of fields changed this request (push onto it in services, e.g. for events)
// ctx.setUser(userData)
// ctx.setRole(role)
// ctx.setTenant(tenant)
// ctx.setPermissions(permissions)
// ctx.requirePermissions(['perm'])  → throws 403 if missing
// ctx.hasAnyPermissions(['a', 'b']) → boolean
// ctx.hasAllPermissions(['a', 'b']) → boolean
```

---

## Validation — Zod Conventions

- Always use `.safeParse()`, never `.parse()`
- Validate in controller, pass typed data to service
- Schema naming: `[Action][Resource]PayloadSchema` (body), `[Action][Resource]QuerySchema` (query)
- Always add `.openapi({ example: '...' })` to each field for Swagger
- Infer type: `export type IActionResource = z.infer<typeof Schema>`
- Enum fields: reference constants, never hardcode strings

```typescript
// validators.ts
export const CreateXPayloadSchema = z.object({
    name: z.string().min(1).openapi({ example: 'test' }),
    type: z.enum([X_TYPES.A, X_TYPES.B]).openapi({ example: 'a' }),
})
export type ICreateXPayload = z.infer<typeof CreateXPayloadSchema>
```

---

## Constants Convention

Each module owns its string literals. Never hardcode strings used in schemas or models.

```typescript
// [module].constants.ts
export const USER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    DELETED: 'deleted',
}
export const USER_GENDERS = {
    MALE: 'male',
    FEMALE: 'female',
    OTHER: 'other',
}
```

Auth-shared constants (like cookie key names) live in `auth.constants.ts` and are imported by shared utils that need them.

---

## Model Convention (Mongoose)

- Use `InferSchemaType` for the TypeScript type: `export type IUser = InferSchemaType<typeof userSchema>`
- Always add `{ timestamps: true }` to schema options
- Default status to a known constant, not a raw string
- Sensitive fields (password) are `select: false` — use `getUserWithPassword`-style dedicated methods to fetch them

---

## Service Convention

Each service follows this internal structure:

```typescript
// Private "set" function — applies model fields to entity
const set = async (model: any, entity: HydratedDocument<IFoo>, ctx: RequestContext) => {
    if (model.name) entity.name = model.name
    // ...
    return entity
}

// Standard CRUD functions
const get = async (id: string, ctx: RequestContext, options?: any): Promise<FooDocument> => { ... }
const search = async (filters: ISearchFooQuery, ctx: RequestContext, options?: any) => { ... }
const create = async (model: ICreateFooPayload, ctx: RequestContext) => { ... }
const update = async (id: string, model: IUpdateFooPayload, ctx: RequestContext) => { ... }

export const FooService = { get, search, create, update }
```

- `get()` accepts both ObjectId and natural key (code / email) — branch with `isValidObjectID`
- `search()` runs `count` and `data` queries in `Promise.all`
- `create()` always checks for an existing record first
- Maintain a `const populate: any[] = []` at top of service for populate chains
- `set()` is always used for both create and update to avoid duplication

### Multi-tenant scoping — `ctx.where()` (READ THIS)

Every tenant-scoped read starts from `ctx.where()`, which returns a filter pre-seeded with the
actor's tenant (and other scope). Never query a scoped collection without it — it's what stops
cross-tenant reads and makes a forged foreign id 404 instead of leaking.

```typescript
const where = ctx.where()          // { tenant: <actor tenant>, ... } — or {} for god-mode
where._id = id
const doc = await FooModel.findOne(where)
```

- A `system:manage` actor gets an unscoped `where()` on purpose (deliberate skeleton key — don't
  "fix" its cross-tenant reach).
- Coherence checks compare against the entity's own tenant (`entity.tenant`), NOT `ctx`, so a
  system user still can't link records across tenants.
- Inventory registries (`inventory-master`/`inventory-device`/`inventory-consumable`) are
  intentionally NOT tenant-scoped (global catalogs). Everything else is scoped via `ctx.where()`.

### Transactions — `withTransaction`

Multi-write flows (create user + role, create division + head role, etc.) wrap in
`withTransaction` (`src/shared/helpers/transactionHelper.ts`). It uses an `AsyncLocalStorage`
session and mongoose's `transactionAsyncLocalStorage` is on — so every `save()`/query inside
**auto-enrolls** in the session; you never thread `session` by hand. Nested `withTransaction`
calls join the existing transaction rather than nesting.

> ⚠️ **Never run `Promise.all` of two DB ops inside a transaction** — MongoDB rejects parallel ops
> on one session ("cannot start a new transaction at the active transaction number"). Inside a txn,
> `search()` (which fires count+find in parallel) will crash — use a single `findOne` instead.

### Append-only stage journal (`stageHistory` + `moveStage`)

Pipeline entities (`lead`, `project`, `camp`, `appointment`) carry an embedded append-only
`stageHistory` array and expose a `moveStage` flow that pushes a new entry (stage + reason +
actor + timestamp) rather than mutating in place. Follow this pattern for any new pipeline entity.

---

## Controller Convention

```typescript
const create = async (req: any, res: any) => {
    try {
        const ctx: RequestContext = req.context
        const { data, success, error } = Schema.safeParse(req.body)
        if (!success) {
            const validationErrors = formatZodError(error)
            return ResponseHandler.appResponse(res, StatusCodes.BAD_REQUEST, false, 'Validation Error', {
                fields: validationErrors,
            })
        }
        const result = await FooService.create(data, ctx)
        return ResponseHandler.appResponse(res, StatusCodes.CREATED, true, 'Created successfully', FooMapper.toResponse(result))
    } catch (error: any) {
        return ResponseHandler.appResponse(res, error?.statusCode, false, error?.message, null)
    }
}

export const FooController = { get, search, create, update }
```

- Always export as a named object `FooController`, never default export
- Same for all exports: `FooService`, `FooMapper`, `FooRouter`

---

## Routes Convention

```typescript
export const FooRouter = express.Router()

// Apply auth middleware router-wide (all routes protected):
FooRouter.use(AuthMiddleware)

// Or per-route:
FooRouter.post('/create', AuthMiddleware, FooController.create)

// Always register Swagger path in same file, above the route definition
registry.registerPath({ method: 'post', path: '/foos', tags: ['FOO'], ... })
```

Swagger must be registered in the routes file because `swagger.config.ts` imports route files as side effects.

---

## Auth System

- **Access token**: 15 min, stored in `accessToken` httpOnly cookie
- **Refresh token**: 7 days, stored in `refreshToken` httpOnly cookie + `user.refreshToken` in DB
- **Token rotation**: every refresh generates new access + refresh token pair; old refresh token in DB is replaced
- **Account lockout**: 5 failed logins → 10-minute lockout (`loginAttempts`, `lockUntil` on User model)
- **AuthMiddleware** (`src/shared/middlewares/authmiddleware.ts`): verifies access token, looks up the role from DB (with type + tenant populate), sets `ctx.user`, `ctx.role`, `ctx.tenant`, and merges `role.permissions + role.type.permissions` into `ctx.permissions`. Apply to all protected routes.
- **AuthorizeMiddleware** (`src/shared/middlewares/authorizeMiddleware.ts`): permission guard, applied after `AuthMiddleware`. Takes a permission list and a mode (`'AND'` | `'OR'`). Use `'AND'` (default) to require all, `'OR'` to require any.
- **Logout order**: clear DB session first, then clear browser cookies

```typescript
// Usage in routes:
FooRouter.post('/create', AuthMiddleware, AuthorizeMiddleware(['foo:create'], 'AND'), FooController.create)
FooRouter.get('/',        AuthMiddleware, AuthorizeMiddleware(['foo:read', 'foo:manage'], 'OR'), FooController.search)
```

### System User Seeding (`src/shared/env/seedSystemUser.ts`)

Called on app startup. Idempotent — skips any step where the record already exists.

Order: system tenant → permission group → role type → user → role.

Env vars required: `SYSTEM_USER_EMAIL`, `SYSTEM_USER_PASSWORD`, `SYSTEM_USER_PHONE`

**Platform admin role type permissions (2026-10-23, branch `qa`):** the QMS **platform** admin role type (`tenantAdminRoleType`, §4.2) now carries `tenant:manage`, `tenant:admin`, `role-type:manage`, `role:manage`, `lead:manage`, `project:manage` and is **full-synced on every boot** (like `provisionDefaultRoleTypes` — applies additions + removals so an existing admin role type picks up new perms on restart, not only on first creation). Net-new vs before: `role:manage`, `lead:manage`, `project:manage` (closes the Bug-8 gap where admin lost project access after `tenant:manage` was removed from project routes). Granted on the **role type** (not the seeded admin role) so every platform admin-typed role inherits them (the admin role itself keeps empty role-level perms and inherits via `role.permissions ∪ roleType.permissions`). **Platform-only** — resolved as `{code:'admin', tenant: <system tenant>}`; **customer tenants get their own separate admin role type** (minted in `tenant.service.ts createTenant`) and are unaffected.

### Permissions Registry (`src/shared/env/permissions.ts`)

All module permissions are aggregated here. Each module exports its own `*_PERMISSIONS` constant and it must be added to the `PERMISSIONS` object.

```typescript
import { PERMISSIONS, PERMISSIONS_ARRAY } from '../../shared/env/permissions'
// PERMISSIONS_ARRAY → flat string[] of all permission codes — used for validation in role.service
```

---

## Mapper Convention

Never return a raw Mongoose document to the client. Always strip through a mapper.

**`toSearchResponse` MUST be decoupled from `toResponse`** — inline the search-row fields
independently, do NOT call `toResponse` from inside it. This lets a module trim its search-row
shape (lighter list payloads) later without changing `GET /:id`. All 31 existing mappers were
decoupled this way on 2026-09-29 (commit `8b3c7dc`); follow this for every new mapper.

```typescript
export const FooMapper = {
    toResponse: (doc: HydratedDocument<IFoo>) => ({
        id: doc._id.toString(),
        // only safe, public fields
    }),
    // decoupled — fields inlined, NOT `data.items.map(FooMapper.toResponse)`
    toSearchResponse: (data: { count: number; items: HydratedDocument<IFoo>[] }) => ({
        count: data.count,
        items: data.items.map((doc) => ({
            id: doc._id.toString(),
            // same safe, public fields — or a trimmed subset for list views
        })),
    }),
}
```

---

## File Naming

Files use `[module].[layer].ts` — dot-separated. Single-word modules are lowercase; **multi-word
modules use camelCase for the prefix** (matching the exported symbol), even though the folder is
kebab-case:

```
user.model.ts            role-type/    → roleType.service.ts
role.service.ts          permission-group/ → permissionGroup.model.ts
                         operations/geoProfile/ → geoProfile.routes.ts
                         qa-feedback/  → qaFeedback.controller.ts
```

## Code Style

- **Braces on every `if`**, even single-statement one-liners — readability over line count.
- Never use `console.log` (use `logger` / `ctx.logger`) or `throw new Error` (use `throwAppError`).

---

## What's Done

All modules follow the layered convention above; all are wired in `src/bin/app.ts`.

| Domain | Module | Route base | Notes |
|---|---|---|---|
| — | auth | `/auth` | login, logout, refresh-token, reset-password (self), forgot-password (tenant:admin) |
| — | user | `/users` | linked 1:1 to a Role; registers inactive by default. **`profilePicture` (2026-10-04)** — optional `ObjectId` ref → **file** module (entity `user→profile_picture`); kept alongside legacy flat `avatar` ({url,id}). Wired: `user.service` populate `[{path:'profilePicture'}]` + `set()`; `UpdateUserPayloadSchema` accepts a `File` id; `user.mapper` returns **both** `avatar` + `profilePicture` (populated). Auth too: `auth.mapper.toResponse` returns `profilePicture`; `auth.service.session` uses `{populate:true}`; `getUserWithPassword` populates it → login + `/auth/me` carry it (refresh returns tokens only) |
| — | counter | `/counters` | global atomic `$inc` sequence → prefixed padded codes (ld-/prj-/cmp-/mtg-/phr-/inv-/**tst-**/**pat-**/**clt-** (tenant)/**div-** (division)/**rol-** (generic role fallback)). Entity must be in BOTH `COUNTER_ENTITY_TYPES` (model enum) AND `seedCounters` — a missing enum entry fails boot |
| — | qa-feedback | `/qa-feedback` | QA feedback |
| access-management | tenant | `/tenants` | types: `platform` / `customer`; **`code` auto-generated (2026-10-08)** from the global `tenant` counter (`clt-000001`), immutable, dropped from the create payload (was a caller-supplied natural key); owner auto-activated on create; optional updatable `salesPerson` (Role ref) — assign on create, reassign/unassign (null) on update, validated to exist AND be a `sales-rep` role type; optional embedded `address` (subdoc, own `coordinates` 2dsphere); optional `businessLifetime` (Number) + `gst` (String — **GSTIN format validated in the VALIDATORS only**, model stores plain string). **Search filters/report (2026-09-29):** added `city`/`state` regex filters over the embedded `address`; the per-tenant `report` rollup (`getTenantStats`) now also returns `mrs` (field-force role count per tenant) alongside total/live projects & total/live/screening/diet camps. **(2026-10-05)** the rollup also returns **`totalDivisions`** (batched `DivisionModel` aggregate added to the same `Promise.all`). **`salesRep` search filter (2026-10-23, UNCOMMITTED):** `GET /tenants?salesRep=<roleId>` returns tenants where `salesPerson` is that rep **OR** unassigned (`$or: [{salesPerson: id}, {salesPerson: null}]`; null matches missing too). Powers the New Lead company picker — the rep passes their own role id → sees only companies they can start a lead on (no submit-time 403 surprise). Filter narrows results without exposing the raw `salesPerson` owner id, so no mapper change / no privacy leak. **Bulk client import (2026-10-27, UNCOMMITTED, e2e 14/14 live DB):** **`POST /tenants/bulk`** — multipart CSV (file field `file`), guarded `tenant:manage`/`system:manage` (platform-only, same as single create), declared before `POST /`. `TenantService.bulkCreate(file, ctx)` = `CsvHelper.parse` → **single `Promise.all` over ALL rows** (not `processInBatches` — user's call): each row → `rowToTenantPayload` → `CreateTenantPayloadSchema.safeParse` → `createTenant` (full txn per row); each row catches its own error so one bad row never aborts the rest. Returns `{ totalRows, created, failed, errors[] }` (schema-invalid + create-failed merged; 400 if any error, 200 if clean). **Customer-only** is automatic — `type` never set → model default `customer` → pharma role types provisioned. `salesPersonEmail` column resolved at runtime (`resolveSalesPersonByEmail`: email → user → `sales-rep` Role, global) and **silently skipped if unknown/not-a-sales-rep** (client still imported, unassigned). **No in-file owner-email dedup** — a duplicate owner email loses at the DB unique index, reported as a failed row. CSV cols: `name`/`ownerFirstName`/`ownerEmail`/`ownerPassword` (req) + optional `description`/`gst`/`businessLifetime`/`ownerLastName`/`ownerPhone`/`ownerGender`/`salesPersonEmail`/address. ⚠️ `Promise.all` over all rows = many concurrent `createTenant` txns all `$inc`-ing the shared `tenant` counter → possible transient `WriteConflict` on large files (fine for modest imports). See [[tenant-bulk-import]] |
| access-management | permission-group | `/permission-groups` | per-tenant permission ceiling |
| access-management | role-type | `/role-types` | `isSystem` defaults seeded per tenant; reserved-code guard. **Search-filter scoping fix (2026-10-23, UNCOMMITTED):** `tenant`/`status` filters were gated behind `tenant:manage`/`admin` → silently dropped for a `role-type:search` reader (Sales Head) → Division MRs tab resolved the wrong tenant's `pharma-mr` ("0 MRs"). Now `tenant` filter honoured for a **platform actor** (`ctx.tenant?.type === PLATFORM`; customer stays pinned by `ctx.where()`); `status` defaults to **active** for everyone, platform actor may override (customer active-only). Note: `create()`'s dup-check calls `search()` → now sees the active default, but the `{tenant,code}` unique index is the backstop |
| access-management | role | `/roles` | 1:1 with User; optional `division` (customer-only) + `supervisor` self-ref. **`code` auto-generated when omitted (2026-10-08):** supplied code honored; else pharma field-force (MR/ASM/RSM) → `phr-` counter, every other role type → generic `rol-` counter (was a `"code is required"` 400). The tenant admin (`admin`), division head (`${division.code}-head` → `div-000001-head`) and seeded system (`system`) roles pass explicit meaningful codes → never hit the fallback. Role code is a natural-key/display id only — all matching (supervisor tree, single-admin guard, division rules) keys off the role-**type** code, not the role code |
| access-management | employee | `/employees` | **tenant-scoped HR registry**, linked 1:1 to an existing `user` (+ unique `{tenant,email}`/`{tenant,user}`). Holds HR data: `type` = **employment type** (`full-time`/`part-time`/`contractual`/`freelance` — NOT the system role, which lives on the linked user's Role), `doj`/`dol`, `salary` + `daRule` (fixed/percentage), KYC (`aadhar`/`pan`), `bankDetails`, embedded `location` (2dsphere), `profile`, `supervisor` self-ref, `status` (active/inactive/terminated). **Does NOT create a Role/geoProfile** — only links a user (role+geo setup is separate). **Gated by ROLE TYPE (RoleGuard), not permission codes** (perms reserved for later): manage (create/update) = admin + OM-screening + OM-diet; read (get/search) = those + **field-officer + dietitian** (own-record only via `ownScope`, which pins `SELF_ONLY_ROLE_TYPES` = FO+dietitian to `{user: ctx.user._id}`). Customer actors pinned to own tenant; platform supplies tenant. **Platform-only create (2026-10-27, UNCOMMITTED):** `create()` now calls `assertPlatformTenant(tenantId, ctx)` after resolving the owning tenant — fetches via `TenantService.get` and **403s if `tenant.type !== PLATFORM`**. Employees = QMS internal staff, so customer/pharma tenants are blocked outright, closing the gap where a **customer admin** (role-type code is also `'admin'` → passes the create `RoleGuard`) could make employee records. `update()` deliberately unguarded (`tenant` is immutable → no customer-tenant record can exist to update). **Department → designation map (2026-10-27, UNCOMMITTED, constants only):** `EMPLOYEE_DEPARTMENTS` (lowercase: marketing/purchase/account/logistic) + `DESIGNATIONS_BY_DEPARTMENT` (each designation `{key: lowercase no-space, name: UI label}`; marketing has its own 14-step ladder, the rest share executive/manager/head/other). Mirrors the appointment/contact department→designation dropdown; **enforced in the contact `set()`** (see contact row) |
| crm | division | `/divisions` | therapy/brand division (`therapy` is a **non-empty, duplicate-free array** — multiple therapy areas per division; validated in validators + model); **`code` auto-generated (2026-10-08)** from the global `division` counter (`div-000001`), immutable, dropped from the create payload (head role code is now `div-000001-head`); create also mints a pharma-division-head role + user. (`brandFocus` field **removed 2026-09-09** — brands are now their own entity). **Report (2026-09-29):** `report=true` returns per-division `stats` (`totalProjects`/`liveProjects`, one `Project` aggregate for the page). **`get()` tenant-scoping fix (2026-10-14, UNCOMMITTED):** `DivisionService.get()` now starts from `ctx.where()` (was a raw unscoped `findById`/`findOne({code})` → cross-tenant read **and write** leak — a customer `tenant:admin` could GET/PUT another company's division and create a brand inside it via `BrandService.create`, which derives tenant from the resolved division). Platform actors unchanged (`where()` = `{}`); customer actors pinned to own tenant → foreign id 404. Fixes every internal caller (lead/doctor/role/contact/camp/appointment) in one place. **Live MR count (2026-10-23, UNCOMMITTED):** `GET /divisions?report=true` stats now include **`mrs`** — a live per-division count of `pharma-mr` roles (`getDivisionStats` runs a RoleModel aggregate grouped by division alongside the project aggregate, mirrors `getTenantStats`; sums to the tenant MR total). Replaces reliance on the stale stored `mrCount` field (never updated on MR create — left on the model; frontend drops its input) |
| crm | brand | `/brands` | pharma **brands per division**; tenant-scoped, **tenant DERIVED from the division** (never from payload). `name` (lowercase+trim); **`code`** = name lowercased + ALL whitespace stripped (`toCode()`), **derived by service, set ONLY on create, immutable** (update never touches it → name editable but code frozen); `description`/`molecule`/`notes`/`color`; `active`/`inactive`. **Unique index `{tenant,division,code}`** (same code allowed in a different division). Create dedup **reuses `BrandService.search({division,code})`** (added an exact-match `code` search filter; the `name` filter stays partial regex). Route guards mirror `contact` (writes `brand:manage`/`tenant:manage`/`tenant:admin`; reads add `brand:search`). Perms `brand:manage/search/create/update/get` — granted read to `sales-rep` + all 4 pharma role types; manage to `sales-head` + both ops-managers |
| crm | lead | `/leads` | stageHistory + moveStage; tenant from division. Search supports **`fyFrom`/`fyTo`** date filters (2026-09-08) bounding the lead's `createdAt` (financial-year range; `z.coerce.date` + `fyFrom<=fyTo` refine in validators; service normalizes to inclusive UTC-day bounds via `startOfUTCDay`/`endOfUTCDay`, placed before own-scope). **Search filters/report (2026-09-29):** added `code` (regex) + `focusTherapy` (regex, matches any element of the lead's therapy list) filters (no combined `q` — frontend combines); `report=true` on **search** attaches per-row `stats.followUps` = count of every appointment linked to the lead (batched `$in:leadIds` aggregate over `AppointmentModel`, own-scoped). Distinct from the existing `GET /leads/report` summary facet. **`GET /leads/report` KPI strip (2026-09-29):** the report `$facet` now also computes a `kpis` block — `pipelineValue` (Σ estimatedValue open), `avgDealSize` (avg won, all-time), `wonValue`/`wonCount` (won within from/to), `winRate` (% within from/to), `salesVelocityDays` (avg created→won, all-time), `topRep` ({salesPerson,name,wonValue,wonCount} via roles $lookup, all-time); windowed tiles use the endpoint's `from`/`to` input; Avg AI Score omitted (no model). Frontend wiring pending. **Terminal-lead edit block (2026-10-23, UNCOMMITTED):** `update()` now rejects any edit to a **won/lost (terminal) lead** → **409** (uses the existing `TERMINAL_LEAD_STATUSES`, derived from the transition map) so historical KPIs (`wonValue`/`avgDealSize`/`topRep`) can't be silently rewritten after close. `moveStage` untouched (terminal leads have no outgoing transitions anyway) |
| crm | project | `/projects` | one-project-per-lead; tenant/division derived from lead; `campTimeSlots` restricted to the 4 fixed `CAMP_TIME_SLOTS` (imported from camp module); **own-scoping** in get/search — customer-tenant actor → own division (`role.division`), platform rep without `project:manage` → own projects (`salesRep`); optional `tenant` search filter honoured only for a not-tenant-pinned `project:manage` actor. **Search filters/report (2026-09-29):** added a `code` regex filter (case-insensitive); `report=true` returns a per-type breakdown `{total, byType[]}` over the scoped+filtered set **plus** per-project `stats.executedCamps` (closed + cancelled_charged camps — the "done" count vs the project's `totalCamps` quota; one `CampModel` aggregate for the whole page). **`PROJECT_TYPES` (2026-10-03)** redefined to `screening`/`diet`/`lab`/`teleconsultation_diet` (removed `mixed` — `type` is an array, so "mixed" = multiple entries); a camp's `type` must be one the project offers. **`executionMode` regrouped + multi-PO (2026-10-04):** the execution-mode subdoc is now `{ mode, po: { purchaseOrders: [{number, date, expiry, file}] }, agreement: {number, startDate, endDate, duration, file}, mail: {reference, file} }` — **supports MULTIPLE POs**, and each PO/agreement/mail carries a **`file`** `ObjectId` ref → **file** module (populated via `executionMode.po.purchaseOrders.file` / `.agreement.file` / `.mail.file`). This also **fixed a latent bug**: execution mode never persisted before — the payload key was `mode`, the service wrote top-level `entity.mode` (dropped by strict mode) and the mapper read `project.mode` (always null). Now the payload key is **`executionMode`**, the service assigns the whole subdoc, and the mapper returns `executionMode`. ⚠️ API change (was flat `mode:{poNumber,...}`) + invoice card must read `executionMode.po.purchaseOrders[0].number`. **Permission rework + salesRep default (2026-10-23, UNCOMMITTED):** `tenant:manage` **removed from all project routes** — project is now gated purely on `project:*` (user: "not of this domain"). Routes: `POST`→`[manage, create]`, `PUT`→`[manage, update]`, `PATCH /:id/stage` + `GET /report`→`[manage]`, `GET /:id` + search→read-guard (`search`/`camp:book`/`manage`). Grants: **sales-rep** `project:create`+`project:update`, **sales-head** `project:manage` (`defaultRoleTypes.ts`). `create()` now **derives `salesRep` from the lead's `salesPerson`** (source of truth, not the creator); `set()` gates any `salesRep` change behind `project:manage` → only Sales Head reassigns, and a rep's **create payload must OMIT `salesRep`** (else 403). "Rep creates from own lead only" is auto-enforced by lead own-scope (`LeadService.get` 404s a non-owner's lead). Set-LIVE (moveStage) stays manager-only = Sales Head; the seeded admin role type will get `project:manage` later (currently loses project access since `tenant:manage` no longer counts — system god-mode unaffected) |
| crm | appointment | `/appointments` | stageHistory + moveStage (each move records its own `nextSteps`); parent self-ref for follow-ups; statuses = planned/done/cancelled/released (no `blocked`). **Own-scope fix (2026-10-14, UNCOMMITTED):** `applyOwnScope` now keys on "is this actor NOT a full manager (`appointment:manage`/`tenant:manage`)?" instead of "does it hold `appointment:search`?". Before, an actor reaching the service via a different lesser permission — `appointment:update` (on the `PUT /:id` + `PATCH /:id/stage` guards) — without `search` got NO own-scope → could read/edit/change-status of every appointment in its tenant (latent: seeded roles bundle search+update; exploitable via a custom update-only RBAC role). All writes load through the own-scoped `get()`, so this one helper guards them all; added `TENANT_PERMISSIONS` import so `tenant:manage` admins keep full visibility. **MoM gate (2026-10-23, UNCOMMITTED):** `moveStage()` to `done` now **422s when `mom.details` is empty/blank** (was frontend-only; MoM is saved via `PUT /:id` first). **Double-booking guard (2026-10-23, UNCOMMITTED):** `MEETING_MIN_GAP_HOURS=1` + `assertSalesPersonFree()` — a sales person's PLANNED meetings must be ≥1h apart (start-time only, **global** across tenants since a sales person serves many companies, exactly-1h allowed via exclusive bounds); enforced in `create()` + `update()` (on start-time change) → **409**. **Outcome field (2026-10-28, UNCOMMITTED, `tsc` clean):** new optional embedded `outcome {title, reason}` — `title` enum `APPOINTMENT_OUTCOME_TITLES` (converted-to-lead/not-interested/not-responding/will-update-later), `reason` free text. **Update-only** (dropped from the create payload; `OutcomeSchema` wired into `UpdateAppointmentPayloadSchema` only). `set()` guards it: can be recorded only when the appointment is already **`done` or `cancelled`** → **422** otherwise (so it can't be set on a still-planned appointment; also blocks it at create, where status defaults to planned). Returned in both mapper shapes |
| crm | contact | `/contacts` | tenant(+optional division)-scoped people registry, optional user/login link; division required for pharma (customer-type) contacts & validated against tenant; `type` immutable after create. **`department` (2026-10-27, UNCOMMITTED):** optional string field (mirrors `designation`) — model + create/update validators + `set()` + mapper (toResponse/toSearchResponse); NOT a search filter. **Department→designation tree check (2026-10-27, UNCOMMITTED):** `set()` validates the resulting (department, designation) pair against `EMPLOYEE_DEPARTMENTS`/`DESIGNATIONS_BY_DEPARTMENT` (employee constants) whenever either field is in the payload — unknown department → 400, designation without department → 400, designation key not under that department → 400. Values are the lowercase **keys**. Untouched when neither field is sent (legacy free-text rows still editable). Create/update **validators** also enum-check them: `department` = `EMPLOYEE_DEPARTMENTS` values, `designation` = the de-duplicated union of all designation keys (`DESIGNATION_KEYS`); the pairing itself stays in the service |
| crm | doctor | `/doctors` | tenant-scoped registry (`ctx.where()`); `pharmaCode` immutable natural key, unique per tenant `{tenant, pharmaCode}` (email also unique per tenant); tenant pinned on create (platform supplies, customer own-tenant), open reads / manage-guarded writes. **`create` translates E11000 → clean 409** (race-safe). **`POST /doctors/bulk`** — CSV upload (multipart, file field `file` + optional `tenant`), guarded `doctor:manage`, mirrors MR bulk (CsvHelper→per-row schema validate→`processInBatches(create,5)`); **in-file pharmaCode dedup** (first wins) + invalid/failed rows surfaced in `errors[]`. NOTE stale "global" text in swagger + flat location fields (not the embedded `address` pattern) — flagged, not migrated. **MR-add-doctor (2026-10-05, `9cc2edc`):** new lighter **`doctor:create`** perm (in addition to `doctor:manage`); the create route is now `AuthorizeMiddleware([doctor:create, doctor:manage], 'OR')`; the **pharma-mr role type is granted `doctor:create`** so an MR can add a doctor — `create()` already forces a customer/field-force actor's doctor into their OWN division (`ctx.role.division`; foreign/mismatched div → 403) and reads are division-own-scoped. ⚠️ existing customer tenants are NOT re-provisioned on boot (pharma re-sync loop in `seedSystemUser.ts` is commented out), so only NEW tenants' MR role types auto-get the perm. Bulk upload stays `doctor:manage`-only |
| operations | camp | `/camps` | stageHistory + moveStage; tenant+division required, project optional; optional `tenant` search filter honoured only for a not-tenant-pinned `camp:manage` actor. **FO slot-overlap** primitives (`SLOT_OVERLAPS`/`overlappingSlots`/`isFoBookedForSlot`/`assertFoAvailableForSlot`): 3 daytime slots (9am-1pm/10am-2pm/11am-3pm) overlap each other, evening (6pm-10pm) alone; `create`+`update` hard-block (409) a supplied FO already booked (confirmed/live) on an overlapping slot that day; `moveStage` confirm-guard + auto-assign use the same rule. **`POST /camps/booking-availability`** (guard `camp:book`; a customer-tenant service guard exists but is currently commented out): validates `projectID` belongs to the caller (`ProjectService.get` scoped → foreign project 404); reports per-day/per-slot FO availability for the point+range (≤15 days). FO `$geoNear` + camps lookups are intentionally NOT tenant-scoped (FOs are global platform staff; an FO booked by any pharma is unavailable to all). Slots reported = the project's `campTimeSlots` (fallback: all 4). Response `data.dates` is a **map keyed by `YYYY-MM-DD`** → `{available, slots}`. **FO ALLOCATION is GLOBAL across create/book/allocate (2026-09-14):** `POST /camps/book` runs `create()` under the pharma CUSTOMER ctx, so the FO geo lookup (`nearestFoProfilesGlobal`), FO role validation (`RoleModel.findById().populate('type')` + field-officer assert — NOT `RoleService.get(ctx)`), and clash checks (`bookedFoRoleIdsOnDate`/`isFoBookedForSlot`, no `ctx.where()`) are all platform-wide — otherwise a pharma booker saw 0 FOs and the camp saved with `fo:null`. Pharma authorization + camp ownership stay customer-scoped. **Dietitian / diet-camp parity (2026-10-03, committed `3a0ed2c`/`cdda34b`, e2e 18/18 live rs0):** a camp is staffed by ONE worker kind decided by its `type` — diet → new `dietitian` Role field, else `fo`. All allocation/clash/availability is generalized via a `FieldWorker` descriptor (`FO_WORKER`/`DIETITIAN_WORKER` + `workerFor(type)` — the single branch) and kind-blind helpers (`isWorkerBooked`/`assertWorkerFree`/`bookedWorkerIds`/`nearestProfiles`/`resolveNearestFreeWorker`/`assertWorkerRole`). Supplying the wrong assignee field for the type → 400. `allocateFo` → **`allocateWorker`**; `booking-availability` gained optional `type` (default screening→FO). `type` is now **IMMUTABLE** (dropped from update payload). Camp `type` must be one the linked project offers (`project.type[]` must include it; `teleconsultation_diet` hosts no physical camp) — enforced in `create()` (covers `book()`). Standalone types moved to `camp.types.ts`. **Consumption still DEFERRED** (no diet-session/test; FO stock deduction is screening-only). **`GET /camps/my` (2026-10-05, `26f3f74`+`2a6cab6`):** field-force (FO/dietitian/MR) list their OWN camps — `CampService.myCamps` wraps `search` (forces `report=true` → per-camp patient stats) + a top-level **`summary`** (`getMyCampSummary`: totalCamps + statusCounts + typeCounts over the caller's own-scoped set, independent of filters/page); route `RoleGuard([FIELD_OFFICER,DIETITIAN,PHARMA_MR])`, declared before `/:id`. Camp **`applyOwnScope` refactored**: FO→`fo`/dietitian→`dietitian`/MR→`mr` scope to their SPECIFIC slot (map by role-type code); asm/rsm keep the all-slots `$or`; division-head + manage branches unchanged. **Booking-availability device gate (2026-10-05, `9cc2edc`):** extracted shared `rolesHoldingAllDevices(roleIds, requiredDeviceItems)` (one batched `InventoryAssignment` read; only `status:'assigned'` units count), refactored `resolveNearestFreeWorker` to use it, and added the SAME gate to `bookingAvailability` — eligible FOs are now also narrowed to those holding every device the project's tests require (closes the "available at booking, rejected at allocation" gap). **Void camps (2026-10-05, `6f28075`):** **`POST /camps/void-camp`** (guard `camp:manage`/`tenant:manage`) records a camp done WITHOUT a PO (WF-4) — `billingType` forced `void`, lands directly in `requested` (NO auto-allocation/clash/auto-confirm), `mr`+`project` OPTIONAL (model `mr` field made optional; normal create/book validators still require it). New free-form **`meta`** (Mixed) field on the model — optional at model level, but the void route's validator REQUIRES `meta.mailUrl`. **`PATCH /camps/:id/approve-void`** (`approveVoidCamp`, guard `camp:manage`/`tenant:manage`) — void camps use ONLY `requested`→`closed`; approval moves it directly (bypassing the normal transition map), recorded in stageHistory (approver=`actor`, time=`createdAt`, `reason`); rejects non-void (400) / non-requested (409). Mapper now returns `meta`. **Start camp — field-staff self-activate (2026-10-14, UNCOMMITTED):** **`PATCH /camps/:id/activate`** lets the camp's ASSIGNED field worker start their own camp (`confirmed → live`) on site. **Role-gated, NOT permission-gated** — `RoleGuard([FIELD_OFFICER, DIETITIAN])` (no `camp:activate` perm; FO+dietitian already hold `camp:get/search` which the own-scoped `get()` needs). `CampService.activate()` enforces server-side: own-scoped `get()` **plus** explicit ownership via `workerFor(camp.type)` (`camp[worker.field] === ctx.role._id` → 403), status must be `confirmed` (409), and a **scheduled-date gate** `new Date() < startOfUTCDay(camp.date)` → 422 (same calendar day allowed). Delegates the actual confirmed→live move to **`moveStage`** (not a copy-paste like `approveVoidCamp` — honors "moveStage is the only status path"). Only ever does confirmed→live; no confirm/cancel/close/reassign/edit reachable through it. **Diet camps: NO auto-allocation (2026-10-27, UNCOMMITTED):** `create()`'s best-effort auto-assign block is now guarded `&& worker !== DIETITIAN_WORKER` — the internal team allocates the dietitian themselves (manual pick / `allocateWorker`). FO (screening/lab) auto-allocation unchanged; a dietitian supplied at booking still validates-free + auto-confirms. **Dietitian full-time-employment gate (2026-10-27, UNCOMMITTED):** inside `resolveNearestFreeWorker` (after the free filter, before the device gate), for `worker === DIETITIAN_WORKER` only, candidates are narrowed via `rolesWithFullTimeEmployment(roleIds)` (role → `user` → `EmployeeModel.findOne({user, type: full-time})`, global; same shape as `rolesHoldingAllDevices`) → none qualify → 409. The same full-time gate is ALSO applied in **`bookingAvailability`** (step `2c`, mirrors the device gate) so availability never lists a dietitian allocation would reject — the check runs in BOTH worker-selection paths. ⚠️ GAP: a **directly-supplied** dietitian (passed on create/book/update → `assertWorkerRole` in `set()`) is validated for role-type + slot-free only, **NOT** full-time — and since diet camps don't auto-allocate, manual supply is the actual assignment path (gap flagged, unclosed). (Pairs with [[employee-module]] platform-only create + [[tenant-bulk-import]].) **Coordinator own-scope by camp TYPE (2026-10-27, UNCOMMITTED):** `applyOwnScope` scopes **camp coordinators by camp type** via `OWN_SCOPE_TYPE_BY_ROLE_TYPE` — `camp-coordinator-screening` → only `type:screening`, `camp-coordinator-diet` → only `type:diet`; placed after the manage-actor check (a coordinator with `camp:manage` stays unscoped), before the FO/dietitian/MR slot scoping. Coordinators are platform staff → `ctx.where()` `{}` → they see their camp type across ALL tenants. **`search()` now applies `applyOwnScope` LAST (2026-10-27, UNCOMMITTED, e2e-verified live DB)** — before, it ran first and the `type`/`fo`/`dietitian`/`division` filters overwrote it (a screening coord passing `?type=diet` saw every diet camp; an FO passing `?fo=<other>` saw that FO's camps). Now the scope wins; known nit: a filter that CONFLICTS with the scope is silently replaced (screening coord `?type=diet` → their screening camps, not 0) — fix would be pushing the scope into `$and`. **`allocateWorker` now auto-confirms (2026-10-27, UNCOMMITTED, not e2e'd):** after `update()` sets the worker it calls `moveStage(→confirmed)` (re-checks the slot clash, records stageHistory) and returns the populated camp — mirrors create()'s auto-confirm, matters most for diet camps (no auto-allocation at create → allocation is the normal path). A plain `PUT` that sets the worker still does NOT auto-confirm |
| operations | geoProfile | `/geo-profiles` | field-staff geo (2dsphere); `findNearest` ($geoNear) feeds camp allocation. Carries a **flat address** (2026-09-08): `addressLine1`/`addressLine2`/`locality`/`city`/`state`/`country`(default India)/`pincode`/`googlePlaceId`, all optional, spread FLAT (not nested) so NO second 2dsphere index is created — the top-level `coordinates` doubles as the address geo point, keeping `$geoNear` on a single geo index. Controller/routes unchanged (schema-driven). `findNearest` busy-check is now **type-aware** (checks `camp.dietitian` for dietitian profiles, `camp.fo` otherwise); a dietitian role can already hold a geo profile (no model change needed — `GEO_PROFILE_TYPES.DIETITIAN` exists) |
| operations | testMaster | `/test-masters` | **global catalog** (no tenant); `code` auto-generated from `test-master` counter (`tst-`), immutable natural key; `therapy` (project therapy enum), `duration`/`price`, `config.inputs[]` (validator mirrors the model exactly — `type` enum from `TEST_MASTER_CONFIG_INPUT_TYPE`), `consumption[]` (InventoryMaster + rate; device rate defaults 0); `active`/`inactive` (manage-gated). Reads guarded `test-master:get`/`search` (or manage); writes `manage`. FO granted read; ops-managers granted manage |
| operations | patient | `/patients` | **global registry** (no tenant, per decision); `code` auto-generated from `patient` counter (`pat-`), immutable; `email` optional + lowercased + **sparse-unique**; names trimmed (not lowercased); `dateOfBirth`/`gender`/`mobile`; embedded `address` (`_id:false`); `createdBy` (Role); `active`/`inactive` soft-delete (manage-gated). Perms `patient:manage/create/search/get/update`, reads locked. `create` granted to both camp-coordinators; **field-officer granted create/get/search/update** (full CRUD, reads own-scoped at the camp) |
| operations | screening | `/screenings` | **tenant-scoped**, tenant DERIVED from the camp; one screening per (tenant,patient,camp) unique; `stageHistory` + `moveStage` (`pending→completed/cancelled`, seeds a created entry); **`performedBy`** (Role, **required**) pinned at create = the camp's assigned FO (`camp.fo`) — safe-required because create is gated on camp `live` and a camp can't go live without an FO (service still guards with a clean 409 if absent); embedded `consent` (now just `{verified, signature}` — the OTP code lives in the **otp** module, 2026-10-04); completion gated on `consent.verified` (422); create gated on camp `live` (409). **Consent OTP via the otp module (2026-10-04):** two routes — `POST /:id/request-consent-otp` (issues/reissues the OTP via `OtpService.request`, delivered to the patient's mobile; **TEMP** returns the code in the response until a delivery sender exists) and `POST /:id/verify-consent` (matches via `OtpService.verify`, then sets `consent.verified`). Both authorize the assigned worker (or manage) + block when already verified. Create no longer issues the OTP. e2e 10/10 live rs0. **Create/mutate:** only the assigned FO (`camp.fo`) or a manage actor (`assertAssignedFoOrManage` via `loadCampForAction`). **Read own-scope:** non-`screening:manage` actor is pinned to their own `performedBy` in get/search (`applyOwnScope`, applied up-front in search since widening filters are manage-gated) — so a non-assigned FO 404s on get and mutations too. Optional `performedBy` search filter, **honoured only for a manage actor** (like `tenant`). Reuses `CampService.get` (populated fo) + `ScreeningService.search` (dedup) via shared `loadCampForAction`. Perms `screening:manage/create/search/get/update`; **FO granted create/get/search/update** (reads own-scoped) |
| operations | test | `/tests` | **per-screening test result**; refs `screening`/`type` (TestMaster)/`tenant` (from screening)/`performedBy` (acting role); only `result` (`{key,value,unit,interpretation?}`) editable — rest pinned at create. **Gates:** camp must NOT be terminal — no test once the camp is `closed`/`cancelled`/`cancelled_charged` (409); screening must be `completed` (409); one result per (screening,type) — dedup **reuses `TestService.search`** (runs BEFORE the txn — search fires count+find in parallel, forbidden in a txn), backed by a unique index `{screening,type}`. **Own-scope:** non-manage actor (the FO) sees/edits only tests they `performedBy` (`applyOwnScope`, applied up-front in get/search; `tenant` filter manage-gated) — so `update` needs no extra assigned-FO check (get already 404s others); `create` still authorizes the assigned FO via `loadScreeningForAction` (returns `{screening,camp}`). **FO stock deduction (the point):** on create, in one `withTransaction`, the test is saved and the **camp's assigned FO** (`camp.fo`) has stock drawn down per `TestMaster.consumption` — each line's `item` is a catalog `InventoryMaster`, bridged to the FO's `InventoryConsumable` lots of it, then the exact `rate` subtracted across those `InventoryAssignment` holdings via `adjustHolding` (devices carry rate 0 → skipped). Short stock → 409, whole create rolls back. Perms `test:manage/create/search/get/update`, reads locked; **FO granted create/get/search/update** (reads own-scoped to their `performedBy` tests). e2e-verified (19/19 on live rs0) |
| operations | rating | `/ratings` | **per-camp staff rating (2026-10-27, UNCOMMITTED, e2e 14/14 live DB)** — the **MR rates the camp's worker** (FO, or dietitian later). Fields `camp`/`worker`(Role→`camp.fo`/`dietitian`)/`ratedBy`(Role→the MR)/`tenant`(from camp) + `onTime`/`attire`/`communication`/`overall` (0–5) + `ratedAt`. **Create input is only `{camp, onTime, attire, communication}`** — everything else DERIVED: `worker` = `camp[workerFor(type).field]`, `ratedBy` = acting role, `tenant` = `camp.tenant`, **`overall` = service-derived mean** of the three sub-scores (never accepted from payload; re-derived on update via `set()`). **Authz:** only the camp's **MR** (`ctx.role === camp.mr`) or a `rating:manage` actor may create (`assertCampMrOrManage`) — and `CampService.get` own-scopes a pharma-MR to camps they booked, so a different MR 404s. **Gate:** camp must be **`closed`** (409 otherwise). **Uniqueness (tenant,camp,worker,ratedBy)** — one rating per rater per worker per camp; dedup **reuses `RatingService.search({camp,worker,ratedBy})`** (correct for manage; own-scope pins ratedBy for the MR), unique index backstop, no try/catch. **Own-scope:** a non-manage actor sees ratings **about them** (`worker`) OR **by them** (`ratedBy`) via `$or` — so the FO reads ratings about them but **cannot edit** (edit gated to the rater/manage via `assertRaterOrManage`). Perms `rating:manage/create/search/get/update`; **pharma-mr granted create+get+search**, **field-officer + dietitian granted get+search** (read ratings about them); `rating:manage` system-only. Wired: app.ts + swagger + permissions registry. **Self-scope narrowed (2026-10-27):** `applyOwnScope` self-scopes (`$or:[{worker},{ratedBy}]`) **only** the three field roles `SELF_SCOPED_RATING_ROLE_TYPES` = field-officer/dietitian/pharma-mr; any OTHER read-granted actor (ops team) is NOT self-scoped → sees ALL ratings within `ctx.where()` (so their read grant is actually useful). **`GET /ratings/me`** (`RatingService.mine`) — the caller's OWN ratings (about them as `worker` OR given by them as `ratedBy`), always self-pinned regardless of role type/manage; declared before `/:id`, guarded by any read perm. **Ops oversight grants:** `rating:get`+`search` granted to **both camp coordinators (screening + diet) + both ops managers** (not self-scoped → full-tenant rating visibility). ⚠️ existing tenants' role types pick these new grants up only on server restart (boot provisioner re-sync); new tenants get them immediately |
| inventory | inventory-master | `/inventory-masters` | **global/system catalog** (no tenant scoping); `code` immutable natural key; `type` = device/consumable/accessory/other; `active`/`inactive` status is a soft-delete visibility flag (manage-gated); `sku`/`unit`/`minStock` (**`maxStock` removed 2026-09-08** — dropped from all layers; existing docs keep the orphan field, never read/returned). Reads open, writes guarded `inventory-master:manage` |
| inventory | inventory-device | `/inventory-devices` | individual physical unit of a catalog item; refs `item` (InventoryMaster) + **required immutable `vendor` (VendorMaster, the supplier bought from — validated at create, populated, searchable)** + unique `serialNumber` (all immutable); `location` warehouse/field-officer/camp; `status` = operational lifecycle (available/assigned/maintainance/lost/damaged — NOT soft-delete, fully readable); calibration/warranty/mfg dates. No tenant scoping. Reads open, writes guarded `inventory-device:manage` |
| inventory | inventory-consumable | `/inventory-consumables` | physical stock **lot** of a catalog item; lot identity = unique (`item`,`batch`); `item` immutable; **required immutable `vendor` (VendorMaster — validated at create, populated, searchable)**; `quantity`/mfg date; **`expiryDate` now OPTIONAL (2026-09-08)**; `active`/`expired` status (manage-gated visibility); search sorts by `expiryDate` asc (⚠️ null-expiry lots sort FIRST). No tenant scoping. Reads open, writes guarded `inventory-consumable:manage` |
| inventory | inventory-assignment | `/inventory-assignments` | **who holds what** — one record per assignee (Role, must be `field-officer` **or `dietitian`** type — `ASSIGNABLE_ROLE_TYPE_CODES`, broadened 2026-10-03), unique/immutable; holds `devices[]` (qty forced 1) + `consumables[]` (qty). No POST — mutated via `PUT /:assignee` upsert. No tenant scoping. Reads open, writes guarded `inventory-assignment:manage`. (Does NOT touch device status/consumable qty — that's the transaction ledger's job.) |
| inventory | inventory-request | `/inventory-requests` | **refill/return request lifecycle**; `type` = refill/return; lines ref actual stock (`InventoryDevice`/`InventoryConsumable`) + qty; stageHistory + moveStage; statuses = requested→approved/rejected→received (terminal) + cancelled; transition map keyed by status values. Full CRUD perms (`create`/`get`/`search`/`update`/`manage`). `requestedBy` = creator (always FO); `processedBy` = inventory manager. **Own-scope:** non-manage actors see/edit only their own requests. **moveStage authz:** manager does any valid move; a requester can move a refill→cancelled/received or a return→cancelled only (approve/reject stay manage-only). No tenant scoping. `FIXME` in service: FO's refill-received overwrites `processedBy`. Stock movement on `received` (FEFO pull / return restore + transaction + assignment delta) NOT yet wired. |
| inventory | inventory-transaction | — | **scaffolded only** (empty stub files, not built/wired) |
| finance | invoice | `/invoices` | camp-to-cash bill; tenant derived from a required `project` (any project status — no live gate); `code` from `invoice` counter (`inv-`); **line items DRIVE the money** — `subtotal` = Σ line amounts, `total` = subtotal + tax − discount (shared `computeInvoiceTotal`); `syncToTally` bool (default false); stageHistory + moveStage over `draft→approved→issued→{grn_signed→paid \| cancelled}`. **Create takes `camps: [id]`** and bills them in one txn (see line item). Standalone edits (tax/discount/dueDate/syncToTally) via PUT; `subtotal` never accepted. Reads/writes guarded `invoice:*` (+ `tenant:manage`). **Search (2026-09-29):** added a `tenant` filter, honoured only when `ctx.where()` hasn't already pinned the tenant (a customer actor stays tenant-locked) |
| finance | invoiceLineItem | `/invoice-line-items` | one line per billed **camp**; fields `invoice`/`camp`/`amount`. **Nested resource — no tenant of its own**; scoped transitively via the parent invoice (`InvoiceService.get` under `ctx.where()`), so search REQUIRES an `invoice` filter. `amount` is NOT supplied — it snapshots the project's `campCost`. **No update path** (nothing editable → change = delete + re-add). Mutations only while the invoice is `draft`; each add/delete recomputes the parent totals in a txn. Per-camp billing rules (shared by invoice-create): camp exists, belongs to the invoice's project, is `billingType=billable` **and** status `closed`/`cancelled_charged`, and is not already on a **non-cancelled** invoice (`assertCampBillable` — the uniqueness guard; **no unique index**, a cancelled invoice frees the camp to be re-billed). Guarded `invoice-line-item:*` (create/get/search/delete/manage) |
| — | vendor-master | `/vendor-masters` | **global + platform-only** vendor/supplier registry (NO tenant scoping, but **every endpoint incl. reads is permission-guarded** so only platform roles reach it — customer actors 403). `code` immutable uppercase natural key; `name`; `contacts[]` = `{name(req),number,email,designation}`; optional embedded `address` (coordinates optional, 2dsphere); `active`/`inactive` soft-delete (manage-gated visibility + status field hidden from non-manage). Perms `vendor-master:manage/create/get/search/update`; **`:manage` granted to `inventory-manager` role type**. Referenced as a required immutable `vendor` on inventory-device + inventory-consumable |
| — | file | `/files` | generic tenant-scoped file/attachment store — **presigned direct-to-S3** flow (no bytes through the API). `POST /files` takes JSON metadata `{tenant, entity{type,relation,id?}, tags?, files:[{fileName,fileSize,fileType}]}` → one **draft** doc per file + a presigned **PUT** `uploadUrl` each; client PUTs bytes to S3; `PUT /files/:id {entityId}` one-time entity link (cap-checked, 409 if already linked); `POST /files/activate {fileIds}` bulk draft→active; also `PATCH /files/:id/status` (state machine), `GET /files/:id`, `GET /files`. Storage **key** = `{entityType}/{entityRelation}/{fileId}.{ext}` — embeds the doc `_id` (1:1 object↔doc), no leading slash. Lifecycle `draft→active/inactive/discarded` (`FILE_TRANSITION_MAP`; discarded = terminal soft-delete, a cron reclaims S3 objects later, not inline). **Activation gate** (`assertObjectUploaded`): going active ALWAYS verifies the key embeds this doc's `_id` **and** a real S3 `HeadObject` says the object exists (else 409). `bulkActivate` checks transition + object UPFRONT (outside the txn), then caps + saves INSIDE one all-or-nothing txn. Caps = max ACTIVE per entity+relation (`ENTITY_RELATION` defines only `user→profile_picture` + `tenant→logo`, cap 1 each; other `ENTITY_TYPE`s are placeholders); read-then-write, no unique index. Tenant-scoped via `ctx.where()` (customer own-tenant, platform any). **Routes open to ANY authenticated user (no route permission guard)** — `file:manage` only gates discarded-file visibility in `search` + raw storage-coords (provider/path/identifier) in the mapper. `content` (provider/path/identifier/originalName/displayName/mimeType/extension/size) fully derived server-side. Perms: only `file:manage`. ⚠️ `FileService.get` is reused by update/changeStatus/bulkActivate on DRAFT files — do NOT add a read-visibility status filter to it (would 404 the drafts those flows act on). **Storage provider** (`shared/providers/storage/`; `IStorageProvider` = **`upload`/`getUrl`/`delete`/`headObject`**): `upload(IPresignedUploadInput)→IPresignedUpload` = presigned **PUT** URL (client uploads directly); `getUrl(id)→{url}` = presigned **GET** URL (read); `delete(id)` = real idempotent `DeleteObjectCommand`; `headObject(id)→{exists,size?,contentType?}`. Refactored 2026-09-22: dropped `getPresignedUrl`/`getPresignedUploadUrl`/`download`/`IUploadInput` — their logic folded into `getUrl`/`upload`. Cloudinary provider = stubs. Built + e2e (24/24 faked S3, 13/13 real LocalStack) on branch `feature/file-upload`; the storage-provider refactor is on branch `test`, uncommitted |

| — | otp | — (service-only) | **global OTP issue/verify store — NO routes/controller/mapper/HTTP; invoked service-to-service** (e.g. screening consent). Public surface = `OtpService.request` / `resend` / `verify`; `get`/`search`/`create`/`update` are internal raw CRUD (CRUD does only the raw op; all business rules live in request/resend/verify). Model: `purpose`, `channel {type(sms/whatsapp/email), value}`, optional `entity {type,relation,id}` (partial 2dsphere-free index for lookup), `code` (6-digit, server-gen), `status` (pending/verified/expired/blocked), `expiresAt`, `attempts`, `maxAttempts` (5), `verifiedAt`. **request**: expire prior pending for the target → generate code + expiry (now + TTL, default 5 min) → raw create (atomic). **resend**: requires a prior OTP + a `RESEND_COOLDOWN_SECONDS` (60) gap, then reuses request. **verify**: find latest pending by purpose+entity → expired(400)/out-of-attempts(429/block)/wrong-code(400,++attempts,block on last)/match(verified). Purposes centralized in `OTP_PURPOSES` keyed by `OTP_ENTITY_TYPE` (file-module shape; each entry `{purpose, relation}`). NOT wired into `app.ts`/swagger/permissions by design. ⚠️ no delivery sender yet (channel recorded, nothing sends). |

| — | notification | `/notifications` | **🔄 IN PROGRESS — scaffold only, not functional end-to-end.** Full layered module, wired (`app.ts` + swagger). Model: `recipient` (User, req), optional `tenant`, embedded `entity {id,type,event}`, `event` (**free-form string, NOT enum-constrained** — controlled internally; each emitting module owns its own event-name constants and passes them in; the old `NOTIFICATION_TYPES` enum was removed 2026-10-08), `channel` (email/in-app/whatsapp/sms), `subject`/`body`, `status` (pending/sent/failed), `attempts`/`error`/`sentAt`, `read`/`readAt`. Service `get`/`search`/`create`/`update` (`create` = bare save; intended to be called internally by the events that raise a notification). **Only ONE route: `GET /notifications/me`** — auth-only (NO permission guard), returns the caller's own notifications (recipient pinned from `ctx`, never accepted from client). No create/update route exposed; no mark-as-read route (service `update` toggles `read` but isn't wired). **⚠️ Two gaps make it non-functional:** (1) **nothing triggers it** — no service anywhere calls `NotificationService.create` (so it's never populated), (2) **no delivery sender** — `status`/`channel`/`attempts`/`sentAt`/`error` exist but nothing sends (same as otp). No `*_PERMISSIONS` registered. **Consumer worker — `handleEvent` now FULLY WIRED (2026-10-16, `feature/notification`, UNCOMMITTED, e2e-verified live DB, `tsc` clean):** `src/workers/notification.worker.ts` (`npm run worker:notification`) long-polls the notification queue (`queueManager.get('sqs')`), and for each event `handleEvent(event, ctx)`: (1) `code = event['detail-type']` → `loadTemplate<TemplateConfig>()` (generic dynamic-import loader, `src/shared/utils/templateLoader.ts`; absolute path → `file://` URL for ESM/tsx; path derived `camp.create`→`events/camp/create`); no config → warn + ack-drop. (2) `payload = {data: event.detail}` (configs address the payload as `data.*`); renders `config.subject` via Handlebars. (3) derives the source `entity` `{id: data.<prefix>._id, type: <prefix>, event: code}`. (4) per recipient: resolves the recipient OBJECT from the source's PARENT path (`data.fo.email`→`data.fo`) → `to`=object[lastSeg], `recipientId`=object`._id`, folder=middle segment (`fo`). (5) per channel: renders `<templates>/<config.template>/<folder>/<channel>.hbs` (missing → warn+skip) → **persists** `NotificationService.create({recipient:_id, event, channel, subject, body, entity}, ctx)` (no `_id` → warn+skip persist, still send) → **sends** via `messagingManager.get(channel).send({to, subject, body})`. Runs as the **system user**: `buildWorkerContext()` reuses the existing `buildContext` middleware with a stub `req` (socket.remoteAddress `127.0.0.1` to mark system actions) + the seeded system tenant/user/role (`RoleModel.findOne({code:'system'})` WITHOUT `.populate('type')` — RoleType isn't registered in the worker graph & isn't needed). Startup: side-effect import `swagger.registry` FIRST (else notification.validators `.openapi()` throws at import) → `connectDB()` → `buildWorkerContext()` once → `pollMessages(ctx)`; `handleEvent`/`buildWorkerContext` exported, poll guarded by `require.main === module`. Helpers: `getByPath` (`src/shared/utils/object.ts`); **messaging providers** (3 mocks, see Providers). The **full publish→consume path is CONFIRMED WORKING live** (EventBridge `source:qms` → rule → `qms-queue` → worker). **Deferred:** status stays `pending` (create payload has no status field — marking sent/failed is a follow-up); `tenant` omitted (optional); no real trigger calls `publish()` yet (only the temp test route). **TEMP test route (remove before prod):** `POST /notifications/test-publish` (auth-only, `TestPublishNotificationPayloadSchema` = optional `{type?:string (default camp.create), data?:any}`) calls `eventManager.get('aws').publish({type, data, ctx})` to emit an event to EventBridge so the EventBridge→SQS→worker path can be exercised from an HTTP call; registered in swagger under the NOTIFICATION tag. Added to `notification.{validators,controller,routes}.ts`. **Mapper convention:** follows the convention (both `toResponse`/`toSearchResponse`, strips internals — `recipient`/`tenant`/`attempts`/`error` omitted), with minor deviations — typed `any` instead of `HydratedDocument<INotification>`, threads an unused `ctx` param, and `toSearchResponse` loops calling `toResponse` (matches the documented convention but NOT the 2026-09-29 decoupling the other 31 mappers got). |

### Notifications — STATUS + Frontend Integration (2026-10-19, branch `feature/notification`, UNCOMMITTED)

**STATUS: now functional end-to-end** (supersedes the "scaffold only / not functional" prose in the row above). Triggers wired: **`camp.create`** (on `CampService.create`, recipients fo/mr/asm/rsm, email+in-app), **`camp.update`** (on `CampService.update` **only when the camp has an assigned worker**, recipients fo/mr, email-only), **`lead.create`** (on `LeadService.create`, recipient the `salesPerson`, email+in-app), **`lead.update`** (on `LeadService.update` **only when `salesPerson` is (re)assigned**, same recipient/channels), **`project.create`** (on `ProjectService.create`, recipients `projectCoordinator` + `salesRep`, email+in-app) and **`project.update`** (on `ProjectService.update` **only when `projectCoordinator` or `salesRep` is (re)assigned**, same recipients/channels). The worker renders + persists + sends (mock providers), rows carry a real **delivery status** (`sent`/`failed`, no longer stuck `pending`), and there's a working **in-app inbox + mark-all-read** for the frontend. Each emitting service sets `ctx.processSync = true` right before `eventProcessor.process(entity, event, populatedDoc, ctx)` (no-op when false). The temp `POST /notifications/test-publish` route (+ its validator/controller/schema) was **REMOVED (2026-10-19)** now that real triggers exist — events are produced only by domain triggers, no HTTP back-door; the module's public surface is exactly `GET /notifications/me` + `PATCH /notifications/me/read`. `/me` sorts `{createdAt:-1, _id:-1}` (newest first, `_id` tiebreaker so same-ms bulk-inserted rows paginate stably). Still deferred: real (non-mock) SES/SMS/WhatsApp providers; `camp.update` is email-only (no in-app); invoice (and other domains) not yet emitting; ~12 legacy `pending` rows (pre-2026-10-19) linger in dev DB.

**Frontend API contract** — base `/api/v1`, auth via httpOnly cookie (`withCredentials: true`, no token handling). Two endpoints, both auth-only (no permission guard), both scoped to the logged-in user server-side (recipient taken from the session — never sent by the client):

1. **`GET /notifications/me`** — the caller's **in-app** inbox. Server forces `channel=in-app` and `recipient=<session user>`, so email/sms/whatsapp rows (delivery records) are never returned here. Query (all optional): `page` (default 1), `limit` (default 10), `event` (e.g. `camp.create`), `status` (`pending`/`sent`/`failed`), `read` (`true`/`false`). Response `data = { count, items[] }`, newest first; each item:
   ```json
   { "id":"…", "entity":{"id":"<campId>","type":"camp","event":"create"},
     "event":"camp.create", "channel":"in-app",
     "subject":"A new camp has been created",
     "body":"New screening camp cmp-000014 assigned to you — …",
     "status":"sent", "sentAt":"2026-…Z", "read":false, "readAt":null,
     "createdAt":"…", "updatedAt":"…" }
   ```
2. **`PATCH /notifications/me/read`** — no params, no body. Marks **all** the caller's unread in-app notifications read. Response `data = { modified: <count> }`.

- **Unread badge:** `GET /notifications/me?read=false` → `data.count` is the unread count (no dedicated count endpoint).
- **Deep-link:** `entity = {type:'camp', id, event:'create'|'update'|'fo-assigned'}` → route to e.g. `/camps/:entity.id`. (`entity.event` is the verb; the top-level `event` is the full code `camp.create` for grouping/filtering.)
- Envelope is the app-standard `{ success, message, data }`. There is **no** client-facing "create notification" API — notifications are produced server-side by domain events.

Cross-cutting: `AuthMiddleware` + `AuthorizeMiddleware` (AND/OR permission guards), system-user
seeding + per-tenant default-role-type provisioning on boot, `PERMISSIONS`/`PERMISSIONS_ARRAY`
registry, pino logging (`pino-http`), rate limiting (global + auth), `withTransaction` helper.

**Providers** (`src/shared/providers/`): storage (S3 — presigned, see `file` module) and **events**
(`events/` — `eventManager.get('aws')` → `EventBridgeProvider`, `IEventProvider.publish(entity, event, data, ctx?)`).
**Signature (2026-10-12):** `publish(entity: string, event: string, data: object, ctx?: RequestContext)` —
`entity` is the subject (`'camp'`/`'invoice'`/`'lead'`), `event` is what happened (`'create'`/`'update'`),
combined into EventBridge `DetailType` as `` `${entity}.${event}` ``; `JSON.stringify(data)`→`Detail`,
plus configured `Source`/`EventBusName`; the optional `ctx` is used only for request-scoped logging
(`ctx.logger`, never serialized into the payload). (Replaced the old single-object `IQmsEvent = { type, data, ctx? }`
param — `IQmsEvent` deleted.) `publish()` inspects `FailedEntryCount` (PutEvents
returns 200 even on a rejected entry) and throws `throwAppError(500)` on failure. **Config shape
(2026-10-08):** AWS credentials are shared in `ENV.Providers.AWS` (`Region`/`AccessKeyId`/
`SecretAccessKey`); per-service config lives in siblings `ENV.Providers.AWS_S3` (`Bucket`/`Endpoint`)
and `ENV.Providers.AWS_EventBridge` (`EventBusName` default `default`, `Source` default `qms.backend`).
Env: `AWS_REGION`/`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` + `AWS_S3_BUCKET`/`AWS_S3_ENDPOINT` +
`AWS_EVENT_BRIDGE_BUS_NAME`/`AWS_EVENT_BRIDGE_SOURCE`. ⚠️ EventBridge `publish()` is implemented but
**no service calls it yet** (same not-wired-to-triggers gap as the `notification` module).

The **consume side** is a separate provider domain: **queue** (`queue/` — `queueManager.get('sqs')`
→ `SqsProvider`, `IQueueProvider.receive(queueUrl)` / `delete(queueUrl, receiptHandle)`). `SqsProvider`
is the only place that imports `@aws-sdk/client-sqs`; `receive()` long-polls (`WaitTimeSeconds` 20,
`MaxNumberOfMessages` 10, `VisibilityTimeout` 120) and drops malformed entries, `delete()` acks a
processed message. Config: `ENV.Providers.AWS_SQS.NotificationQueueUrl`
(env `AWS_SQS_NOTIFICATION_QUEUE_URL`; credentials shared from `ENV.Providers.AWS`).

**Messaging** (`messaging/` — outbound notification delivery, 2026-10-16): `messagingManager.get(channel)`
→ one provider per channel (`email`/`whatsapp`/`sms`), each in its own folder
`messaging/<channel>/mock.provider.ts`. Interface `IMessage`/`IMessageProvider`
(`src/shared/types/message.types.ts`); `send(IMessage{to, body, subject?, from?})`. **All mocks for now**
(log instead of sending; real SES/etc. drop in beside the mock behind the same interface).
**Validation is provider-side**: each `send` rejects (throwAppError 400) when `to` is invalid for the
channel (`isValidEmail`/`isValidPhone` in `strings.ts`) or the body is empty. `in-app` has no provider
(persisting the row IS delivery). Consumed by the notification worker's `handleEvent`.

**Workers** (`src/workers/`, standalone processes — NOT wired into `server.ts`, run separately):
**`notification.worker.ts`** (`npm run worker:notification`, `tsx watch`) is an SQS consumer — a
`while(true)` loop that `queue.receive()`s from the notification queue, `JSON.parse`s each body,
hands it to a local `handleEvent()` seam (currently **log-only** — a `// TODO: process` marker), then
`queue.delete()`s on success (a thrown handler leaves the message for redelivery after the visibility
timeout). Backs off 3s on a receive failure; exits non-zero if `NotificationQueueUrl` is unset.
**Run it separately** — it is NOT started from `server.ts` (standard SQS-consumer pattern: scale/restart
independently of the API).

**End-to-end path CONFIRMED WORKING (2026-10-12, live AWS):** `publish()` → EventBridge (`default` bus,
`source: qms`) → **rule routes to the `qms-queue` SQS queue** → worker `receive()` → `handleEvent()`
logs → `delete()` acks. Verified live: a `camp.create` event published via EventBridge arrived in SQS as
a full EventBridge envelope and the worker logged + acked it. The EventBridge→SQS routing rule + the SQS
queue resource policy (allowing `events.amazonaws.com` to `sqs:SendMessage`) live in AWS config, NOT the
repo — they were initially mis-wired (the rule's event pattern didn't match `source: qms` / `camp.create`,
so events published fine but were silently dropped before the queue) and later fixed on the AWS side.
⚠️ Gotchas: the config source default is `qms.backend` but `.env` sets `AWS_EVENT_BRIDGE_SOURCE=qms`, so
events go out as `source: qms` — the rule pattern MUST match that. The backend IAM user
(`qms-umc-backend-dev`) is scoped to `sqs:Send/Receive/DeleteMessage` on the queue only — it CANNOT
`events:ListRules`/`sqs:GetQueueAttributes`, so rule/queue config must be inspected with an admin login.
⚠️ **Still consume-only** — `handleEvent` logs but does NOT yet call `NotificationService` or send
anything; the processing logic is the seam left to fill.

## What's Next (planned)

- **Notification delivery (branch `feature/notification`, UNCOMMITTED as of 2026-10-16)** — `handleEvent` is now
  **fully wired + e2e-verified** (load config → resolve recipients → render `.hbs` → persist `Notification` row →
  send via mock messaging provider; see the notification module + Messaging provider rows). Resolved decisions:
  recipient id is **populated in the event** (each recipient object carries its own `_id`, resolved from the source's
  parent path — NO email lookup); template folder derived from the source middle segment; subject added to config,
  consistent across all channels; 3 **mock messaging providers** (email/whatsapp/sms, NOT a single mail provider) with
  provider-side input validation; worker runs as the **system user** via `buildContext` + a stub `req`. **Remaining:**
  (1) **real triggers** — no service calls `publish()` yet (only the temp `POST /notifications/test-publish`); a real
  `camp.create` emitter must publish the `data: {camp, doctor, fo, mr}` shape the templates expect, with populated `_id`s.
  (2) **status tracking** — rows persist as `pending`; marking `sent`/`failed` after send needs a status path (create
  payload has no status field). (3) real email/sms/whatsapp providers behind `IMessageProvider` (mocks only; SES SDK not
  installed). (4) `tenant` on rows (omitted, optional). See [[notification-template-approach]], [[event-bus-eventbridge]].
- Inventory — `inventory-assignment` + `inventory-request` are now BUILT/wired. Remaining: build the
  last scaffolded module `inventory-transaction` (append-only stock ledger: issue/return/consume/adjust
  that drives consumable quantity & device location/status), and wire the **`received`** step of a
  request to actually move stock: refill → pull warehouse lots FEFO / pick available devices; return →
  restore the exact lot/unit; write the transaction row; apply the assignment delta. (Seam left as a
  `NOTE` in `inventory-request.service.ts` `moveStage`.) Roles: **`inventory-manager`** platform role
  type added (`:manage` on all 5 inventory modules); FO role type granted `inventory-request`
  create/get/search/update. Still open: tenant-scoping decision (inventory is global today — note
  `doctor` was global but is now tenant-scoped), how camp/FO refs hang off assignments. Note the two typo constants in
  `inventory-device.constants.ts` (`MAINTAINANCE`, `DMAGAED`) and the `FIXME` on request `processedBy`.
- Invoicing / billing — **`invoice` + `invoiceLineItem` now BUILT + wired + e2e-verified** (see What's
  Done). A **`finance-manager`** platform role type was added on seeding (`invoice:manage` +
  `invoice-line-item:manage`); `invoice` counter seeded (`inv-`). Still open on billing:
  (1) **`cancelled_charged` pricing** — such a camp is currently billed at the FULL `campCost`; it
  likely should be the cancellation charge (`project.campCostDeductionOnChargableCancel` %), not full.
  (2) a "billable, unbilled camps for a project" picker query (closed/cancelled_charged, billable, not
  yet on a live invoice) — today the caller passes camp ids. (3) the `assertCampBillable` race window
  (read-then-write; no unique index, since re-bill-after-cancel needs it) — acceptable for now.
  (4) PO compliance, AR aging/dunning, GST/e-invoice, actual Tally sync (the `syncToTally` flag exists
  but nothing pushes yet).
- Scaling/concurrency hardening (clustering, `maxPoolSize`, `UV_THREADPOOL_SIZE`, user-search index)
