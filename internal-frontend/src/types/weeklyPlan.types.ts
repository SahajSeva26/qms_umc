// Weekly-plan domain types — mirrors the real backend exactly:
// backend/src/modules/crm/weekly-plan/{weekly-plan.model,weekly-plan.constants,weekly-plan.validators}.ts

export type WeeklyPlanStatus = 'pending' | 'approved' | 'rejected'

export const WEEKLY_PLAN_TRANSITION_MAP: Record<WeeklyPlanStatus, WeeklyPlanStatus[]> = {
  pending: ['approved', 'rejected'],
  approved: [],
  rejected: ['pending'],
}

export const WEEKLY_PLAN_STATUS_LABEL: Record<WeeklyPlanStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

// Matches the prototype's .wk-pill status colors exactly (sales-weekly-plan.js).
export const WEEKLY_PLAN_STATUS_COLOR: Record<WeeklyPlanStatus, string> = {
  pending: '#b45309',
  approved: '#047857',
  rejected: '#b91c1c',
}

export interface WeeklyPlanPopulatedRole {
  _id?: string
  code: string
  name: string
}

export interface WeeklyPlanPopulatedTenant {
  _id?: string
  name: string
  code: string
}

export interface WeeklyPlanPopulatedDivision {
  _id?: string
  name: string
  code: string
}

export interface WeeklyPlanPopulatedContact {
  _id?: string
  name: string
  designation?: string
}

export interface WeeklyPlanAgenda {
  public?: string
  private?: string
}

// select: 'code title status' on the backend's populate (weekly-plan.service.ts)
export interface WeeklyPlanPopulatedLead {
  _id?: string
  code: string
  title: string
  status: string
}

// select: 'code status' on the backend's populate
export interface WeeklyPlanPopulatedInvoice {
  _id?: string
  code: string
  status: string
}

// select: 'code type status' on the backend's populate
export interface WeeklyPlanPopulatedParent {
  _id?: string
  code: string
  type: string
  status: string
}

// one planned visit within the week — mirrors the embedded planSchema on the model
export interface WeeklyPlanItem {
  id: string
  tenant: WeeklyPlanPopulatedTenant | string
  division: WeeklyPlanPopulatedDivision | string
  contactPerson: WeeklyPlanPopulatedContact | string
  lead?: WeeklyPlanPopulatedLead | string
  invoice?: WeeklyPlanPopulatedInvoice | string
  parent?: WeeklyPlanPopulatedParent | string
  agenda?: WeeklyPlanAgenda
  date: string
}

export interface WeeklyPlanStageHistoryActor {
  roleId?: string
  name?: string
  email?: string
}

export interface WeeklyPlanStageHistoryEntry {
  from: WeeklyPlanStatus
  to: WeeklyPlanStatus
  reason: string
  actor: WeeklyPlanStageHistoryActor
  createdAt: string
}

export interface WeeklyPlanEntity {
  id: string
  startDate: string
  endDate: string
  salesPerson: WeeklyPlanPopulatedRole | string
  status: WeeklyPlanStatus
  plans: WeeklyPlanItem[]
  stageHistory: WeeklyPlanStageHistoryEntry[]
  createdAt: string
  updatedAt: string
}

// a single planned visit on the create/update payload — plain ids only
export interface WeeklyPlanItemPayload {
  tenant: string
  division: string
  contactPerson: string
  lead?: string
  invoice?: string
  parent?: string
  agenda?: WeeklyPlanAgenda
  date: string
}

// At most 6 plans per week. salesPerson is auto-set to the creator server-side — never sent here.
// Approval is permission-gated (weekly-plan:manage) — no supervisor concept on this module.
export interface CreateWeeklyPlanPayload {
  startDate: string
  endDate: string
  plans?: WeeklyPlanItemPayload[]
}

// salesPerson/status are NOT editable here — status only moves via moveStage(). Passing `plans`
// replaces the whole list (still capped at 6).
export interface UpdateWeeklyPlanPayload {
  startDate?: string
  endDate?: string
  plans?: WeeklyPlanItemPayload[]
}

export interface MoveWeeklyPlanStagePayload {
  to: WeeklyPlanStatus
  reason: string
}

export interface SearchWeeklyPlanQuery {
  status?: WeeklyPlanStatus
  salesPerson?: string
  dateFrom?: string
  dateTo?: string
  page?: string
  limit?: string
}
