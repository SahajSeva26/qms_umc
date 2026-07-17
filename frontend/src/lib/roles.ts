import type { UserRole } from '@/types/auth.types'

// ── Role group arrays ────────────────────────────────────────────────────────
// Derived from the UserRole union — change the type, change these.

export const INTERNAL_ROLES = [
  'super_admin', 'admin', 'sales_lead', 'sales_rep',
  'camp_coord', 'diet_camp_coord', 'om_screening', 'om_diet',
  'fo', 'dedicated_fo', 'logistics', 'accounts', 'dietitian', 'analytics_viewer',
] as const satisfies UserRole[]

export const PHARMA_ROLES = [
  'pharma_ho', 'pharma_rsm', 'pharma_asm', 'pharma_mr',
] as const satisfies UserRole[]

// ── Role display names ───────────────────────────────────────────────────────
export const ROLE_LABEL: Record<UserRole, string> = {
  super_admin:      'Super Admin',
  admin:            'Admin',
  sales_lead:       'Sales Head',
  sales_rep:        'Key Account Manager',
  camp_coord:       'Camp Coordinator',
  diet_camp_coord:  'Diet Coord',
  om_screening:     'OM · Screening',
  om_diet:          'OM · Diet',
  fo:               'Field Officer',
  dedicated_fo:     'Dedicated FO',
  logistics:        'Logistics',
  accounts:         'Accounts',
  dietitian:        'Dietitian',
  analytics_viewer: 'Analytics Viewer',
  pharma_ho:        'Pharma HO',
  pharma_rsm:       'Pharma RSM',
  pharma_asm:       'Pharma ASM',
  pharma_mr:        'Pharma MR',
}

// ── Role accent colors ───────────────────────────────────────────────────────
// Values reference CSS variables defined in index.css so dark mode is free.
export const ROLE_COLOR: Record<UserRole, string> = {
  super_admin:      'var(--qms-role-super-admin)',
  admin:            'var(--qms-role-admin)',
  sales_lead:       'var(--qms-role-sales-lead)',
  sales_rep:        'var(--qms-role-sales-rep)',
  camp_coord:       'var(--qms-role-camp)',
  diet_camp_coord:  'var(--qms-role-camp)',
  om_screening:     'var(--qms-role-sales-lead)',
  om_diet:          'var(--qms-role-camp)',
  fo:               'var(--qms-role-fo)',
  dedicated_fo:     'var(--qms-role-sales-rep)',
  logistics:        'var(--qms-role-logistics)',
  accounts:         'var(--qms-role-accounts)',
  dietitian:        'var(--qms-role-camp)',
  analytics_viewer: 'var(--qms-role-sales-rep)',
  pharma_ho:        'var(--qms-role-pharma-ho)',
  pharma_rsm:       'var(--qms-role-pharma-rsm)',
  pharma_asm:       'var(--qms-role-pharma-asm)',
  pharma_mr:        'var(--qms-role-pharma-mr)',
}
