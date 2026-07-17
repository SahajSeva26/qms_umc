# QMS — Project Context

Quality Management System. Full-stack monorepo: Express/TypeScript backend + React frontend.

## Stack

| Layer | Tech |
|---|---|
| Backend | Node.js, Express 5, TypeScript, MongoDB (Mongoose) |
| Validation | Zod v4, `@asteasolutions/zod-to-openapi` |
| Auth | JWT (access + refresh tokens), bcrypt, httpOnly cookies |
| API Docs | Swagger UI (`swagger-ui-express`) at `/api-docs` |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7 |

## Monorepo Layout

```
D:\Qms\
  backend/
    src/
      bin/                          → app.ts (Express app) + server.ts (bootstrap)
      modules/
        auth/                       → controller, routes, service, validators, mapper, constants
        user/                       → controller, routes, service, validators, mapper, model, constants
        access-management/
          tenant/                   → controller, routes, service, validators, mapper, model, constants
          permission-group/         → controller, routes, service, validators, mapper, model, constants
          role-type/                → controller, routes, service, validators, mapper, model, constants
          role/                     → controller, routes, service, validators, mapper, model, constants
        division/                   → controller, routes, service, validators, mapper, model, constants
        crm/
          lead/                     → controller, routes, service, validators, mapper, model, constants
      shared/
        config/                     → app.config.ts, connectDB.ts, swagger/
        middlewares/                → authmiddleware.ts, authorizeMiddleware.ts
        helpers/                    → tokenHelper.ts, transactionHelper.ts
        utils/                      → error, logger, cookies, responseHandler, requestHandler, strings, contextBuilder
        types/                      → permission.types.ts, service.types.ts
        env/                        → index.ts, permissions.ts, seedSystemUser.ts
  frontend/
    src/
      app/                          → App.tsx, AppProvider.tsx, router.tsx
      components/                   → layouts/RootLayout.tsx, ui/button.tsx
      features/
        auth/                       → auth.routes.tsx, components/, hooks/, pages/, store.ts
      lib/                          → api/ (api.ts, queryClient.ts), utils.ts
      types/                        → sampleType.ts
      main.tsx
```

Module convention (backend): each feature folder follows the same file layout —
`*.controller.ts`, `*.routes.ts`, `*.service.ts`, `*.validators.ts`, `*.mapper.ts`,
`*.model.ts` (Mongoose), `*.constants.ts`.

## Dev Commands

```bash
# Backend (run from backend/)
npm run dev       # tsx watch (hot reload)
npm run build     # tsc compile
npm start         # run compiled dist

# Frontend (run from frontend/)
npm run dev       # Vite dev server (http://localhost:5173)
npm run build     # tsc + vite build
```

## API Base URL

- Dev: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api-docs`
- Frontend: `http://localhost:5173`
- CORS is configured for frontend origin only

## Active Branch

`feature/lead-management`

## Domain Model

`tenant → division (therapy area) → lead / project`. The client layer is collapsed
into tenant. A lead's tenant is derived from its division. Lead carries an embedded,
append-only `stageHistory` journal, mutated via a `moveStage` flow.

## Current Status (as of 2026-07-16)

### Backend — in progress
- Auth module: register, login, logout, refresh-token, `auth/me` (session permissions) — DONE
- User module: get, search, update — DONE
- Token rotation, account lockout, httpOnly cookie auth — DONE
- Tenant CRUD — DONE
- Permission group CRUD — DONE
- Role type CRUD — DONE
- Role CRUD (1:1 with User, auto-created together, handover = retire+recreate) — DONE
- Division module (CRUD) — DONE
- CRM Lead module (CRUD + moveStage + embedded stageHistory) — DONE
- AuthorizeMiddleware (permission-based route guard) — DONE
- System user seeding on startup — DONE
- Token payload includes role + tenant — DONE
- AuthMiddleware loads role from DB and sets role/tenant/permissions on context — DONE
- Rate limiter — DONE
- Production configs — DONE
- Swagger fully wired

### Deferred / TODO
- Lead incremental code sequence (LEAD-001…) via atomic counter collection
- Restrict which customer-side role type can be a lead's contactPerson
- Auth: block login if tenant/role/role-type not active → return false + "contact admin"

### Frontend — early scaffold
- Routing skeleton done (React Router v7, createBrowserRouter)
- Auth feature folders created (components/, hooks/, pages/, store.ts) — files still empty
- `lib/api/` scaffold present (api.ts, queryClient.ts) — files still empty
- No API integration yet

## Environment Variables (backend/.env)

```
APP_PORT=
APP_HOST=
APP_ENV=development
DB_URI=
JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRY_SEC=900
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRY_SEC=604800
SYSTEM_USER_EMAIL=
SYSTEM_USER_PASSWORD=
SYSTEM_USER_PHONE=
```
