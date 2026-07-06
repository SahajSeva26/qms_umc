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
  backend/     → Express API
  frontend/    → React SPA
```

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

`feature/user-module`

## Current Status (as of 2026-07-06)

### Backend — in progress
- Auth module: register, login, logout, refresh-token — DONE
- User module: get, search, update — DONE
- Token rotation, account lockout, httpOnly cookie auth — DONE
- Swagger fully wired

### Frontend — early scaffold
- Routing skeleton done (React Router v7, createBrowserRouter)
- Auth feature folder created, files empty
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
```
