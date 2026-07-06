import type { UserRole } from '@/types/auth.types'

export interface NavItem {
  id: string
  label: string
  icon: string
  path: string
  live?: boolean
}

export interface NavSubsection {
  title: string
  items: NavItem[]
}

export interface NavSection {
  section: string
  subs: NavSubsection[]
}

// Full nav item registry — translated from prototype NAV array in app.js
const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',    label: 'Dashboard',                   icon: 'layout-dashboard',      path: '/dashboard',      live: true },
  { id: 'sales',        label: 'Sales Dashboard',             icon: 'layout-dashboard',      path: '/crm/sales',      live: true },
  { id: 'analytics',    label: 'Sales Analytics',             icon: 'trending-up',           path: '/analytics/sales', live: true },
  { id: 'foanalytics',  label: 'FO Analytics',                icon: 'route',                 path: '/analytics/fo',   live: true },
  { id: 'docanalytics', label: 'Doctor Analytics',            icon: 'stethoscope',           path: '/analytics/doctors', live: true },
  { id: 'finanalytics', label: 'Financial Analytics',         icon: 'bar-chart-3',           path: '/analytics/financial', live: true },
  { id: 'appointments', label: 'Appointments',                icon: 'calendar-clock',        path: '/crm/appointments', live: true },
  { id: 'crm',          label: 'CRM',                         icon: 'users-round',           path: '/crm',            live: true },
  { id: 'clientmgmt',   label: 'Client Management',           icon: 'building-2',            path: '/crm/clients',    live: true },
  { id: 'projects',     label: 'Project Management',          icon: 'folder-open',           path: '/projects',       live: true },
  { id: 'gantt',        label: 'Project Gantt',               icon: 'gantt-chart',           path: '/projects/gantt', live: true },
  { id: 'omportal',     label: 'Ops Manager',                 icon: 'clipboard-check',       path: '/om',             live: true },
  { id: 'camps',        label: 'Camp Management',             icon: 'tent',                  path: '/camps',          live: true },
  { id: 'telecamps',    label: 'Teleconsultation Camps',      icon: 'video',                 path: '/camps/tele',     live: true },
  { id: 'diet',         label: 'Diet Camps',                  icon: 'apple',                 path: '/diet',           live: true },
  { id: 'dedicatedops', label: 'Dedicated Ops',               icon: 'briefcase',             path: '/fo/dedicated',   live: true },
  { id: 'dietapprovals',label: 'Diet Coord Workspace',        icon: 'briefcase',             path: '/diet/approvals', live: true },
  { id: 'dietpayment',  label: 'Dietitian Payment',           icon: 'hand-coins',            path: '/billing/dietitian', live: true },
  { id: 'dietprofile',  label: 'Dietitian Profiles',          icon: 'user-circle',           path: '/diet/profiles',  live: true },
  { id: 'fo',           label: 'FO Management',               icon: 'route',                 path: '/fo',             live: true },
  { id: 'fo_workspace', label: 'My FO Workspace',             icon: 'briefcase',             path: '/fo/workspace',   live: true },
  { id: 'foconfig',     label: 'FO Config Master',            icon: 'settings-2',            path: '/fo/config',      live: true },
  { id: 'doctors',      label: 'Doctor Management',           icon: 'stethoscope',           path: '/doctors',        live: true },
  { id: 'hqmapping',    label: 'HQ Mapping & Serviceability', icon: 'map-pinned',            path: '/admin/hq',       live: true },
  { id: 'incidents',    label: 'Incidents · SOS',             icon: 'alert-triangle',        path: '/om/incidents',   live: true },
  { id: 'remindauto',   label: 'AI Reminders',                icon: 'bot',                   path: '/admin/reminders', live: true },
  { id: 'pharma',       label: 'Pharma Portal',               icon: 'building-2',            path: '/pharma',         live: true },
  { id: 'hoportal',     label: 'HO Portal',                   icon: 'building-2',            path: '/pharma/ho',      live: true },
  { id: 'rsmportal',    label: 'RSM Portal',                  icon: 'globe',                 path: '/pharma/rsm',     live: true },
  { id: 'asmportal',    label: 'ASM Portal',                  icon: 'users-round',           path: '/pharma/asm',     live: true },
  { id: 'mrportal',     label: 'MR Portal',                   icon: 'user-round',            path: '/pharma/mr',      live: true },
  { id: 'inventory',    label: 'Inventory & Devices',         icon: 'package',               path: '/admin/inventory', live: true },
  { id: 'assets',       label: 'Asset Management',            icon: 'box-select',            path: '/admin/assets',   live: true },
  { id: 'kpi',          label: 'Order & KPI Engine',          icon: 'gauge',                 path: '/admin/kpi',      live: true },
  { id: 'billing',      label: 'Accounting',                  icon: 'receipt-indian-rupee',  path: '/billing',        live: true },
  { id: 'crminvoicing', label: 'CRM Invoicing',               icon: 'file-text',             path: '/billing/crm',    live: true },
  { id: 'accounting',   label: 'CFO Accounting',              icon: 'trending-up',           path: '/billing/cfo',    live: true },
  { id: 'admin',        label: 'Admin',                       icon: 'shield-check',          path: '/admin',          live: true },
  { id: 'settings',     label: 'Settings',                    icon: 'settings',              path: '/admin/settings', live: true },
]

const NAV_BY_ID = Object.fromEntries(ALL_NAV_ITEMS.map((n) => [n.id, n]))

// Full sectioned nav for super_admin — mirrors prototype structure exactly
// navExclude: ['sales'] for super_admin (Sales Dashboard merged into main Dashboard)
export const FULL_NAV_SECTIONS: NavSection[] = [
  {
    section: 'Overview',
    subs: [{ title: '', items: ['dashboard', 'analytics', 'foanalytics', 'docanalytics', 'finanalytics'].map((id) => NAV_BY_ID[id]) }],
  },
  {
    section: 'Sales & CRM',
    subs: [
      { title: 'Pipeline',  items: ['appointments', 'crm', 'clientmgmt'].map((id) => NAV_BY_ID[id]) },
      { title: 'Delivery',  items: ['projects', 'gantt'].map((id) => NAV_BY_ID[id]) },
    ],
  },
  {
    section: 'Operations',
    subs: [
      { title: 'Camps',         items: ['omportal', 'camps', 'telecamps', 'diet', 'dedicatedops'].map((id) => NAV_BY_ID[id]) },
      { title: 'Dietitians',    items: ['dietapprovals', 'dietpayment', 'dietprofile'].map((id) => NAV_BY_ID[id]) },
      { title: 'Field Network', items: ['fo', 'fo_workspace', 'foconfig', 'doctors'].map((id) => NAV_BY_ID[id]) },
      { title: 'Coverage & Alerts', items: ['hqmapping', 'incidents', 'remindauto'].map((id) => NAV_BY_ID[id]) },
    ],
  },
  {
    section: 'Pharma Network',
    subs: [{ title: '', items: ['pharma', 'hoportal', 'rsmportal', 'asmportal', 'mrportal'].map((id) => NAV_BY_ID[id]) }],
  },
  {
    section: 'Resources',
    subs: [{ title: '', items: ['inventory', 'assets', 'kpi'].map((id) => NAV_BY_ID[id]) }],
  },
  {
    section: 'Finance',
    subs: [{ title: '', items: ['billing', 'crminvoicing', 'accounting'].map((id) => NAV_BY_ID[id]) }],
  },
  {
    section: 'System',
    subs: [{ title: '', items: ['admin', 'settings'].map((id) => NAV_BY_ID[id]) }],
  },
]

// Role → flat nav list (from prototype roles.js)
const ROLE_NAV: Record<UserRole, string[] | 'ALL'> = {
  super_admin:      'ALL',
  admin:            ['dashboard','sales','appointments','projects','crm','clientmgmt','camps','telecamps','hqmapping','omportal','dietapprovals','dietpayment','dietprofile','dedicatedops','incidents','remindauto','diet','pharma','mrportal','asmportal','rsmportal','hoportal','doctors','fo','fo_workspace','foconfig','inventory','assets','gantt','kpi','billing','crminvoicing','accounting','analytics','foanalytics','docanalytics','finanalytics','admin','settings'],
  sales_lead:       ['sales','appointments','projects','hqmapping','billing','crm','clientmgmt','inventory','fo','diet'],
  sales_rep:        ['sales','appointments','projects','hqmapping','crm','clientmgmt','camps','telecamps','fo','diet'],
  camp_coord:       ['camps','clientmgmt','projects','hqmapping','remindauto','diet','fo','doctors','inventory','gantt'],
  diet_camp_coord:  ['dietapprovals','dietpayment','dietprofile','clientmgmt','diet','projects','hqmapping','doctors','inventory','gantt'],
  om_screening:     ['omportal','dedicatedops','incidents','crminvoicing','remindauto','camps','telecamps','hqmapping','fo','foconfig','inventory'],
  om_diet:          ['omportal','dietapprovals','dietpayment','dietprofile','incidents','crminvoicing','remindauto','diet','telecamps','hqmapping','fo','foconfig','inventory'],
  fo:               ['fo_workspace','camps','incidents','diet','inventory','hqmapping'],
  dedicated_fo:     ['fo','inventory','hqmapping'],
  logistics:        ['dashboard','inventory','assets','camps','diet','fo','gantt','billing','analytics','hqmapping'],
  accounts:         ['accounting','crminvoicing','billing','dietpayment','dietprofile','finanalytics','inventory','hqmapping'],
  dietitian:        ['inventory','diet','dietprofile'],
  analytics_viewer: ['dashboard','analytics','foanalytics','docanalytics','finanalytics','kpi','hqmapping'],
  pharma_ho:        ['hoportal','doctors','camps','diet'],
  pharma_mr:        ['mrportal','doctors','camps','diet'],
  pharma_asm:       ['asmportal','mrportal','doctors','camps','diet'],
  pharma_rsm:       ['rsmportal','asmportal','mrportal','doctors','camps','diet'],
}

export function getNavForRole(role: UserRole): NavItem[] | 'ALL' {
  const nav = ROLE_NAV[role]
  if (nav === 'ALL') return 'ALL'
  return nav.map((id) => NAV_BY_ID[id]).filter(Boolean)
}
