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
  doctor/                   tenant-scoped doctor registry
  qa-feedback/              QA feedback
  access-management/        tenant, role, role-type, permission-group (RBAC)
  crm/                      division, lead, project, appointment, contact
  operations/               camp, geoProfile (field-staff geo + camp allocation),
                            testMaster (global test catalog), patient (global patient registry),
                            screening (per-patient camp screening + consent OTP)
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

### Permissions Registry (`src/shared/env/permissions.ts`)

All module permissions are aggregated here. Each module exports its own `*_PERMISSIONS` constant and it must be added to the `PERMISSIONS` object.

```typescript
import { PERMISSIONS, PERMISSIONS_ARRAY } from '../../shared/env/permissions'
// PERMISSIONS_ARRAY → flat string[] of all permission codes — used for validation in role.service
```

---

## Mapper Convention

Never return a raw Mongoose document to the client. Always strip through a mapper.

```typescript
export const FooMapper = {
    toResponse: (doc: HydratedDocument<IFoo>) => ({
        id: doc._id.toString(),
        // only safe, public fields
    }),
    toSearchResponse: (data: { count: number; items: HydratedDocument<IFoo>[] }) => ({
        count: data.count,
        items: data.items.map(FooMapper.toResponse),
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
| — | user | `/users` | linked 1:1 to a Role; registers inactive by default |
| — | counter | `/counters` | global atomic `$inc` sequence → prefixed padded codes (ld-/prj-/cmp-/mtg-/phr-/inv-/**tst-**/**pat-**). Entity must be in BOTH `COUNTER_ENTITY_TYPES` (model enum) AND `seedCounters` — a missing enum entry fails boot |
| — | doctor | `/doctors` | tenant-scoped registry (`ctx.where()`); `pharmaCode` immutable natural key, unique per tenant `{tenant, pharmaCode}` (email also unique per tenant); tenant pinned on create (platform supplies, customer own-tenant), open reads / manage-guarded writes |
| — | qa-feedback | `/qa-feedback` | QA feedback |
| access-management | tenant | `/tenants` | types: `platform` / `customer`; owner auto-activated on create; optional updatable `salesPerson` (Role ref) — assign on create, reassign/unassign (null) on update, validated to exist AND be a `sales-rep` role type |
| access-management | permission-group | `/permission-groups` | per-tenant permission ceiling |
| access-management | role-type | `/role-types` | `isSystem` defaults seeded per tenant; reserved-code guard |
| access-management | role | `/roles` | 1:1 with User; optional `division` (customer-only) + `supervisor` self-ref |
| crm | division | `/divisions` | therapy/brand division (`therapy` is a **non-empty, duplicate-free array** — multiple therapy areas per division; validated in validators + model); create also mints a pharma-division-head role + user |
| crm | lead | `/leads` | stageHistory + moveStage; tenant from division |
| crm | project | `/projects` | one-project-per-lead; tenant/division derived from lead; `campTimeSlots` restricted to the 4 fixed `CAMP_TIME_SLOTS` (imported from camp module); **own-scoping** in get/search — customer-tenant actor → own division (`role.division`), platform rep without `project:manage` → own projects (`salesRep`); optional `tenant` search filter honoured only for a not-tenant-pinned `project:manage` actor |
| crm | appointment | `/appointments` | stageHistory + moveStage (each move records its own `nextSteps`); parent self-ref for follow-ups; statuses = planned/done/cancelled/released (no `blocked`) |
| crm | contact | `/contacts` | tenant(+optional division)-scoped people registry, optional user/login link; division required for pharma (customer-type) contacts & validated against tenant; `type` immutable after create |
| operations | camp | `/camps` | stageHistory + moveStage; tenant+division required, project optional; optional `tenant` search filter honoured only for a not-tenant-pinned `camp:manage` actor |
| operations | geoProfile | `/geo-profiles` | field-staff geo (2dsphere); `findNearest` ($geoNear) feeds camp allocation |
| operations | testMaster | `/test-masters` | **global catalog** (no tenant); `code` auto-generated from `test-master` counter (`tst-`), immutable natural key; `therapy` (project therapy enum), `duration`/`price`, `config.inputs[]` (validator mirrors the model exactly — `type` enum from `TEST_MASTER_CONFIG_INPUT_TYPE`), `consumption[]` (InventoryMaster + rate; device rate defaults 0); `active`/`inactive` (manage-gated). Reads guarded `test-master:get`/`search` (or manage); writes `manage`. FO granted read; ops-managers granted manage |
| operations | patient | `/patients` | **global registry** (no tenant, per decision); `code` auto-generated from `patient` counter (`pat-`), immutable; `email` optional + lowercased + **sparse-unique**; names trimmed (not lowercased); `dateOfBirth`/`gender`/`mobile`; embedded `address` (`_id:false`); `createdBy` (Role); `active`/`inactive` soft-delete (manage-gated). Perms `patient:manage/create/search/get/update`, reads locked. `create` granted to field-officer + both camp-coordinators |
| operations | screening | `/screenings` | **tenant-scoped**, tenant DERIVED from the camp; one screening per (tenant,patient,camp) unique; `stageHistory` + `moveStage` (`pending→completed/cancelled`, seeds a created entry, createdBy/performedBy read off the journal — no separate fields); embedded `consent` (`otp` generated via `OtpHandler`, `verified`, `signature`); `POST /:id/verify-consent` matches OTP; completion gated on `consent.verified` (422); create gated on camp `live` (409). **Only the assigned FO (`camp.fo`) or a manage actor may create/mutate** (`assertAssignedFoOrManage`); non-assigned → 404 (own-scope). test results are a FUTURE separate entity. Reuses `CampService.get` (populated fo) + `ScreeningService.search` (dedup) via shared `loadCampForAction`. Perms `screening:manage/create/search/get/update`; FO granted create+update |
| inventory | inventory-master | `/inventory-masters` | **global/system catalog** (no tenant scoping); `code` immutable natural key; `type` = device/consumable/accessory/other; `active`/`inactive` status is a soft-delete visibility flag (manage-gated); `sku`/`unit`/`minStock`/`maxStock`. Reads open, writes guarded `inventory-master:manage` |
| inventory | inventory-device | `/inventory-devices` | individual physical unit of a catalog item; refs `item` (InventoryMaster) + unique `serialNumber` (both immutable); `location` warehouse/field-officer/camp; `status` = operational lifecycle (available/assigned/maintainance/lost/damaged — NOT soft-delete, fully readable); calibration/warranty/mfg dates. No tenant scoping. Reads open, writes guarded `inventory-device:manage` |
| inventory | inventory-consumable | `/inventory-consumables` | physical stock **lot** of a catalog item; lot identity = (`item`,`batch`,`location`); `item` immutable; `quantity`/mfg/expiry dates; `location` warehouse/camp; `active`/`expired` status (manage-gated visibility); search sorts by `expiryDate` asc. No tenant scoping. Reads open, writes guarded `inventory-consumable:manage` |
| inventory | inventory-assignment | `/inventory-assignments` | **who holds what** — one record per assignee (Role, must be `field-officer` type), unique/immutable; holds `devices[]` (qty forced 1) + `consumables[]` (qty). No POST — mutated via `PUT /:assignee` upsert. No tenant scoping. Reads open, writes guarded `inventory-assignment:manage`. (Does NOT touch device status/consumable qty — that's the transaction ledger's job.) |
| inventory | inventory-request | `/inventory-requests` | **refill/return request lifecycle**; `type` = refill/return; lines ref actual stock (`InventoryDevice`/`InventoryConsumable`) + qty; stageHistory + moveStage; statuses = requested→approved/rejected→received (terminal) + cancelled; transition map keyed by status values. Full CRUD perms (`create`/`get`/`search`/`update`/`manage`). `requestedBy` = creator (always FO); `processedBy` = inventory manager. **Own-scope:** non-manage actors see/edit only their own requests. **moveStage authz:** manager does any valid move; a requester can move a refill→cancelled/received or a return→cancelled only (approve/reject stay manage-only). No tenant scoping. `FIXME` in service: FO's refill-received overwrites `processedBy`. Stock movement on `received` (FEFO pull / return restore + transaction + assignment delta) NOT yet wired. |
| inventory | inventory-transaction | — | **scaffolded only** (empty stub files, not built/wired) |
| finance | invoice | `/invoices` | camp-to-cash bill; tenant derived from a required `project` (any project status — no live gate); `code` from `invoice` counter (`inv-`); **line items DRIVE the money** — `subtotal` = Σ line amounts, `total` = subtotal + tax − discount (shared `computeInvoiceTotal`); `syncToTally` bool (default false); stageHistory + moveStage over `draft→approved→issued→{grn_signed→paid \| cancelled}`. **Create takes `camps: [id]`** and bills them in one txn (see line item). Standalone edits (tax/discount/dueDate/syncToTally) via PUT; `subtotal` never accepted. Reads/writes guarded `invoice:*` (+ `tenant:manage`) |
| finance | invoiceLineItem | `/invoice-line-items` | one line per billed **camp**; fields `invoice`/`camp`/`amount`. **Nested resource — no tenant of its own**; scoped transitively via the parent invoice (`InvoiceService.get` under `ctx.where()`), so search REQUIRES an `invoice` filter. `amount` is NOT supplied — it snapshots the project's `campCost`. **No update path** (nothing editable → change = delete + re-add). Mutations only while the invoice is `draft`; each add/delete recomputes the parent totals in a txn. Per-camp billing rules (shared by invoice-create): camp exists, belongs to the invoice's project, is `billingType=billable` **and** status `closed`/`cancelled_charged`, and is not already on a **non-cancelled** invoice (`assertCampBillable` — the uniqueness guard; **no unique index**, a cancelled invoice frees the camp to be re-billed). Guarded `invoice-line-item:*` (create/get/search/delete/manage) |

Cross-cutting: `AuthMiddleware` + `AuthorizeMiddleware` (AND/OR permission guards), system-user
seeding + per-tenant default-role-type provisioning on boot, `PERMISSIONS`/`PERMISSIONS_ARRAY`
registry, pino logging (`pino-http`), rate limiting (global + auth), `withTransaction` helper.

## What's Next (planned)

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
