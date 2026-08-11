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
  doctor/                   global doctor registry (no tenant scoping)
  qa-feedback/              QA feedback
  access-management/        tenant, role, role-type, permission-group (RBAC)
  crm/                      division, lead, project, appointment, contact
  operations/               camp, geoProfile (field-staff geo + camp allocation)
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
- Global registries (`doctor`) are intentionally NOT tenant-scoped.

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
| — | counter | `/counters` | global atomic `$inc` sequence → prefixed padded codes (LEAD-/PROJECT-/CAMP-) |
| — | doctor | `/doctors` | global registry, no tenant scoping; `pharmaCode` immutable natural key |
| — | qa-feedback | `/qa-feedback` | QA feedback |
| access-management | tenant | `/tenants` | types: `platform` / `customer`; owner auto-activated on create |
| access-management | permission-group | `/permission-groups` | per-tenant permission ceiling |
| access-management | role-type | `/role-types` | `isSystem` defaults seeded per tenant; reserved-code guard |
| access-management | role | `/roles` | 1:1 with User; optional `division` (customer-only) + `supervisor` self-ref |
| crm | division | `/divisions` | therapy/brand division; create also mints a pharma-division-head role + user |
| crm | lead | `/leads` | stageHistory + moveStage; tenant from division |
| crm | project | `/projects` | one-project-per-lead; tenant/division derived from lead |
| crm | appointment | `/appointments` | stageHistory + moveStage (each move records its own `nextSteps`); parent self-ref for follow-ups; statuses = planned/done/cancelled/released (no `blocked`) |
| crm | contact | `/contacts` | tenant(+optional division)-scoped people registry, optional user/login link; division required for pharma (customer-type) contacts & validated against tenant; `type` immutable after create |
| operations | camp | `/camps` | stageHistory + moveStage; tenant+division required, project optional |
| operations | geoProfile | `/geo-profiles` | field-staff geo (2dsphere); `findNearest` ($geoNear) feeds camp allocation |

Cross-cutting: `AuthMiddleware` + `AuthorizeMiddleware` (AND/OR permission guards), system-user
seeding + per-tenant default-role-type provisioning on boot, `PERMISSIONS`/`PERMISSIONS_ARRAY`
registry, pino logging (`pino-http`), rate limiting (global + auth), `withTransaction` helper.

## What's Next (planned)

- Invoicing / billing (camp-to-cash, PO compliance, AR aging) — spec captured, not started
- Inventory & devices — Phase 2
- Scaling/concurrency hardening (clustering, `maxPoolSize`, `UV_THREADPOOL_SIZE`, user-search index)
