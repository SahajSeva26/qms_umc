// Real backend-integrated types for the Invoice module — mirrors
// backend/src/modules/finance/invoice/{invoice.model,invoice.constants,invoice.validators,invoice.mapper}.ts

export type InvoiceStatus = 'draft' | 'approved' | 'issued' | 'grn_signed' | 'paid' | 'cancelled'

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  issued: 'Issued',
  grn_signed: 'GRN Signed',
  paid: 'Paid',
  cancelled: 'Cancelled',
}

// Not defined server-side — one consistent swatch per status for pills.
export const INVOICE_STATUS_COLOR: Record<InvoiceStatus, string> = {
  draft: '#94a3b8',
  approved: '#3b6dff',
  issued: '#8b5cf6',
  grn_signed: '#f59e0b',
  paid: '#10b981',
  cancelled: '#ef4444',
}

// INVOICE_TRANSITION_MAP mirrored exactly from invoice.constants.ts — the only legal next stages per status.
export const INVOICE_TRANSITION_MAP: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['approved'],
  approved: ['issued'],
  issued: ['grn_signed', 'cancelled'],
  grn_signed: ['paid'],
  paid: [],
  cancelled: [],
}

export interface InvoicePopulatedTenant {
  _id?: string
  name: string
  code: string
}

export interface InvoicePopulatedProject {
  _id?: string
  name: string
  code: string
  status?: string
}

export interface InvoiceStageActor {
  roleId?: string
  name?: string
  email?: string
}

export interface InvoiceStageHistoryEntry {
  from: InvoiceStatus
  to: InvoiceStatus
  reason: string
  actor: InvoiceStageActor
  createdAt: string
}

// get()/search() populate tenant/project; create()/update()/moveStage() echo
// back bare ObjectId strings (no re-fetch with populate before responding) —
// same duality pattern as ProjectEntity's own reference fields.
export interface InvoiceEntity {
  id: string
  code: string
  tenant: InvoicePopulatedTenant | string
  project: InvoicePopulatedProject | string
  issueDate: string
  dueDate?: string
  subtotal: number
  tax: number
  discount: number
  total: number
  status: InvoiceStatus
  syncToTally: boolean
  stageHistory: InvoiceStageHistoryEntry[]
  createdAt: string
  updatedAt: string
}

export interface SearchInvoiceQuery {
  project?: string
  status?: InvoiceStatus
  dateFrom?: string
  dateTo?: string
  page?: string
  limit?: string
}

export interface CreateInvoicePayload {
  project: string
  camps: string[]
  issueDate?: string
  dueDate?: string
  tax?: number
  discount?: number
  syncToTally?: boolean
}

export interface UpdateInvoicePayload {
  issueDate?: string
  dueDate?: string
  tax?: number
  discount?: number
  syncToTally?: boolean
}

export interface MoveInvoiceStagePayload {
  to: InvoiceStatus
  reason: string
}
