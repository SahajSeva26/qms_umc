// Real backend-integrated types for the InvoiceLineItem module — mirrors
// backend/src/modules/finance/invoiceLineItem/{invoiceLineItem.model,invoiceLineItem.validators,invoiceLineItem.mapper}.ts

// invoiceLineItem.service.ts populates BOTH `invoice` (select: 'code status
// tenant') and `camp` (select: 'code date status') on get()/search() — a
// bare ObjectId string on create's echo only, same populate-duality pattern
// as everywhere else in this app. Both are shallow shapes, not full entities.
export interface InvoiceLineItemPopulatedInvoice {
  _id?: string
  code: string
  status: string
  tenant: string
}

export interface InvoiceLineItemPopulatedCamp {
  _id?: string
  code: string
  date: string
  status: string
}

export interface InvoiceLineItemEntity {
  id: string
  invoice: InvoiceLineItemPopulatedInvoice | string
  camp: InvoiceLineItemPopulatedCamp | string
  // Snapshot of the project's campCost at the moment this line was created —
  // always display this persisted value, never re-derive against the
  // project's CURRENT campCost (which may have changed since).
  amount: number
  createdAt: string
  updatedAt: string
}

// `invoice` is required — line items have no tenant of their own, they are
// scoped transitively through the parent invoice.
export interface SearchInvoiceLineItemQuery {
  invoice: string
  camp?: string
  page?: string
  limit?: string
}

// amount is NOT accepted — it is the invoice project's campCost, snapshotted server-side.
export interface CreateInvoiceLineItemPayload {
  invoice: string
  camp: string
}
