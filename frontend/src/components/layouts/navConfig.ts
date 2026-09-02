import { AUTH_ROUTES }      from '@/features/auth/auth.routes'
import { DASHBOARD_ROUTES } from '@/features/dashboard/dashboard.routes'
import { CRM_ROUTES }       from '@/features/crm/crm.routes'
import { ANALYTICS_ROUTES } from '@/features/analytics/analytics.routes'
import { CAMPS_ROUTES }     from '@/features/camps/camps.routes'
import { DIET_ROUTES }      from '@/features/diet/diet.routes'
import { FO_ROUTES }        from '@/features/fo/fo.routes'
import { DEDICATEDOPS_ROUTES } from '@/features/dedicatedops/dedicatedops.routes'
import { PHARMA_ROUTES }    from '@/features/pharma/pharma.constants'
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
  path:         string
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
// Real visibility is enforced by Sidebar.tsx's system:manage section gate
// and REAL_GATED_NAV_ITEMS per-item permission checks, not by anything here.

const ALL_NAV_ITEMS: NavItem[] = [

  // Overview
  { id: 'dashboard',    label: 'Dashboard',                   icon: 'Grid',          path: DASHBOARD_ROUTES.DASHBOARD },

  { id: 'analytics',    label: 'Sales Analytics',             icon: 'TrendingUp',    path: ANALYTICS_ROUTES.ANALYTICS_SALES },

  { id: 'foanalytics',  label: 'FO Analytics',                icon: 'Navigation',    path: ANALYTICS_ROUTES.ANALYTICS_FO },

  { id: 'docanalytics', label: 'Doctor Analytics',            icon: 'Activity',      path: ANALYTICS_ROUTES.ANALYTICS_DOCTORS },

  { id: 'finanalytics', label: 'Financial Analytics',         icon: 'BarChart2',     path: ANALYTICS_ROUTES.ANALYTICS_FINANCIAL },

  // Sales & CRM — Pipeline
  { id: 'appointments', label: 'Appointments',                icon: 'Calendar',      path: CRM_ROUTES.APPOINTMENTS },

  { id: 'crm',          label: 'CRM',                         icon: 'Users',         path: CRM_ROUTES.CRM },

  { id: 'tenants',      label: 'Client Management',           icon: 'Globe',         path: ACCESS_MANAGEMENT_ROUTES.TENANTS },

  // Sales & CRM — Delivery
  { id: 'projects',     label: 'Project Management',          icon: 'FolderPlus',    path: PROJECTS_ROUTES.PROJECTS },

  { id: 'gantt',        label: 'Project Gantt',               icon: 'Sliders',       path: PROJECTS_ROUTES.PROJECTS_GANTT },

  // Operations — Camps
  { id: 'omportal',     label: 'Ops Manager',                 icon: 'Clipboard',     path: OM_ROUTES.OM },

  { id: 'camps',        label: 'Camp Management',             icon: 'Sun',           path: CAMPS_ROUTES.CAMPS },

  { id: 'telecamps',    label: 'Teleconsultation Camps',      icon: 'Video',         path: CAMPS_ROUTES.CAMPS_TELE },

  { id: 'diet',         label: 'Diet Camps',                  icon: 'Heart',         path: DIET_ROUTES.DIET },

  { id: 'dedicatedops', label: 'Dedicated Ops',               icon: 'Briefcase',     path: DEDICATEDOPS_ROUTES.DEDICATEDOPS },

  // Operations — Dietitians
  { id: 'dietapprovals',label: 'Diet Coord Workspace',        icon: 'Briefcase',     path: DIET_ROUTES.DIET_APPROVALS },

  { id: 'dietpayment',  label: 'Dietitian Payment',           icon: 'DollarSign',    path: BILLING_ROUTES.BILLING_DIETITIAN },

  { id: 'dietprofile',  label: 'Dietitian Profiles',          icon: 'UserCheck',     path: DIET_ROUTES.DIET_PROFILES },

  // Operations — Field Network
  { id: 'fo',           label: 'FO Management',               icon: 'Navigation',    path: FO_ROUTES.FO },

  { id: 'fo_workspace', label: 'My FO Workspace',             icon: 'Briefcase',     path: FO_ROUTES.FO_WORKSPACE },

  { id: 'foconfig',     label: 'FO Config Master',            icon: 'Settings',      path: FO_ROUTES.FO_CONFIG },

  // GET /doctors is open to any authenticated user server-side — no REAL_GATED_NAV_ITEMS entry.
  { id: 'doctors',      label: 'Doctor Management',           icon: 'Activity',      path: DOCTORS_ROUTES.DOCTORS },

  // GET /geo-profiles is open to any authenticated user server-side — no REAL_GATED_NAV_ITEMS entry.
  { id: 'geoprofiles',  label: 'Field Staff Coverage',        icon: 'MapPin',        path: GEO_PROFILE_ROUTES.GEO_PROFILES },

  // Operations — Coverage & Alerts
  { id: 'hqmapping',    label: 'HQ Mapping & Serviceability', icon: 'MapPin',        path: ADMIN_ROUTES.ADMIN_HQ },

  { id: 'incidents',    label: 'Incidents · SOS',             icon: 'AlertTriangle', path: OM_ROUTES.OM_INCIDENTS },

  { id: 'remindauto',   label: 'AI Reminders',                icon: 'Cpu',           path: ADMIN_ROUTES.ADMIN_REMINDERS },

  // Pharma Portal — one link; Sidebar.tsx overrides this label per-role at render time.
  { id: 'pharma',       label: 'Pharma Portal',               icon: 'Briefcase',     path: PHARMA_ROUTES.PHARMA },

  // Resources
  { id: 'inventory',    label: 'Inventory & Devices',         icon: 'Package',       path: ADMIN_ROUTES.ADMIN_INVENTORY },

  { id: 'itemmaster',   label: 'Item Master',                 icon: 'BookOpen',      path: ADMIN_ROUTES.ADMIN_INVENTORY_MASTERS },

  { id: 'inventoryitems', label: 'Inventory Items',           icon: 'Cpu',           path: ADMIN_ROUTES.ADMIN_INVENTORY_ITEMS },

  { id: 'inventoryops', label: 'Inventory Operations',        icon: 'UserCheck',     path: ADMIN_ROUTES.ADMIN_INVENTORY_OPERATIONS },

  { id: 'assets',       label: 'Asset Management',            icon: 'Box',           path: ADMIN_ROUTES.ADMIN_ASSETS },

  { id: 'kpi',          label: 'Order & KPI Engine',          icon: 'Activity',      path: ADMIN_ROUTES.ADMIN_KPI },

  // Finance
  { id: 'billing',      label: 'Accounting',                  icon: 'FileText',      path: BILLING_ROUTES.BILLING },

  { id: 'crminvoicing', label: 'CRM Invoicing',               icon: 'FileText',      path: BILLING_ROUTES.BILLING_CRM },

  { id: 'accounting',   label: 'CFO Accounting',              icon: 'TrendingUp',    path: BILLING_ROUTES.BILLING_CFO },

  // System
  { id: 'admin',        label: 'Admin',                       icon: 'Shield',        path: ADMIN_ROUTES.ADMIN },

  { id: 'users',        label: 'Users',                       icon: 'Users',         path: ADMIN_ROUTES.ADMIN_USERS },

  { id: 'settings',     label: 'Settings',                    icon: 'Settings',      path: ADMIN_ROUTES.ADMIN_SETTINGS },

  { id: 'permissiongroups', label: 'Permission Groups',       icon: 'Shield',        path: ACCESS_MANAGEMENT_ROUTES.PERMISSION_GROUPS },

  { id: 'roletypes',        label: 'Role Types',              icon: 'Sliders',       path: ACCESS_MANAGEMENT_ROUTES.ROLE_TYPES },

  { id: 'roles',            label: 'Roles',                   icon: 'UserCheck',     path: ACCESS_MANAGEMENT_ROUTES.ROLES },

  { id: 'qafeedback',       label: 'QA Feedback',             icon: 'MessageSquare', path: QA_FEEDBACK_ROUTES.QA_FEEDBACK_REVIEW },

  // Temporary system-admin-only phase — route itself is guarded on
  // system:manage (admin.routes.tsx), not just this section's own gate.
  { id: 'testmaster',       label: 'Test Master',             icon: 'BookOpen',      path: ADMIN_ROUTES.ADMIN_TESTS },
]

const NAV_BY_ID = Object.fromEntries(ALL_NAV_ITEMS.map((n) => [n.id, n]))

// ── Full sectioned nav — rendered for every account, filtered by Sidebar.tsx's real permission gates ──

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
      { title: 'Pipeline', items: ['appointments', 'crm', 'tenants'].map((id) => NAV_BY_ID[id]) },
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
    section: 'Pharma Portal',
    subs: [
      { title: '', items: ['pharma'].map((id) => NAV_BY_ID[id]) },
    ],
  },
  {
    section: 'Resources',
    subs: [
      // 'inventory' (mock/localStorage-only), 'assets' and 'kpi' (both still the
      // AdminPage stub) are deliberately hidden from nav, not deleted — only
      // itemmaster/inventoryitems/inventoryops are backend-wired today. Their
      // NAV_BY_ID entries and routes stay intact for a future re-add.
      { title: '', items: ['itemmaster', 'inventoryitems', 'inventoryops'].map((id) => NAV_BY_ID[id]) },
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
      { title: '', items: ['admin', 'users', 'settings', 'permissiongroups', 'roletypes', 'roles', 'qafeedback', 'testmaster'].map((id) => NAV_BY_ID[id]) },
    ],
  },
]

// ── Path constant re-exports ──────────────────────────────────────────────────
// Import any route constant from here — no need to know which feature owns it.

export {
  AUTH_ROUTES,    DASHBOARD_ROUTES, CRM_ROUTES,      ANALYTICS_ROUTES,
  CAMPS_ROUTES,   DIET_ROUTES,      FO_ROUTES,        PHARMA_ROUTES,
  PROJECTS_ROUTES, OM_ROUTES,       DOCTORS_ROUTES,   BILLING_ROUTES, ADMIN_ROUTES,
}
