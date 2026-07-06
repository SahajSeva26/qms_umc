# Frontend — Architecture & Conventions

React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router v7.

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
      hooks/         → feature-scoped custom hooks
      store.ts       → feature-level state (context or zustand slice)
      [feature].routes.tsx  → route definitions for this feature

  hooks/             → global/cross-feature custom hooks
  lib/               → utility functions, API clients, helpers
  config/            → app-wide config (API base URL, constants, etc.)
  assets/            → static assets
```

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

- API base URL in `src/config/` (or `src/lib/`)
- Backend runs at `http://localhost:3000/api/v1`
- All requests send `credentials: 'include'` (cookies are httpOnly, no manual token handling)
- Create a shared API client in `src/lib/` — do not use raw `fetch` scattered across components

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

- `main.tsx` → `AppProvider` → `RouterProvider` wiring complete
- `RootLayout` with `<Outlet />` in place
- Auth feature folder scaffolded (`pages`, `components`, `hooks`, `store.ts`, `auth.routes.tsx`) — files are empty shells

## What's Next

- Auth pages: Login, Register
- API client setup in `src/lib/`
- Auth store (current user, login/logout actions)
- Protected route wrapper (redirect to login if not authenticated)
- Integration with backend auth endpoints
