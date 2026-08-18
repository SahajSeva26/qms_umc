import { useMemo } from 'react'
import { useAuditEvents, useAuditFilter } from '@/features/inventory/hooks/useInventory'
import { auditEventTypes, filterAuditEvents, auditDisplayRows } from '@/features/inventory/inventory.service'
import type { AuditEvent } from '@/features/inventory/inventory.types'
import { InvFilterBar, Th, Td, TableEmptyRow } from '@/features/inventory/components/IntelTableUi'

// A flat chronological ledger merged from multiple stores; 200-row display cap with no truncation indicator.
// The '{n} events' counter deliberately reflects the full filtered count (pre-slice), which can exceed 200.

// Always one flat neutral-brand tint regardless of event type (unlike Forecast's red/green Shortage pills).
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
              <TableEmptyRow colSpan={5}>No audit events.</TableEmptyRow>
            ) : (
              // type+ref+date is real per-record identity; ref is unique within its own source store.
              body.map((e: AuditEvent) => (
                <tr key={`${e.type}-${e.ref}-${e.date}`} className="hover:bg-[rgba(59,109,255,.03)]">
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
