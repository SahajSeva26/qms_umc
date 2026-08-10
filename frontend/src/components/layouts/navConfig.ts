import type { UserRole } from '@/types/auth.types'
import { AUTH_ROUTES }      from '@/features/auth/auth.routes'
import { DASHBOARD_ROUTES } from '@/features/dashboard/dashboard.routes'
import { CRM_ROUTES }       from '@/features/crm/crm.routes'
import { CONTACT_ROUTES }   from '@/features/contacts/contacts.routes'
import { DIVISION_ROUTES }  from '@/features/crm/divisions/divisions.routes'
import { ANALYTICS_ROUTES } from '@/features/analytics/analytics.routes'
import { CAMPS_ROUTES }     from '@/features/camps/camps.routes'
import { DIET_ROUTES }      from '@/features/diet/diet.routes'
import { FO_ROUTES }        from '@/features/fo/fo.routes'
import { DEDICATEDOPS_ROUTES } from '@/features/dedicatedops/dedicatedops.routes'
import { PHARMA_ROUTES }    from '@/features/pharma/pharma.routes'
import { PROJECTS_ROUTES }  from '@/features/projects/projects.routes'
import { OM_ROUTES }        from '@/features/om/om.routes'
import { DOCTORS_ROUTES }   from '@/features/doctors/doctors.routes'
import { GEO_PROFILE_ROUTES } from '@/features/geo-profile/geoProfile.constants'
import { BILLING_ROUTES }   from '@/features/billing/billing.routes'
import { ADMIN_ROUTES }     from '@/features/admin/admin.routes'
import { ACCESS_MANAGEMENT_ROUTES }      from '@/features/access-management/accessManagement.routes'
import { QA_FEEDBACK_ROUTES } from '@/features/qa-feedback/qa-feedback.routes'

// ── Types ────────────────────────────────────────────────────────────────────

export interface NavItem {
  id:           string
  label:        string
  icon:         string   // react-icons/fi name without the "Fi" prefix
  path:         string   // always imported from the feature's own routes file
  // super_admin and admin resolved in getNavForRole — not listed here.
  // Omitted entirely (not just []) on items whose real visibility is driven
  // by REAL_GATED_NAV_ITEMS in Sidebar.tsx instead — see getNavForRole's
  // own comment for why those must pass through the flat-list branch
  // unconditionally rather than being filtered out by a stale role list.
  rolesAllowed?: UserRole[]
}

export interface NavSubsection {
  title: string
  items: NavItem[]
}

export interface NavSection {
  section: string
  subs:    NavSubsection[]
}

// ── Nav item registry ────────────────────────────────────────────────────────
// Each item declares exactly which non-admin roles can see it.
// super_admin and admin always see everything — handled in getNavForRole.

const ALL_NAV_ITEMS: NavItem[] = [

  // Overview
  { id: 'dashboard',    label: 'Dashboard',                   icon: 'Grid',          path: DASHBOARD_ROUTES.DASHBOARD,
    rolesAllowed: [] },

  { id: 'sales',        label: 'Dashboard',                   icon: 'Grid',          path: CRM_ROUTES.SALES,
    rolesAllowed: [] },

  { id: 'analytics',    label: 'Sales Analytics',             icon: 'TrendingUp',    path: ANALYTICS_ROUTES.ANALYTICS_SALES,
    rolesAllowed: [] },

  { id: 'foanalytics',  label: 'FO Analytics',                icon: 'Navigation',    path: ANALYTICS_ROUTES.ANALYTICS_FO,
    rolesAllowed: [] },

  { id: 'docanalytics', label: 'Doctor Analytics',            icon: 'Activity',      path: ANALYTICS_ROUTES.ANALYTICS_DOCTORS,
    rolesAllowed: [] },

  { id: 'finanalytics', label: 'Financial Analytics',         icon: 'BarChart2',     path: ANALYTICS_ROUTES.ANALYTICS_FINANCIAL,
    rolesAllowed: [] },

  // Sales & CRM — Pipeline
  // Real visibility for all 5 items in this Pipeline group is enforced by
  // REAL_GATED_NAV_ITEMS in Sidebar.tsx (matching each route's own
  // RequirePermission guard, with the usual system:manage bypass) — see
  // that map for the actual gate. No rolesAllowed here; see getNavForRole's
  // comment for why omitting it (not []) is what lets that real gate apply
  // uniformly to every role, not just super_admin/admin.
  { id: 'appointments', label: 'Appointments',                icon: 'Calendar',      path: CRM_ROUTES.APPOINTMENTS },

  { id: 'crm',          label: 'CRM',                         icon: 'Users',         path: CRM_ROUTES.CRM },

  { id: 'clientmgmt',   label: 'Client Management',           icon: 'Briefcase',     path: CRM_ROUTES.CLIENTS },

  { id: 'contacts',     label: 'Contacts',                    icon: 'Users',         path: CONTACT_ROUTES.CONTACTS },

  // Moved here 2026-07-31 from a standalone "Company Data" section — Division
  // is a CRM-native concept (Lead/Project/Appointment/Role all key off it
  // directly), not a separate top-level area.
  { id: 'divisions',    label: 'Divisions',                   icon: 'Globe',         path: DIVISION_ROUTES.DIVISIONS },

  // Sales & CRM — Delivery
  { id: 'projects',     label: 'Project Management',          icon: 'FolderPlus',    path: PROJECTS_ROUTES.PROJECTS },

  { id: 'gantt',        label: 'Project Gantt',               icon: 'Sliders',       path: PROJECTS_ROUTES.PROJECTS_GANTT },

  // Operations — Camps
  { id: 'omportal',     label: 'Ops Manager',                 icon: 'Clipboard',     path: OM_ROUTES.OM,
    rolesAllowed: [] },

  // Real visibility enforced by REAL_GATED_NAV_ITEMS in Sidebar.tsx.
  { id: 'camps',        label: 'Camp Management',             icon: 'Sun',           path: CAMPS_ROUTES.CAMPS },

  { id: 'telecamps',    label: 'Teleconsultation Camps',      icon: 'Video',         path: CAMPS_ROUTES.CAMPS_TELE,
    rolesAllowed: [] },

  { id: 'diet',         label: 'Diet Camps',                  icon: 'Heart',         path: DIET_ROUTES.DIET,
    rolesAllowed: [] },

  { id: 'dedicatedops', label: 'Dedicated Ops',               icon: 'Briefcase',     path: DEDICATEDOPS_ROUTES.DEDICATEDOPS,
    rolesAllowed: [] },

  // Operations — Dietitians
  { id: 'dietapprovals',label: 'Diet Coord Workspace',        icon: 'Briefcase',     path: DIET_ROUTES.DIET_APPROVALS,
    rolesAllowed: [] },

  { id: 'dietpayment',  label: 'Dietitian Payment',           icon: 'DollarSign',    path: BILLING_ROUTES.BILLING_DIETITIAN,
    rolesAllowed: [] },

  { id: 'dietprofile',  label: 'Dietitian Profiles',          icon: 'UserCheck',     path: DIET_ROUTES.DIET_PROFILES,
    rolesAllowed: [] },

  // Operations — Field Network
  { id: 'fo',           label: 'FO Management',               icon: 'Navigation',    path: FO_ROUTES.FO,
    rolesAllowed: [] },

  { id: 'fo_workspace', label: 'My FO Workspace',             icon: 'Briefcase',     path: FO_ROUTES.FO_WORKSPACE,
    rolesAllowed: [] },

  { id: 'foconfig',     label: 'FO Config Master',            icon: 'Settings',      path: FO_ROUTES.FO_CONFIG,
    rolesAllowed: [] },

  // GET /doctors is intentionally open to any authenticated user
  // server-side (only create/update require doctor:manage) — no
  // REAL_GATED_NAV_ITEMS entry either; gating this nav link would fight
  // the backend's actual, deliberate contract.
  { id: 'doctors',      label: 'Doctor Management',           icon: 'Activity',      path: DOCTORS_ROUTES.DOCTORS },

  // GET /geo-profiles is intentionally open to any authenticated user
  // server-side (only create/update require geo-profile:manage) — same
  // pattern as Doctors above. No REAL_GATED_NAV_ITEMS entry either; gating
  // this nav link would fight the backend's actual, deliberate contract.
  { id: 'geoprofiles',  label: 'Field Staff Coverage',        icon: 'MapPin',        path: GEO_PROFILE_ROUTES.GEO_PROFILES,
    rolesAllowed: [] },

  // Operations — Coverage & Alerts
  { id: 'hqmapping',    label: 'HQ Mapping & Serviceability', icon: 'MapPin',        path: ADMIN_ROUTES.ADMIN_HQ,
    rolesAllowed: [] },

  { id: 'incidents',    label: 'Incidents · SOS',             icon: 'AlertTriangle', path: OM_ROUTES.OM_INCIDENTS,
    rolesAllowed: [] },

  { id: 'remindauto',   label: 'AI Reminders',                icon: 'Cpu',           path: ADMIN_ROUTES.ADMIN_REMINDERS,
    rolesAllowed: [] },

  // Pharma Network
  { id: 'pharma',       label: 'Pharma Portal',               icon: 'Briefcase',     path: PHARMA_ROUTES.PHARMA,
    rolesAllowed: [] },

  { id: 'hoportal',     label: 'HO Portal',                   icon: 'Briefcase',     path: PHARMA_ROUTES.PHARMA_HO,
    rolesAllowed: [] },

  { id: 'rsmportal',    label: 'RSM Portal',                  icon: 'Globe',         path: PHARMA_ROUTES.PHARMA_RSM,
    rolesAllowed: [] },

  { id: 'asmportal',    label: 'ASM Portal',                  icon: 'Users',         path: PHARMA_ROUTES.PHARMA_ASM,
    rolesAllowed: [] },

  { id: 'mrportal',     label: 'MR Portal',                   icon: 'User',          path: PHARMA_ROUTES.PHARMA_MR,
    rolesAllowed: [] },

  // Resources
  { id: 'inventory',    label: 'Inventory & Devices',         icon: 'Package',       path: ADMIN_ROUTES.ADMIN_INVENTORY,
    rolesAllowed: [] },

  { id: 'assets',       label: 'Asset Management',            icon: 'Box',           path: ADMIN_ROUTES.ADMIN_ASSETS,
    rolesAllowed: [] },

  { id: 'kpi',          label: 'Order & KPI Engine',          icon: 'Activity',      path: ADMIN_ROUTES.ADMIN_KPI,
    rolesAllowed: [] },

  // Finance
  { id: 'billing',      label: 'Accounting',                  icon: 'FileText',      path: BILLING_ROUTES.BILLING,
    rolesAllowed: [] },

  { id: 'crminvoicing', label: 'CRM Invoicing',               icon: 'FileText',      path: BILLING_ROUTES.BILLING_CRM,
    rolesAllowed: [] },

  { id: 'accounting',   label: 'CFO Accounting',              icon: 'TrendingUp',    path: BILLING_ROUTES.BILLING_CFO,
    rolesAllowed: [] },

  // System
  { id: 'admin',        label: 'Admin',                       icon: 'Shield',        path: ADMIN_ROUTES.ADMIN,
    rolesAllowed: [] },

  // Real visibility enforced by REAL_GATED_NAV_ITEMS in Sidebar.tsx.
  { id: 'users',        label: 'Users',                       icon: 'Users',         path: ADMIN_ROUTES.ADMIN_USERS },

  { id: 'settings',     label: 'Settings',                    icon: 'Settings',      path: ADMIN_ROUTES.ADMIN_SETTINGS,
    rolesAllowed: [] },

  // Access Management entities — real visibility enforced by
  // REAL_GATED_NAV_ITEMS in Sidebar.tsx, matching each route's own
  // RequirePermission guard exactly (with the usual system:manage bypass).
  { id: 'tenants',          label: 'Companies',               icon: 'Globe',         path: ACCESS_MANAGEMENT_ROUTES.TENANTS },

  { id: 'permissiongroups', label: 'Permission Groups',       icon: 'Shield',        path: ACCESS_MANAGEMENT_ROUTES.PERMISSION_GROUPS },

  { id: 'roletypes',        label: 'Role Types',              icon: 'Sliders',       path: ACCESS_MANAGEMENT_ROUTES.ROLE_TYPES },

  { id: 'roles',            label: 'Roles',                   icon: 'UserCheck',     path: ACCESS_MANAGEMENT_ROUTES.ROLES },

  { id: 'qafeedback',       label: 'QA Feedback',             icon: 'MessageSquare', path: QA_FEEDBACK_ROUTES.QA_FEEDBACK_REVIEW },
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
      { title: 'Pipeline', items: ['appointments', 'crm', 'clientmgmt', 'contacts', 'divisions'].map((id) => NAV_BY_ID[id]) },
      { title: 'Delivery', items: ['projects', 'gantt'].map((id) => NAV_BY_ID[id]) },
    ],
  },
  {
    section: 'Operations',
    subs: [
      { title: 'Camps',             items: ['omportal', 'camps', 'telecamps', 'diet', 'dedicatedops'].map((id) => NAV_BY_ID[id]) },
      { title: 'Dietitians',        items: ['dietapprovals', 'dietpayment', 'dietprofile'].map((id) => NAV_BY_ID[id]) },
      { title: 'Field Network',     items: ['fo', 'fo_workspace', 'foconfig', 'doctors', 'geoprofiles'].map((id) => NAV_BY_ID[id]) },
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
      { title: '', items: ['admin', 'users', 'settings', 'tenants', 'permissiongroups', 'roletypes', 'roles', 'qafeedback'].map((id) => NAV_BY_ID[id]) },
    ],
  },
]

// ── getNavForRole ─────────────────────────────────────────────────────────────
// super_admin and admin → full sectioned view (Sidebar renders FULL_NAV_SECTIONS)
// all other roles       → flat list filtered by rolesAllowed, except items
//                          with no rolesAllowed at all, which pass through
//                          unconditionally and defer to Sidebar.tsx's
//                          REAL_GATED_NAV_ITEMS/isNavItemVisible instead —
//                          the same real-permission gate the 'ALL' branch
//                          already uses for those items, so a non-admin role
//                          gets the same real answer instead of a stale,
//                          hand-authored role guess.

export function getNavForRole(role: UserRole): NavItem[] | 'ALL' {
  if (role === 'super_admin' || role === 'admin') return 'ALL'
  return ALL_NAV_ITEMS.filter((item) => item.rolesAllowed === undefined || item.rolesAllowed.includes(role))
}

// ── Path constant re-exports ──────────────────────────────────────────────────
// Import any route constant from here — no need to know which feature owns it.

export {
  AUTH_ROUTES,    DASHBOARD_ROUTES, CRM_ROUTES,      ANALYTICS_ROUTES,
  CAMPS_ROUTES,   DIET_ROUTES,      FO_ROUTES,        PHARMA_ROUTES,
  PROJECTS_ROUTES, OM_ROUTES,       DOCTORS_ROUTES,   BILLING_ROUTES, ADMIN_ROUTES,
}
