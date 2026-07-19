// Staff/roster master — Field Officers, Dietitians, Camp Coordinators, and
// other internal QMS staff who get assigned to camps/projects. Distinct from
// `AuthUser` (types/auth.types.ts), which is the login/RBAC identity — a
// Person here is an operational roster record (who can be assigned work),
// not a login account. Mirrors the prototype's admin-data.js/admin-master.js
// PEOPLE array (window.QMS_MASTER.people), the master every OM/Dedicated
// Ops/Diet Camps screen reads FOs, Dietitians, and Coordinators from.
// TODO: entirely mock/frontend-only — no backend endpoints exist for a
// people/staff master yet.

export type PersonRole =
  | 'Field Officer'
  | 'Dietitian'
  | 'Camp Coordinator'
  | 'Diet Camp Coordinator'
  | 'Lab Technician'
  | 'Manpower'

// Prototype's empType classification — distinguishes QMS-payroll FOs from
// third-party/vendor-supplied FOs and manpower (om-data.js references this
// on real FO roster records).
export type EmploymentType = 'QMS_FO' | 'TP_FO' | 'TP_MANPOWER'

export interface Person {
  id: string
  name: string
  role: PersonRole
  phone: string
  email: string
  hq: string
  states: string[]
  city?: string
  joined: string

  empType?: EmploymentType
  vendor?: string
  relievedOn?: string

  // FO-specific operational metrics (om-data.js real-FO enrichment)
  salaryInr?: number
  campsPerDay?: number
  machinesAssigned?: string[]
  occupancyPct?: number
  efficiencyPct?: number
  feedbackAvg?: number

  // Dietitian-specific
  specialty?: string
  ratePerCamp?: number
  printingChargePerCamp?: number

  panMasked?: string
  aadharMasked?: string
  permanentAddress?: string
  temporaryAddress?: string
  altPhone?: string
  personalEmail?: string
  address?: string
  pincode?: string
  gmapLink?: string

  // FO Management / Workspace fields (fo-manager.js, fo-portal.js)
  daRule?: string
  taRule?: string
  daApplicable?: boolean
  taApplicable?: boolean
  deviceAssignApplicable?: boolean
  reportsTo?: string
  tone?: 'rose' | 'amber' | 'teal' | 'brand'
  userId?: string
  profileInitials?: string
}
