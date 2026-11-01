# Frontend — Architecture & Conventions

React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router v7.
**Server state** → TanStack Query. **Client state** (auth session, UI) → Zustand. **Forms** → Zod.
**HTTP** → a single Axios instance (`src/lib/api/api.ts`, `withCredentials: true`). **UI** → shadcn
(`@base-ui` primitives + `cn()` from `lib/utils.ts`).

> This app is the web client for the QMS platform. The Express/TS backend lives in `../backend`
> (base URL `<ENV.Api.BaseUrl>/api/v1`). See the root `../CLAUDE.md` for the whole-project overview,
> the role model, and business workflows.

---

## Folder Structure

```
src/
  main.tsx                          → entry point, renders AppProvider
  index.css                         → global styles + Tailwind import

  app/
    AppProvider.tsx                 → wraps app with ALL global providers
    App.tsx                         → (legacy placeholder, not used in routing)
    router.tsx                      → root createBrowserRouter, composes all feature routes

  components/
    layouts/
      RootLayout.tsx                → base layout shell, renders <Outlet />
    ui/                             → shared, reusable UI primitives (buttons, inputs, etc.)

  features/
    [feature]/
      pages/         → page-level components (route targets)
      components/    → feature-scoped UI components
      hooks/         → feature-scoped custom hooks (TanStack Query wrappers)
      schemas/       → Zod schemas for this feature's forms
      [feature].service.ts  → Axios calls for this feature's endpoints (the ONLY place API shape lives)
      [feature].routes.tsx  → route definitions + route-constant exports
      store.ts       → feature-level Zustand slice (auth/UI state only, never API data)

  hooks/             → global/cross-feature read-only data hooks + useAuth
  lib/               → api/ (axios instance + queryClient), roles.ts, utils.ts (cn)
  types/             → shared cross-feature types (auth.types, common.types: ApiResponse, Paginated…)
  config/            → env.ts (single ENV object — import once, use everywhere)
  assets/            → static assets
```

### Real backend vs. mock services
Many features were first built against the vanilla-JS prototype with **mock/localStorage** services.
As backend endpoints land, a feature gets a real service — sometimes a parallel `*Real.service.ts`
alongside the mock one (e.g. `campsReal.service.ts`, `appointmentsReal.service.ts`). Features already
wired to the **real** backend: `access-management` (tenant/role/role-type/permission-group),
`geo-profile`, `qa-feedback`, `auth` (incl. `/auth/me`). When wiring a mocked feature to the backend,
follow the `*Real.service.ts` pattern and keep the same shared `api` axios instance.

---

## Architecture Rules

### Feature-based, not type-based
Code is grouped by **feature**, not by type. Everything related to auth lives in `features/auth/`. Never scatter a feature's files across top-level `pages/`, `hooks/`, `components/` folders.

### Top-level `components/`, `hooks/`, `lib/` = truly shared only
Only code used by 2+ features goes at the top level. If it's only used by one feature, it belongs inside that feature's folder.

### No barrel re-exports unless necessary
Keep imports explicit. Avoid `index.ts` barrels that just re-export everything — they obscure what's actually being used.

---

## Routing Convention

All routes use React Router v7's `createBrowserRouter`.

**Root router** (`src/app/router.tsx`):
- Defines the root path with `RootLayout` as element
- Imports and spreads child routes from each feature's routes file
- Do NOT define page routes here directly

```typescript
// router.tsx
import { authRoutes } from '../features/auth/auth.routes'

const appRouter = createBrowserRouter([
    {
        path: '/',
        element: <RootLayout />,
        children: [
            ...authRoutes,
            // add feature routes here
        ],
    },
])
```

**Feature routes** (`features/[feature]/[feature].routes.tsx`):
- Export a `routes` array (not a router)
- Define all paths for that feature

```typescript
// auth.routes.tsx
export const authRoutes = [
    { path: 'login', element: <LoginPage /> },
    { path: 'register', element: <RegisterPage /> },
]
```

**Layouts**: Nest layouts as route elements. `RootLayout` contains the main shell. Add feature-specific layouts as nested route parents within that feature's routes.

---

## Global Providers

All global providers (React context, theme, query clients, etc.) go inside `AppProvider.tsx`. The order matters — outer providers wrap inner ones.

```typescript
// AppProvider.tsx
const AppProvider = () => (
    <>
        {/* Add providers wrapping RouterProvider here */}
        <RouterProvider router={appRouter} />
    </>
)
```

Never add a provider directly in `main.tsx` — it goes in `AppProvider`.

---

## State Management

- Feature-level state → `features/[feature]/store.ts`
- Keep state co-located with the feature that owns it
- Global state (authenticated user, app theme) → top-level context or a dedicated store, wrapped in `AppProvider`
- No prop-drilling across more than 2 levels — lift to context or store

---

## Styling — Tailwind CSS v4

- Tailwind v4 uses CSS-first config (no `tailwind.config.js`)
- All custom theme tokens defined in `src/index.css` via `@theme`
- Use Tailwind utility classes directly in JSX
- No inline `style={{}}` unless dynamically computed values (e.g. pixel positions from JS)
- Responsive: mobile-first (`sm:`, `md:`, `lg:`)

---

## API Communication

- Single shared Axios instance at `src/lib/api/api.ts` — `baseURL: ENV.Api.BaseUrl + '/api/v1'`,
  `withCredentials: true`. Never use raw `fetch` or a second axios instance.
- Auth is httpOnly cookies — the frontend never reads/stores tokens. A 401 interceptor redirects to login.
- Data flow is strict: **page → hook (TanStack Query) → feature service (axios) → backend.**
  Pages never call a service or axios directly; hooks never inline axios.
- Response envelopes are typed in `src/types/common.types.ts` (`ApiResponse<T>`, `PaginatedResponse<T>`).
- The base URL comes from `ENV.Api.BaseUrl` (`src/config/env.ts`) — never `import.meta.env.X` directly.

---

## Component Conventions

- Functional components only, no class components
- One component per file
- File name = component name in PascalCase (`LoginPage.tsx`, `UserCard.tsx`)
- Props interface defined above the component, named `[ComponentName]Props`
- Keep components lean — extract logic to hooks, not inside JSX

```typescript
interface LoginPageProps {
    // ...
}
const LoginPage = ({}: LoginPageProps) => {
    // ...
}
export default LoginPage
```

- Page components live in `features/[feature]/pages/` — they are route targets, not reused
- UI primitives (Button, Input, Modal) live in `components/ui/` — they are fully reusable, have no feature-specific logic

---

## Hook Conventions

- Custom hooks are prefixed with `use`
- Feature-scoped hooks: `features/[feature]/hooks/hooks.tsx` (or split by concern)
- Global hooks: `src/hooks/`
- Hooks handle data fetching, form state, and complex UI logic — keep components declarative

---

## What's Done

Core shell (AppProvider → RouterProvider, RootLayout/AppLayout/AuthLayout, shared axios + queryClient,
`useAuth`, role-based nav) is in place. ~25 feature folders exist with real pages, routes, hooks, and
services. Every feature is wired in `src/app/router.tsx`.

- **Wired to the real backend:** auth (login, `/auth/me`), access-management (tenant / role /
  role-type / permission-group), geo-profile, qa-feedback.
- **Built against the prototype, still mock/localStorage:** dashboard, crm (leads/sales/clients/
  appointments/divisions), camps, projects (+ Gantt), diet, fo, dedicatedops, om, pharma, doctors,
  billing, analytics, admin, hq, reminders, contacts. Each has a `// TODO: wire to real API` service.

## What's Next

- Migrate mocked features onto real backend endpoints as they land (use the `*Real.service.ts` pattern).
- Adopt the backend's permission-based access model (gate nav/routes/UI on permissions, not role
  names) once the backend exposes the permission array — see root `../CLAUDE.md` §5a (decision locked, wiring deferred).
- No mobile app yet — the root doc's `mobile/` is planned, not built.
