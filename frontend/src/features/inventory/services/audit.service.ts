// Audit domain service — merges movements/transfers/refills/field reports/
// GRNs/PRs/POs into one flat, chronologically sorted audit ledger. Split out
// of the original inventory.service.ts (Phase 3 service breakup) — every
// function below is moved verbatim, no behavior change.

import type { Person } from '@/types/people.types'
import type { InventoryUnit, AuditEvent } from '@/features/inventory/inventory.types'
import { getMovements, getTransfers } from './movement.service'
import { getRefills, getFieldReports } from './fieldops.service'
import { getGrns, getPrs, getPos } from './procurement.service'

// ============================================================================
// Audit tab (window.QMS_InvIntel.tabAudit(), inventory-intel.js lines
// 449-470) — merges SEVEN separate stores into one flat, chronologically
// sorted ledger. Exact port of the `ev.push(...)` sequence: order here only
// matters for the filter <select>'s type de-dup ordering, not final row
// order (everything is re-sorted by date after this function returns).
// Sorting/filtering/the 200-row display cap are all applied by the caller
// (buildAuditRows below), matching tabAudit()'s own post-processing order.
// ============================================================================

export function buildAuditEvents(
  units: InventoryUnit[],
  people: Person[],
): AuditEvent[] {
  const ev: AuditEvent[] = []

  getMovements(units).forEach((m) => {
    ev.push({
      date: m.date,
      type: 'Movement',
      ref: m.id,
      who: m.by || 'System',
      detail: `${m.type || ''} · ${m.deviceType || ''} · ${m.from || ''} → ${m.to || ''}`,
    })
  })
  getTransfers().forEach((t) => {
    ev.push({
      date: t.date,
      type: 'Transfer',
      ref: t.id,
      who: 'Logistics',
      detail: `${t.itemName} ×${t.qty} · ${t.status}`,
    })
  })
  getRefills(units, people).forEach((r) => {
    ev.push({
      date: r.date,
      type: 'Refill',
      ref: r.id,
      who: 'Field',
      detail: `${r.itemName} ×${r.qty} · ${r.status}`,
    })
  })
  getFieldReports(units, people).forEach((r) => {
    ev.push({
      date: r.date,
      type: 'Field report',
      ref: r.id,
      who: 'Field',
      detail: `${r.type} · ${r.itemName} ×${r.qty}`,
    })
  })
  getGrns().forEach((g) => {
    ev.push({
      date: g.date,
      type: 'Goods receipt',
      ref: g.id,
      who: 'Stores',
      detail: `${g.itemName} · accepted ${g.acceptedQty}`,
    })
  })
  getPrs().forEach((p) => {
    ev.push({
      date: p.date,
      type: 'Requisition',
      ref: p.id,
      who: p.requester || 'Requester',
      detail: `${p.itemName} ×${p.qty} · ${p.status}`,
    })
  })
  getPos().forEach((p) => {
    ev.push({
      date: p.date,
      type: 'Purchase order',
      ref: p.id,
      who: p.createdBy || 'Logistics',
      detail: `${p.itemName} · ${p.status}${p.approvedBy ? ' · ' + p.approvedBy : ''}`,
    })
  })

  return ev
}

// types = ['ALL', ...new Set(ev.map(e => e.type))] — exact port. Preserves
// first-seen order (Movement/Transfer/Refill/Field report/Goods receipt/
// Requisition/Purchase order), so a type with zero rows in the current data
// simply never appears as a filter option.
export function auditEventTypes(events: AuditEvent[]): (AuditEvent['type'] | 'ALL')[] {
  return ['ALL', ...Array.from(new Set(events.map((e) => e.type)))]
}

// rows = ev.sort((a,b) => (b.date||'').localeCompare(a.date||'')) then
// optional exact-match type filter, exact port of tabAudit()'s own
// post-processing (inventory-intel.js:460-461). Deliberately a STRING sort
// (not Date-object parsing) — every source date in this codebase is an ISO
// 'YYYY-MM-DD' string, so this sorts correctly descending; replicate as-is
// rather than "fixing" it to Date-based sorting.
export function filterAuditEvents(events: AuditEvent[], type: string): AuditEvent[] {
  const sorted = [...events].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  if (type !== 'ALL') return sorted.filter((e) => e.type === type)
  return sorted
}

// body = rows.slice(0,200) — exact port. NOTE: the caller's displayed
// '{rows.length} events' counter must read the FULL filtered array's length
// (pre-slice), not this capped array's length — that discrepancy (count can
// exceed 200 while only 200 rows render) is intentional, preserved from the
// prototype, and must not be "corrected".
export function auditDisplayRows(filteredEvents: AuditEvent[]): AuditEvent[] {
  return filteredEvents.slice(0, 200)
}
