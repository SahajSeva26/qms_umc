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

export interface InvoicePopulatedDivision {
  _id?: string
  name: string
  code: string
}

export interface InvoicePopulatedProject {
  _id?: string
  name: string
  code: string
  status?: string
  division?: InvoicePopulatedDivision | string
  executionMode?: { poNumber?: string; poDate?: string; poExpiry?: string } & Record<string, unknown>
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

// get()/search() populate tenant/project; create()/update()/moveStage() echo back bare ObjectId strings.
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
  // search()-only: count of billed camps (InvoiceLineItems) on this invoice. Absent on get()/create().
  lineItemCount?: number
  createdAt: string
  updatedAt: string
}

export interface SearchInvoiceQuery {
  tenant?: string
  project?: string
  status?: InvoiceStatus
  dateFrom?: string
  dateTo?: string
  page?: string
  limit?: string
}

// GET /invoices/report — global-by-default for a platform actor, own-tenant for a customer.
// Optional tenant/project/date filters narrow it for detail views.
export interface InvoiceReportQuery {
  tenant?: string
  project?: string
  dateFrom?: string
  dateTo?: string
}

export interface InvoiceReportStatusCount {
  status: InvoiceStatus
  count: number
  total: number
}

export interface InvoiceReportResponse {
  totalInvoices: number
  totalInvoiced: number
  statusCounts: InvoiceReportStatusCount[]
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
