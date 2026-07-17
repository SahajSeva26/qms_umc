import type { UserRole } from '@/types/auth.types'
import { AUTH_ROUTES }      from '@/features/auth/auth.routes'
import { DASHBOARD_ROUTES } from '@/features/dashboard/dashboard.routes'
import { CRM_ROUTES }       from '@/features/crm/crm.routes'
import { ANALYTICS_ROUTES } from '@/features/analytics/analytics.routes'
import { CAMPS_ROUTES }     from '@/features/camps/camps.routes'
import { DIET_ROUTES }      from '@/features/diet/diet.routes'
import { FO_ROUTES }        from '@/features/fo/fo.routes'
import { DEDICATEDOPS_ROUTES } from '@/features/dedicatedops/dedicatedops.routes'
import { PHARMA_ROUTES }    from '@/features/pharma/pharma.routes'
import { PROJECTS_ROUTES }  from '@/features/projects/projects.routes'
import { OM_ROUTES }        from '@/features/om/om.routes'
import { DOCTORS_ROUTES }   from '@/features/doctors/doctors.routes'
import { BILLING_ROUTES }   from '@/features/billing/billing.routes'
import { ADMIN_ROUTES }     from '@/features/admin/admin.routes'
import { ACCESS_MANAGEMENT_ROUTES }      from '@/features/access-management/accessManagement.routes'

// ── Types ────────────────────────────────────────────────────────────────────

export interface NavItem {
  id:           string
  label:        string
  icon:         string   // react-icons/fi name without the "Fi" prefix
  path:         string   // always imported from the feature's own routes file
  rolesAllowed: UserRole[]  // super_admin and admin resolved in getNavForRole — not listed here
}

export interface NavSubsection {
  title: string
  items: NavItem[]
}

export interface NavSection {
  section: string
  subs:    NavSubsection[]
}

// ── Role → landing page ──────────────────────────────────────────────────────

export const ROLE_HOME: Record<UserRole, string> = {
  super_admin:      DASHBOARD_ROUTES.DASHBOARD,
  admin:            DASHBOARD_ROUTES.DASHBOARD,
  sales_lead:       CRM_ROUTES.CRM,
  sales_rep:        CRM_ROUTES.CRM,
  camp_coord:       CAMPS_ROUTES.CAMPS,
  diet_camp_coord:  DIET_ROUTES.DIET,
  om_screening:     OM_ROUTES.OM,
  om_diet:          OM_ROUTES.OM,
  fo:               FO_ROUTES.FO,
  dedicated_fo:     FO_ROUTES.FO,
  logistics:        ADMIN_ROUTES.ADMIN,
  accounts:         BILLING_ROUTES.BILLING,
  dietitian:        DIET_ROUTES.DIET,
  analytics_viewer: ANALYTICS_ROUTES.ANALYTICS,
  pharma_ho:        PHARMA_ROUTES.PHARMA_HO,
  pharma_rsm:       PHARMA_ROUTES.PHARMA_RSM,
  pharma_asm:       PHARMA_ROUTES.PHARMA_ASM,
  pharma_mr:        PHARMA_ROUTES.PHARMA_MR,
}

// ── Nav item registry ────────────────────────────────────────────────────────
// Each item declares exactly which non-admin roles can see it.
// super_admin and admin always see everything — handled in getNavForRole.

const ALL_NAV_ITEMS: NavItem[] = [

  // Overview
  { id: 'dashboard',    label: 'Dashboard',                   icon: 'Grid',          path: DASHBOARD_ROUTES.DASHBOARD,
    rolesAllowed: ['logistics', 'analytics_viewer'] },

  { id: 'sales',        label: 'Dashboard',                   icon: 'Grid',          path: CRM_ROUTES.SALES,
    rolesAllowed: ['sales_lead', 'sales_rep'] },

  { id: 'analytics',    label: 'Sales Analytics',             icon: 'TrendingUp',    path: ANALYTICS_ROUTES.ANALYTICS_SALES,
    rolesAllowed: ['sales_lead', 'logistics', 'analytics_viewer'] },

  { id: 'foanalytics',  label: 'FO Analytics',                icon: 'Navigation',    path: ANALYTICS_ROUTES.ANALYTICS_FO,
    rolesAllowed: ['analytics_viewer'] },

  { id: 'docanalytics', label: 'Doctor Analytics',            icon: 'Activity',      path: ANALYTICS_ROUTES.ANALYTICS_DOCTORS,
    rolesAllowed: ['analytics_viewer'] },

  { id: 'finanalytics', label: 'Financial Analytics',         icon: 'BarChart2',     path: ANALYTICS_ROUTES.ANALYTICS_FINANCIAL,
    rolesAllowed: ['accounts', 'analytics_viewer'] },

  // Sales & CRM — Pipeline
  { id: 'appointments', label: 'Appointments',                icon: 'Calendar',      path: CRM_ROUTES.APPOINTMENTS,
    rolesAllowed: ['sales_lead', 'sales_rep'] },

  { id: 'crm',          label: 'CRM',                         icon: 'Users',         path: CRM_ROUTES.CRM,
    rolesAllowed: ['sales_lead', 'sales_rep', 'camp_coord', 'diet_camp_coord'] },

  { id: 'clientmgmt',   label: 'Client Management',           icon: 'Briefcase',     path: CRM_ROUTES.CLIENTS,
    rolesAllowed: ['sales_lead', 'sales_rep', 'camp_coord', 'diet_camp_coord'] },

  // Sales & CRM — Delivery
  { id: 'projects',     label: 'Project Management',          icon: 'FolderPlus',    path: PROJECTS_ROUTES.PROJECTS,
    rolesAllowed: ['sales_lead', 'sales_rep', 'camp_coord', 'diet_camp_coord'] },

  { id: 'gantt',        label: 'Project Gantt',               icon: 'Sliders',       path: PROJECTS_ROUTES.PROJECTS_GANTT,
    rolesAllowed: ['camp_coord', 'diet_camp_coord', 'logistics'] },

  // Operations — Camps
  { id: 'omportal',     label: 'Ops Manager',                 icon: 'Clipboard',     path: OM_ROUTES.OM,
    rolesAllowed: ['om_screening', 'om_diet'] },

  { id: 'camps',        label: 'Camp Management',             icon: 'Sun',           path: CAMPS_ROUTES.CAMPS,
    rolesAllowed: ['camp_coord', 'om_screening', 'sales_rep', 'logistics'] },

  { id: 'telecamps',    label: 'Teleconsultation Camps',      icon: 'Video',         path: CAMPS_ROUTES.CAMPS_TELE,
    rolesAllowed: ['camp_coord', 'om_screening', 'om_diet', 'sales_rep'] },

  { id: 'diet',         label: 'Diet Camps',                  icon: 'Heart',         path: DIET_ROUTES.DIET,
    rolesAllowed: ['camp_coord', 'diet_camp_coord', 'om_diet', 'sales_lead', 'sales_rep', 'fo', 'dietitian', 'logistics', 'pharma_ho', 'pharma_mr', 'pharma_asm', 'pharma_rsm'] },

  { id: 'dedicatedops', label: 'Dedicated Ops',               icon: 'Briefcase',     path: DEDICATEDOPS_ROUTES.DEDICATEDOPS,
    rolesAllowed: ['om_screening'] },

  // Operations — Dietitians
  { id: 'dietapprovals',label: 'Diet Coord Workspace',        icon: 'Briefcase',     path: DIET_ROUTES.DIET_APPROVALS,
    rolesAllowed: ['diet_camp_coord', 'om_diet'] },

  { id: 'dietpayment',  label: 'Dietitian Payment',           icon: 'DollarSign',    path: BILLING_ROUTES.BILLING_DIETITIAN,
    rolesAllowed: ['diet_camp_coord', 'om_diet', 'accounts'] },

  { id: 'dietprofile',  label: 'Dietitian Profiles',          icon: 'UserCheck',     path: DIET_ROUTES.DIET_PROFILES,
    rolesAllowed: ['diet_camp_coord', 'om_diet', 'accounts', 'dietitian'] },

  // Operations — Field Network
  { id: 'fo',           label: 'FO Management',               icon: 'Navigation',    path: FO_ROUTES.FO,
    rolesAllowed: ['sales_lead', 'sales_rep', 'camp_coord', 'om_screening', 'om_diet', 'logistics', 'dedicated_fo'] },

  { id: 'fo_workspace', label: 'My FO Workspace',             icon: 'Briefcase',     path: FO_ROUTES.FO_WORKSPACE,
    rolesAllowed: ['fo'] },

  { id: 'foconfig',     label: 'FO Config Master',            icon: 'Settings',      path: FO_ROUTES.FO_CONFIG,
    rolesAllowed: ['om_screening', 'om_diet'] },

  { id: 'doctors',      label: 'Doctor Management',           icon: 'Activity',      path: DOCTORS_ROUTES.DOCTORS,
    rolesAllowed: ['camp_coord', 'diet_camp_coord', 'pharma_ho', 'pharma_mr', 'pharma_asm', 'pharma_rsm'] },

  // Operations — Coverage & Alerts
  { id: 'hqmapping',    label: 'HQ Mapping & Serviceability', icon: 'MapPin',        path: ADMIN_ROUTES.ADMIN_HQ,
    rolesAllowed: ['sales_lead', 'sales_rep', 'camp_coord', 'diet_camp_coord', 'om_screening', 'om_diet', 'fo', 'dedicated_fo', 'logistics', 'accounts', 'analytics_viewer'] },

  { id: 'incidents',    label: 'Incidents · SOS',             icon: 'AlertTriangle', path: OM_ROUTES.OM_INCIDENTS,
    rolesAllowed: ['om_screening', 'om_diet', 'fo'] },

  { id: 'remindauto',   label: 'AI Reminders',                icon: 'Cpu',           path: ADMIN_ROUTES.ADMIN_REMINDERS,
    rolesAllowed: ['camp_coord', 'om_screening', 'om_diet'] },

  // Pharma Network
  { id: 'pharma',       label: 'Pharma Portal',               icon: 'Briefcase',     path: PHARMA_ROUTES.PHARMA,
    rolesAllowed: [] },

  { id: 'hoportal',     label: 'HO Portal',                   icon: 'Briefcase',     path: PHARMA_ROUTES.PHARMA_HO,
    rolesAllowed: ['pharma_ho'] },

  { id: 'rsmportal',    label: 'RSM Portal',                  icon: 'Globe',         path: PHARMA_ROUTES.PHARMA_RSM,
    rolesAllowed: ['pharma_rsm'] },

  { id: 'asmportal',    label: 'ASM Portal',                  icon: 'Users',         path: PHARMA_ROUTES.PHARMA_ASM,
    rolesAllowed: ['pharma_rsm', 'pharma_asm'] },

  { id: 'mrportal',     label: 'MR Portal',                   icon: 'User',          path: PHARMA_ROUTES.PHARMA_MR,
    rolesAllowed: ['pharma_rsm', 'pharma_asm', 'pharma_mr'] },

  // Resources
  { id: 'inventory',    label: 'Inventory & Devices',         icon: 'Package',       path: ADMIN_ROUTES.ADMIN_INVENTORY,
    rolesAllowed: ['camp_coord', 'diet_camp_coord', 'om_screening', 'om_diet', 'fo', 'logistics', 'accounts', 'dietitian'] },

  { id: 'assets',       label: 'Asset Management',            icon: 'Box',           path: ADMIN_ROUTES.ADMIN_ASSETS,
    rolesAllowed: ['logistics'] },

  { id: 'kpi',          label: 'Order & KPI Engine',          icon: 'Activity',      path: ADMIN_ROUTES.ADMIN_KPI,
    rolesAllowed: ['analytics_viewer'] },

  // Finance
  { id: 'billing',      label: 'Accounting',                  icon: 'FileText',      path: BILLING_ROUTES.BILLING,
    rolesAllowed: ['sales_lead', 'accounts', 'logistics'] },

  { id: 'crminvoicing', label: 'CRM Invoicing',               icon: 'FileText',      path: BILLING_ROUTES.BILLING_CRM,
    rolesAllowed: ['om_screening', 'om_diet', 'accounts'] },

  { id: 'accounting',   label: 'CFO Accounting',              icon: 'TrendingUp',    path: BILLING_ROUTES.BILLING_CFO,
    rolesAllowed: ['accounts'] },

  // System
  { id: 'admin',        label: 'Admin',                       icon: 'Shield',        path: ADMIN_ROUTES.ADMIN,
    rolesAllowed: [] },

  { id: 'users',        label: 'Users',                       icon: 'Users',         path: ADMIN_ROUTES.ADMIN_USERS,
    rolesAllowed: [] },

  { id: 'settings',     label: 'Settings',                    icon: 'Settings',      path: ADMIN_ROUTES.ADMIN_SETTINGS,
    rolesAllowed: [] },

  // Access Management entities — no real backend permission maps onto the existing
  // 18-role UserRole enum yet, so rolesAllowed is set explicitly to
  // ['super_admin', 'admin'] rather than left at [] (which would mean
  // "invisible to everyone except the super_admin/admin ALL-bypass" — same
  // runtime effect via getNavForRole's early-return for those two roles,
  // but explicit here for future readers).
  { id: 'tenants',          label: 'Tenants',                 icon: 'Globe',         path: ACCESS_MANAGEMENT_ROUTES.TENANTS,
    rolesAllowed: ['super_admin', 'admin'] },

  { id: 'permissiongroups', label: 'Permission Groups',       icon: 'Shield',        path: ACCESS_MANAGEMENT_ROUTES.PERMISSION_GROUPS,
    rolesAllowed: ['super_admin', 'admin'] },

  { id: 'roletypes',        label: 'Role Types',              icon: 'Sliders',       path: ACCESS_MANAGEMENT_ROUTES.ROLE_TYPES,
    rolesAllowed: ['super_admin', 'admin'] },

  { id: 'roles',            label: 'Roles',                   icon: 'UserCheck',     path: ACCESS_MANAGEMENT_ROUTES.ROLES,
    rolesAllowed: ['super_admin', 'admin'] },
]

const NAV_BY_ID = Object.fromEntries(ALL_NAV_ITEMS.map((n) => [n.id, n]))

// ── Full sectioned nav — super_admin and admin only ───────────────────────────

export const FULL_NAV_SECTIONS: NavSection[] = [
  {
    section: 'Overview',
    subs: [
      { title: '', items: ['dashboard', 'analytics', 'foanalytics', 'docanalytics', 'finanalytics'].map((id) => NAV_BY_ID[id]) },
    ],
  },
  {
    section: 'Sales & CRM',
    subs: [
      { title: 'Pipeline', items: ['appointments', 'crm', 'clientmgmt'].map((id) => NAV_BY_ID[id]) },
      { title: 'Delivery', items: ['projects', 'gantt'].map((id) => NAV_BY_ID[id]) },
    ],
  },
  {
    section: 'Operations',
    subs: [
      { title: 'Camps',             items: ['omportal', 'camps', 'telecamps', 'diet', 'dedicatedops'].map((id) => NAV_BY_ID[id]) },
      { title: 'Dietitians',        items: ['dietapprovals', 'dietpayment', 'dietprofile'].map((id) => NAV_BY_ID[id]) },
      { title: 'Field Network',     items: ['fo', 'fo_workspace', 'foconfig', 'doctors'].map((id) => NAV_BY_ID[id]) },
      { title: 'Coverage & Alerts', items: ['hqmapping', 'incidents', 'remindauto'].map((id) => NAV_BY_ID[id]) },
    ],
  },
  {
    section: 'Pharma Network',
    subs: [
      { title: '', items: ['pharma', 'hoportal', 'rsmportal', 'asmportal', 'mrportal'].map((id) => NAV_BY_ID[id]) },
    ],
  },
  {
    section: 'Resources',
    subs: [
      { title: '', items: ['inventory', 'assets', 'kpi'].map((id) => NAV_BY_ID[id]) },
    ],
  },
  {
    section: 'Finance',
    subs: [
      { title: '', items: ['billing', 'crminvoicing', 'accounting'].map((id) => NAV_BY_ID[id]) },
    ],
  },
  {
    section: 'System',
    subs: [
      { title: '', items: ['admin', 'users', 'settings', 'tenants', 'permissiongroups', 'roletypes', 'roles'].map((id) => NAV_BY_ID[id]) },
    ],
  },
]

// ── getNavForRole ─────────────────────────────────────────────────────────────
// super_admin and admin → full sectioned view (Sidebar renders FULL_NAV_SECTIONS)
// all other roles       → flat list filtered by rolesAllowed

export function getNavForRole(role: UserRole): NavItem[] | 'ALL' {
  if (role === 'super_admin' || role === 'admin') return 'ALL'
  return ALL_NAV_ITEMS.filter((item) => item.rolesAllowed.includes(role))
}

// ── Path constant re-exports ──────────────────────────────────────────────────
// Import any route constant from here — no need to know which feature owns it.

export {
  AUTH_ROUTES,    DASHBOARD_ROUTES, CRM_ROUTES,      ANALYTICS_ROUTES,
  CAMPS_ROUTES,   DIET_ROUTES,      FO_ROUTES,        PHARMA_ROUTES,
  PROJECTS_ROUTES, OM_ROUTES,       DOCTORS_ROUTES,   BILLING_ROUTES, ADMIN_ROUTES,
}
