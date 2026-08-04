import { useMemo } from 'react'
import { useAuditEvents, useAuditFilter } from '@/features/inventory/hooks/useInventory'
import { auditEventTypes, filterAuditEvents, auditDisplayRows } from '@/features/inventory/inventory.service'
import type { AuditEvent } from '@/features/inventory/inventory.types'

// Exact port of window.QMS_InvIntel's Audit tab (tabAudit(), inventory-
// intel.js lines 449-470). A flat, unified chronological ledger merged from
// SEVEN separate stores (Movements/Transfers/Refills/Field reports/Goods
// receipts/Requisitions/Purchase orders). No KPI tiles, no modals/drawers,
// zero clickable rows — the <select> type-filter is the only interactive
// control. Hard 200-row display cap post-sort-post-filter with NO truncation
// indicator; the '{n} events' counter in the filter bar deliberately reflects
// the FULL filtered count (pre-slice), so it can legitimately exceed 200
// while only 200 rows render — preserved faithfully, not "fixed".

// '.inv-filter' — same sticky filter/toolbar bar shared by every intel tab
// (Forecast/Copilot/Audit), exact port of inventory.js's injected CSS: flex
// row, gap 8px, padding 10px 12px, sticky top:60px z-index:25.
function InvFilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-2 flex-wrap rounded-[10px] border mb-3 sticky z-25"
      style={{ padding: '10px 12px', background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', top: 60 }}
    >
      {children}
    </div>
  )
}

// '.im-tbl' th/td shells — exact port of inventory-intel.js's injected CSS
// (border-collapse, 12px font, dashed row borders, hover tint).
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="text-left font-bold uppercase tracking-[.04em]"
      style={{ padding: '8px 6px', fontSize: 10, color: 'var(--qms-text-muted)', borderBottom: '1px dashed var(--qms-border)' }}
    >
      {children}
    </th>
  )
}

function Td({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return (
    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
      {bold ? <b>{children}</b> : children}
    </td>
  )
}

// Type column pill — exact port of tabAudit()'s inline-styled span
// (inventory-intel.js:463): reuses the '.im-band' base shape (padding:2px
// 8px, radius:999px, font-size:10px, font-weight:700) but ALWAYS overrides to
// one flat neutral-brand tint regardless of event type — no per-type color
// differentiation in this tab (unlike Forecast's red/green Shortage pills).
function TypePill({ type }: { type: string }) {
  return (
    <span
      className="inline-flex items-center font-bold rounded-full"
      style={{ padding: '2px 8px', fontSize: 10, background: 'rgba(59,109,255,.1)', color: 'var(--qms-brand-700, #1d40c4)' }}
    >
      {type}
    </span>
  )
}

const AuditTab = () => {
  const { events, isLoading } = useAuditEvents()
  const { type, setType } = useAuditFilter()

  const types = useMemo(() => auditEventTypes(events), [events])
  const rows = useMemo(() => filterAuditEvents(events, type), [events, type])
  const body = useMemo(() => auditDisplayRows(rows), [rows])

  return (
    <div>
      <InvFilterBar>
        <span className="text-xs font-bold uppercase" style={{ letterSpacing: '.04em', color: 'var(--qms-text-muted)' }}>
          Audit trail
        </span>
        <select
          className="rounded-lg border text-xs px-2.5 py-1.5"
          style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-input)', color: 'var(--qms-text)' }}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'var(--qms-text-muted)' }}>
          {rows.length} events
        </span>
      </InvFilterBar>

      <div className="rounded-2xl border overflow-auto" style={{ padding: 0, background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <table className="w-full border-collapse text-xs" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Type</Th>
              <Th>Ref</Th>
              <Th>Actor</Th>
              <Th>Detail</Th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && body.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center" style={{ padding: 24, color: 'var(--qms-text-muted)' }}>
                  No audit events.
                </td>
              </tr>
            ) : (
              body.map((e: AuditEvent, i: number) => (
                // eslint-disable-next-line react/no-array-index-key -- source records have no single globally-unique id across all 7 merged stores; ref+type+date+index matches the prototype's own keyless <tr> render.
                <tr key={`${e.type}-${e.ref}-${e.date}-${i}`} className="hover:bg-[rgba(59,109,255,.03)]">
                  <Td>{e.date || '—'}</Td>
                  <Td><TypePill type={e.type} /></Td>
                  <Td bold>{e.ref}</Td>
                  <Td>{e.who}</Td>
                  <Td>{e.detail}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AuditTab
