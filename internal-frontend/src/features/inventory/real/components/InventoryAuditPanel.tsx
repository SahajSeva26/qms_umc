import { useState } from 'react'
import { FiCornerDownLeft, FiRepeat, FiSend } from 'react-icons/fi'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { usePagination } from '@/hooks/usePagination'
import { useInventoryLedgers } from '@/features/inventory/real/hooks/useInventoryLedgers'
import { INVENTORY_LEDGER_LOCATION_LABEL, movementEventLabel } from '@/types/inventoryLedger.types'
import type { InventoryLedgerEntity } from '@/types/inventoryLedger.types'
import type { InventoryRequestType } from '@/types/inventoryRequest.types'

const PAGE_SIZE = 10

type AuditFilter = 'ALL' | 'direct' | InventoryRequestType

const TYPE_META: Record<Exclude<AuditFilter, 'ALL'>, { label: string; color: string }> = {
  direct: { label: 'Direct', color: '#8b5cf6' },
  refill: { label: 'Refill', color: '#3b6dff' },
  return: { label: 'Return', color: '#10b981' },
}

const formatDateTime = (iso: string) => new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(iso))

const auditType = (row: InventoryLedgerEntity): Exclude<AuditFilter, 'ALL'> =>
  row.source === 'direct' ? 'direct' : row.requestType ?? 'refill'

const unitLabel = (row: InventoryLedgerEntity) =>
  row.inventoryType === 'InventoryDevice'
    ? `${row.quantity} device${row.quantity === 1 ? '' : 's'}`
    : `${row.quantity} consumable unit${row.quantity === 1 ? '' : 's'}`

const InventoryAuditPanel = () => {
  const [filter, setFilter] = useState<AuditFilter>('ALL')
  const { page, setPage, resetToFirstPage, totalPages } = usePagination(PAGE_SIZE)
  const { data, isLoading, error, refetch } = useInventoryLedgers({
    source: filter === 'direct' ? 'direct' : filter === 'refill' || filter === 'return' ? 'request' : undefined,
    requestType: filter === 'refill' || filter === 'return' ? filter : undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  })

  const rows = data?.data?.items ?? []
  const count = data?.data?.count ?? 0

  return (
    <div>
      <div className="inv-filter mb-3">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>
          <FiRepeat size={14} /> Audit trail
        </div>
        <Select value={filter} onValueChange={(value) => { setFilter(value as AuditFilter); resetToFirstPage() }}>
          <SelectTrigger className="w-40 text-[13px] sm:ml-auto" aria-label="Audit event type">
            <SelectValue>{() => filter === 'ALL' ? 'All events' : TYPE_META[filter].label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All events</SelectItem>
            <SelectItem value="direct">Direct assignments</SelectItem>
            <SelectItem value="refill">Refills</SelectItem>
            <SelectItem value="return">Returns</SelectItem>
          </SelectContent>
        </Select>
        {!isLoading && !error && <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{count} events</span>}
      </div>

      <QueryStateBlock
        isLoading={isLoading}
        error={error}
        loadingLabel="Loading inventory audit trail…"
        errorLabel="Failed to load the inventory audit trail. Please try again."
        onRetry={refetch}
      >
        <div className="inv-card">
          <div className="overflow-x-auto">
            <table className="inv-tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Actor</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const type = auditType(row)
                  const meta = TYPE_META[type]
                  const Icon = type === 'return' ? FiCornerDownLeft : FiSend
                  // The ledger's request/inventory ids are internal Mongo references. The API
                  // does not expose a public request number, so only show identifiers that are
                  // meaningful to an operator: a device serial or consumable batch.
                  const reference = row.inventory?.serialNumber ?? row.inventory?.batch ?? '—'
                  const actor = row.actor?.name || row.actor?.email || 'System'
                  const event = row.requestType
                    ? movementEventLabel(row.requestType, row.from, row.to)
                    : 'Direct assignment'
                  return (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                      <td>
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: `${meta.color}20`, color: meta.color }}>
                          <Icon size={10} /> {meta.label}
                        </span>
                      </td>
                      <td className="font-mono font-semibold max-w-48 truncate" title={reference === '—' ? undefined : reference}>{reference}</td>
                      <td>
                        <span>{actor}</span>
                        {row.actor?.name && row.actor.email && <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>{row.actor.email}</div>}
                      </td>
                      <td>
                        <span className="font-medium">{event}</span>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
                          {unitLabel(row)} · {INVENTORY_LEDGER_LOCATION_LABEL[row.from]} → {INVENTORY_LEDGER_LOCATION_LABEL[row.to]}
                          {row.assignee?.name ? ` · ${row.assignee.name}` : ''}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && (
            <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              No audit events found.
            </div>
          )}
        </div>
        <PaginationControls page={page} totalPages={totalPages(count)} onPageChange={setPage} />
      </QueryStateBlock>
    </div>
  )
}

export default InventoryAuditPanel
