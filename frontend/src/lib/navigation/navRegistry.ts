// Data-only nav registry — imports ONLY dependency-free *.paths.ts route-constant modules, never a route/page/layout/component.
import { DASHBOARD_ROUTES } from '@/features/dashboard/dashboard.paths'
import { CRM_ROUTES }       from '@/features/crm/crm.paths'
import { ANALYTICS_ROUTES } from '@/features/analytics/analytics.paths'
import { CAMPS_ROUTES }     from '@/features/camps/camps.paths'
import { DIET_ROUTES }      from '@/features/diet/diet.paths'
import { FO_ROUTES }        from '@/features/fo/fo.paths'
import { DEDICATEDOPS_ROUTES } from '@/features/dedicatedops/dedicatedops.paths'
import { PHARMA_ROUTES }    from '@/features/pharma/pharma.constants'
import { PROJECTS_ROUTES }  from '@/features/projects/projects.paths'
import { DOCTORS_ROUTES }   from '@/features/doctors/doctors.paths'
import { GEO_PROFILE_ROUTES } from '@/features/geo-profile/geoProfile.constants'
import { BILLING_ROUTES }   from '@/features/billing/billing.paths'
import { ADMIN_ROUTES }     from '@/features/admin/admin.paths'
import { ACCESS_MANAGEMENT_ROUTES }      from '@/features/access-management/accessManagement.paths'
import { EMPLOYEE_ROUTES }  from '@/features/access-management/employee/employee.paths'
import { QA_FEEDBACK_ROUTES } from '@/features/qa-feedback/qa-feedback.paths'

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
// Real visibility is enforced by lib/navigation/visibleNav.ts, not by anything here.

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

  { id: 'salesdashboard', label: 'Sales Dashboard',           icon: 'TrendingUp',    path: CRM_ROUTES.SALES_DASHBOARD },

  { id: 'tenants',      label: 'Client Management',           icon: 'Globe',         path: ACCESS_MANAGEMENT_ROUTES.TENANTS },

  // Sales & CRM — Delivery
  { id: 'projects',     label: 'Project Management',          icon: 'FolderPlus',    path: PROJECTS_ROUTES.PROJECTS },

  { id: 'gantt',        label: 'Project Gantt',               icon: 'Sliders',       path: PROJECTS_ROUTES.PROJECTS_GANTT },

  // Operations — Camps
  { id: 'camps',        label: 'Camp Management',             icon: 'Sun',           path: CAMPS_ROUTES.CAMPS },

  { id: 'campsscreening', label: 'Screening Camps',           icon: 'Sun',           path: CAMPS_ROUTES.CAMPS_SCREENING },

  { id: 'campsdiet',    label: 'Diet Camps',                  icon: 'Heart',         path: CAMPS_ROUTES.CAMPS_DIET },

  { id: 'telecamps',    label: 'Teleconsultation Camps',      icon: 'Video',         path: CAMPS_ROUTES.CAMPS_TELE },

  // Mock, no real backend — slated for eventual deletion.
  { id: 'diet',         label: 'Mock Diet Page',              icon: 'Heart',         path: DIET_ROUTES.DIET },

  { id: 'dedicatedops', label: 'Dedicated Ops',               icon: 'Briefcase',     path: DEDICATEDOPS_ROUTES.DEDICATEDOPS },

  // Operations — Dietitians
  { id: 'dietapprovals',label: 'Diet Coord Workspace',        icon: 'Briefcase',     path: DIET_ROUTES.DIET_APPROVALS },

  { id: 'dietpayment',  label: 'Dietitian Payment',           icon: 'DollarSign',    path: BILLING_ROUTES.BILLING_DIETITIAN },

  { id: 'dietprofile',  label: 'Dietitian Profiles',          icon: 'UserCheck',     path: DIET_ROUTES.DIET_PROFILES },

  // Operations — Field Network
  { id: 'fieldofficers', label: 'FO Management',              icon: 'Navigation',    path: FO_ROUTES.FIELD_OFFICERS },

  // Gated by role TYPE (RoleGuard), not permission codes — see visibleNav.ts's isNavItemVisible
  // special case and employeeAccess.ts. Placed in Operations, not System (hidden without system:manage).
  { id: 'employees',    label: 'Employees',                   icon: 'Users',         path: EMPLOYEE_ROUTES.EMPLOYEES },

  // GET /doctors is open to any authenticated user server-side — no REAL_GATED_NAV_ITEMS entry.
  { id: 'doctors',      label: 'Doctor Management',           icon: 'Activity',      path: DOCTORS_ROUTES.DOCTORS },

  // GET /geo-profiles is open to any authenticated user server-side — no REAL_GATED_NAV_ITEMS entry.
  { id: 'geoprofiles',  label: 'Field Staff Coverage',        icon: 'MapPin',        path: GEO_PROFILE_ROUTES.GEO_PROFILES },

  // Operations — Coverage & Alerts
  { id: 'hqmapping',    label: 'HQ Mapping & Serviceability', icon: 'MapPin',        path: ADMIN_ROUTES.ADMIN_HQ },

  { id: 'remindauto',   label: 'AI Reminders',                icon: 'Cpu',           path: ADMIN_ROUTES.ADMIN_REMINDERS },

  // Pharma Portal — one link; Sidebar.tsx overrides this label per-role at render time.
  { id: 'pharma',       label: 'Pharma Portal',               icon: 'Briefcase',     path: PHARMA_ROUTES.PHARMA },

  // Resources
  // One page, one nav entry — Item Master/Devices/Consumables/etc. are tabs inside it now.
  { id: 'inventory',    label: 'Inventory Management',        icon: 'BookOpen',      path: ADMIN_ROUTES.ADMIN_INVENTORY },

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

// ── Full sectioned nav — rendered for every account, filtered by visibleNav.ts's real permission gates ──

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
      // salesdashboard first — it's visible only to sales-head/sales-rep (visibleNav.ts), so this
      // also puts it topmost in THEIR sidebar specifically, per explicit request.
      { title: 'Pipeline', items: ['salesdashboard', 'appointments', 'crm', 'tenants'].map((id) => NAV_BY_ID[id]) },
      // 'gantt' commented out, not deleted — no prototype equivalent exists to re-skin against; page itself still works.
      { title: 'Delivery', items: ['projects'/* , 'gantt' */].map((id) => NAV_BY_ID[id]) },
    ],
  },
  {
    section: 'Pharma Portal',
    subs: [
      { title: '', items: ['pharma'].map((id) => NAV_BY_ID[id]) },
    ],
  },
  {
    section: 'Operations',
    subs: [
      // Only 'camps'/'campsscreening'/'campsdiet' are backend-wired; the rest stay commented out, not deleted.
      { title: 'Camps',             items: ['camps', 'campsscreening', 'campsdiet'/* , 'telecamps', 'diet', 'dedicatedops' */].map((id) => NAV_BY_ID[id]) },
      // Commented out, not deleted — this whole subsection is still mock-backed.
      // { title: 'Dietitians',        items: ['dietapprovals', 'dietpayment', 'dietprofile'].map((id) => NAV_BY_ID[id]) },
      { title: 'Field Network',     items: ['fieldofficers', 'employees', 'doctors', 'geoprofiles'].map((id) => NAV_BY_ID[id]) },
      // Commented out, not deleted — this whole subsection is still mock-backed.
      // { title: 'Coverage & Alerts', items: ['hqmapping', 'remindauto'].map((id) => NAV_BY_ID[id]) },
    ],
  },
  {
    section: 'Resources',
    subs: [
      // 'assets'/'kpi' are deliberately hidden from nav, not deleted — the
      // mock 'inventory' item was fully removed (see md-files, inventory cleanup).
      { title: '', items: ['inventory'].map((id) => NAV_BY_ID[id]) },
    ],
  },
  {
    section: 'Finance',
    subs: [
      // 'billing'/'accounting' are commented out, not deleted — both are still
      // stubs with no dedicated backend module (see billing.routes.tsx).
      { title: '', items: ['crminvoicing'/* , 'billing', 'accounting' */].map((id) => NAV_BY_ID[id]) },
    ],
  },
  {
    section: 'System',
    subs: [
      { title: '', items: ['admin', 'users', 'settings', 'permissiongroups', 'roletypes', 'roles', 'qafeedback', 'testmaster'].map((id) => NAV_BY_ID[id]) },
    ],
  },
]
