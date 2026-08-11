import {
  buildMockCommandCenterData,
  buildMockDashboardData,
  buildMockFilterOptions,
} from '@/features/dashboard/dashboard.mock'
import type {
  CommandCenterData,
  DashboardData,
  DashboardFilterOptions,
  DashboardFilterState,
} from '@/types/dashboard.types'

// ===========================================================================
// DASHBOARD DATA SOURCE BOUNDARY
// ---------------------------------------------------------------------------
// This file is the ONLY place that knows where dashboard data comes from.
// Pages, components and hooks depend on the typed contract in
// types/dashboard.types.ts and are agnostic to the source — so swapping mock
// for a real API is a change to this file alone.
//
// STATUS: mock-backed. Verified against the backend on 2026-08-08 —
// `backend/src/bin/app.ts` mounts 16 routers (auth, users, tenants,
// permission-groups, role-types, roles, divisions, leads, contacts,
// appointments, projects, qa-feedback, doctors, geo-profiles, camps,
// counters) and NONE of them is a dashboard/analytics/reporting module.
// There is no invoice, expense, payment, patient or sales-target model in the
// backend at all, and no server-side aggregation exists (the only
// `.aggregate()` in the whole backend is geoProfile's $geoNear).
//
// Existing entity endpoints were evaluated and rejected as a substitute:
//   - They return `{count, items}` with page-level pagination only. Rebuilding
//     these KPIs client-side would mean downloading whole collections purely to
//     reduce them in the browser — the exact anti-pattern this boundary exists
//     to prevent.
//   - Per-client / per-specialty `breakdown[]` rows would require one request
//     per entity (N+1).
//   - `GET /tenants` is scoped by `ctx.where()` to the caller's own tenant, so
//     its `count` is 1 for every non-system user — it cannot answer
//     "total companies".
//   - Every KPI carries a `ly` (last-year) comparison. The backend stores no
//     historical snapshots and only `/camps` supports date-range filters, so
//     `ly` has no real source for any metric.
//
// TO GO LIVE, the backend needs to expose pre-aggregated endpoints, e.g.:
//   GET /dashboard/summary?dateRange&client&division&campType&rep
//        -> { headline[], company, project, sales, accounts, doctors, patients }
//   GET /dashboard/filter-options   -> selectable clients/divisions/reps
//   GET /dashboard/command-center   -> { quarter, tasks[] }
// Each must return values already reduced server-side, in the `{v, ly, unit}`
// + short `breakdown[]` shape below. When they exist, replace the three
// function bodies here with `api.get(...)` calls and add Zod parsing at this
// boundary (see the note on validation in the hooks).
// ===========================================================================

export async function getDashboardData(filters: DashboardFilterState): Promise<DashboardData> {
  // TODO: wire to GET /dashboard/summary — pass `filters` as query params.
  return buildMockDashboardData(filters)
}

export async function getDashboardFilterOptions(): Promise<DashboardFilterOptions> {
  // TODO: wire to GET /dashboard/filter-options
  return buildMockFilterOptions()
}

export async function getCommandCenterData(): Promise<CommandCenterData> {
  // TODO: wire to GET /dashboard/command-center
  return buildMockCommandCenterData()
}
