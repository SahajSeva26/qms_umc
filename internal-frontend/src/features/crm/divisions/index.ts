// Public surface of the Divisions feature — other features import from here, never from
// features/crm/divisions/{hooks,components}/* directly. Read-only division listing is
// @/hooks/useDivisionsShared.ts (the established shared-hook pattern) — this barrel covers the
// write/UI surface TenantDetailPage composes (filter bar, table, create modal, export).
export { useDivisionsFilters } from '@/features/crm/divisions/hooks/useDivisionsFilters'
export { default as DivisionsFilterBar } from '@/features/crm/divisions/components/DivisionsFilterBar'
export { default as DivisionsTable } from '@/features/crm/divisions/components/DivisionsTable'
export { default as CreateDivisionModal } from '@/features/crm/divisions/components/CreateDivisionModal'
export { DIVISION_ROUTES } from '@/features/crm/divisions/divisions.routes'
export { divisionService } from '@/features/crm/divisions/division.service'
export { downloadDivisionsCsv } from '@/features/crm/divisions/division.export'
