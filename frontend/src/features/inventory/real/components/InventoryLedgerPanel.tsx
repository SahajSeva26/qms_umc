import { useState } from 'react'
import { FiSend, FiCornerDownLeft } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useInventoryLedgers } from '@/features/inventory/real/hooks/useInventoryLedgers'
import { INVENTORY_REQUEST_TYPE_LABEL, INVENTORY_REQUEST_STATUS_LABEL } from '@/types/inventoryRequest.types'
import type { InventoryRequestType } from '@/types/inventoryRequest.types'
import { INVENTORY_LEDGER_LOCATION_LABEL, movementEventLabel } from '@/types/inventoryLedger.types'
import type { InventoryLedgerLocation } from '@/types/inventoryLedger.types'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import InventoryLedgerItemPicker from '@/features/inventory/real/components/InventoryLedgerItemPicker'
import type { InventoryLedgerItemPickerValue } from '@/features/inventory/real/components/InventoryLedgerItemPicker'
import { usePagination } from '@/hooks/usePagination'

const PAGE_SIZE = 10

const LOCATIONS: InventoryLedgerLocation[] = ['warehouse', 'in-transit', 'field-officer']

const formatDate = (iso: string) => new Date(iso).toISOString().slice(0, 10)

// Matches the prototype's per-movement-type pill colours (inventory.js typeMeta) —
// return=green, to-FO=blue, everything else=violet; Calibration/Procurement/Retire have no equivalent here.
function movementPill(row: { requestType?: InventoryRequestType; from: InventoryLedgerLocation; to: InventoryLedgerLocation; source: 'request' | 'direct' }) {
  if (row.requestType === 'return') return { color: '#10b981', icon: FiCornerDownLeft }
  if (row.to === 'field-officer') return { color: '#3b6dff', icon: FiSend }
  return { color: '#8b5cf6', icon: FiSend }
}

// Unlike the other inventory panels, GET /inventory-ledgers requires inventory-ledger:manage — reads aren't open to everyone.
const InventoryLedgerPanel = () => {
  const { hasAnyPermission } = usePermission()
  const canManage = hasAnyPermission(['inventory-ledger:manage'])

  const [typeFilter, setTypeFilter] = useState<InventoryRequestType | 'ALL'>('ALL')
  const [itemTypeFilter, setItemTypeFilter] = useState<'ALL' | 'InventoryDevice' | 'InventoryConsumable'>('ALL')
  const [fromFilter, setFromFilter] = useState<InventoryLedgerLocation | 'ALL'>('ALL')
  const [toFilter, setToFilter] = useState<InventoryLedgerLocation | 'ALL'>('ALL')
  // Narrower than and independent of itemTypeFilter — this narrows to ONE device/lot, not "every device."
  const [pickedItem, setPickedItem] = useState<InventoryLedgerItemPickerValue | null>(null)
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)

  const { data, isLoading, error, refetch } = useInventoryLedgers(
    {
      requestType: typeFilter === 'ALL' ? undefined : typeFilter,
      inventoryType: pickedItem?.inventoryType ?? (itemTypeFilter === 'ALL' ? undefined : itemTypeFilter),
      from: fromFilter === 'ALL' ? undefined : fromFilter,
      to: toFilter === 'ALL' ? undefined : toFilter,
      inventory: pickedItem?.id,
      page: String(page),
      limit: String(PAGE_SIZE),
    },
    canManage,
  )
  const items = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
          {canManage && !isLoading && !error ? `${totalCount} total` : 'Append-only record of every stock movement.'}
        </p>
      </div>

      {!canManage ? (
        <div className="px-4 py-10 text-center text-[13px] rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
          You don't have permission to view the movement ledger.
        </div>
      ) : (
        <>
          <div className="inv-filter mb-3">
            <InventoryLedgerItemPicker
              value={pickedItem}
              onChange={(v) => { setPickedItem(v); resetToFirstPage() }}
            />
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as InventoryRequestType | 'ALL'); resetToFirstPage() }}>
                <SelectTrigger className="w-36 text-[13px]">
                  <SelectValue>{() => (typeFilter === 'ALL' ? 'All types' : INVENTORY_REQUEST_TYPE_LABEL[typeFilter])}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  <SelectItem value="refill">Refill</SelectItem>
                  <SelectItem value="return">Return</SelectItem>
                </SelectContent>
              </Select>
              <Select value={itemTypeFilter} onValueChange={(v) => { setItemTypeFilter(v as typeof itemTypeFilter); resetToFirstPage() }}>
                <SelectTrigger className="w-40 text-[13px]">
                  <SelectValue>{() => (itemTypeFilter === 'ALL' ? 'All items' : itemTypeFilter === 'InventoryDevice' ? 'Device' : 'Consumable')}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All items</SelectItem>
                  <SelectItem value="InventoryDevice">Device</SelectItem>
                  <SelectItem value="InventoryConsumable">Consumable</SelectItem>
                </SelectContent>
              </Select>
              <Select value={fromFilter} onValueChange={(v) => { setFromFilter(v as InventoryLedgerLocation | 'ALL'); resetToFirstPage() }}>
                <SelectTrigger className="w-36 text-[13px]">
                  <SelectValue>{() => (fromFilter === 'ALL' ? 'From: any' : `From: ${INVENTORY_LEDGER_LOCATION_LABEL[fromFilter]}`)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">From: any</SelectItem>
                  {LOCATIONS.map((l) => (
                    <SelectItem key={l} value={l}>{INVENTORY_LEDGER_LOCATION_LABEL[l]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={toFilter} onValueChange={(v) => { setToFilter(v as InventoryLedgerLocation | 'ALL'); resetToFirstPage() }}>
                <SelectTrigger className="w-36 text-[13px]">
                  <SelectValue>{() => (toFilter === 'ALL' ? 'To: any' : `To: ${INVENTORY_LEDGER_LOCATION_LABEL[toFilter]}`)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">To: any</SelectItem>
                  {LOCATIONS.map((l) => (
                    <SelectItem key={l} value={l}>{INVENTORY_LEDGER_LOCATION_LABEL[l]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading movements…" errorLabel="Failed to load the ledger. Please try again." onRetry={refetch}>
            <div className="inv-card">
              <div className="overflow-x-auto">
                <table className="inv-tbl">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Unit</th>
                      <th>From</th>
                      <th>To</th>
                      <th>By</th>
                      <th title="The request's current status — may differ from its status when this movement was recorded">Status (now)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => {
                      const unit = row.inventory?.serialNumber ?? row.inventory?.batch
                      const performedBy = row.actor?.name || row.actor?.email
                      const pill = movementPill(row)
                      const Icon = pill.icon
                      const eventLabel = row.requestType
                        ? movementEventLabel(row.requestType, row.from, row.to)
                        : row.source === 'direct' ? 'Direct assignment' : '—'
                      return (
                        <tr key={row.id}>
                          <td className="whitespace-nowrap">{formatDate(row.createdAt)}</td>
                          <td>
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: `${pill.color}22`, color: pill.color }}
                            >
                              <Icon size={11} /> {eventLabel}
                            </span>
                          </td>
                          <td>
                            <b>{unit ?? '—'}</b>
                            {row.assignee && (
                              <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{row.assignee.name ?? row.assignee.id}</div>
                            )}
                          </td>
                          <td>{INVENTORY_LEDGER_LOCATION_LABEL[row.from]}</td>
                          <td>{INVENTORY_LEDGER_LOCATION_LABEL[row.to]}</td>
                          <td>{performedBy || '—'}</td>
                          <td className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>
                            {row.request?.status ? INVENTORY_REQUEST_STATUS_LABEL[row.request.status] : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {items.length === 0 && (
                <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
                  No movements found.
                </div>
              )}
            </div>
            <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
          </QueryStateBlock>
        </>
      )}
    </div>
  )
}

export default InventoryLedgerPanel
