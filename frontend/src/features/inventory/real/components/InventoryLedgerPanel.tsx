import { useState } from 'react'
import { usePermission } from '@/hooks/usePermission'
import { useInventoryLedgers } from '@/features/inventory/real/hooks/useInventoryLedgers'
import { truncateIdentifier } from '@/features/inventory/real/utils/truncateIdentifier'
import { INVENTORY_REQUEST_TYPE_LABEL, INVENTORY_REQUEST_STATUS_LABEL } from '@/types/inventoryRequest.types'
import type { InventoryRequestType } from '@/types/inventoryRequest.types'
import { INVENTORY_LEDGER_LOCATION_LABEL } from '@/types/inventoryLedger.types'
import type { InventoryLedgerLocation } from '@/types/inventoryLedger.types'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import InventoryLedgerItemPicker from '@/features/inventory/real/components/InventoryLedgerItemPicker'
import type { InventoryLedgerItemPickerValue } from '@/features/inventory/real/components/InventoryLedgerItemPicker'
import { usePagination } from '@/hooks/usePagination'

const PAGE_SIZE = 10

const LOCATIONS: InventoryLedgerLocation[] = ['warehouse', 'in-transit', 'field-officer']

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

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
          <div className="flex flex-wrap items-center gap-2 mb-3">
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
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                      {['Date & time', 'Type', 'Status (now)', 'Movement', 'Item', 'Qty', 'Field officer', 'Performed by'].map((h) => (
                        <th
                          key={h}
                          className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5"
                          style={{ color: 'var(--qms-text-muted)' }}
                          title={h === 'Status (now)' ? "The request's current status. It may differ from its status when this movement was recorded." : undefined}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => {
                      const itemIdentifier = row.inventory?.serialNumber ?? row.inventory?.batch ?? row.inventory?.id
                      const performedBy = row.actor?.name || row.actor?.email
                      return (
                        <tr key={row.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                          <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{formatDateTime(row.createdAt)}</td>
                          <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>{INVENTORY_REQUEST_TYPE_LABEL[row.requestType]}</td>
                          <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                            {row.request?.status ? INVENTORY_REQUEST_STATUS_LABEL[row.request.status] : '—'}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>
                            {INVENTORY_LEDGER_LOCATION_LABEL[row.from]} → {INVENTORY_LEDGER_LOCATION_LABEL[row.to]}
                          </td>
                          <td className="px-4 py-2.5 max-w-xs truncate font-mono" style={{ color: 'var(--qms-text)' }} title={itemIdentifier}>
                            {itemIdentifier ? truncateIdentifier(itemIdentifier) : '—'}
                          </td>
                          <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>{row.quantity}</td>
                          <td className="px-4 py-2.5 max-w-xs truncate" style={{ color: 'var(--qms-text-muted)' }} title={row.assignee?.name}>
                            {row.assignee?.name ?? row.assignee?.id ?? '—'}
                          </td>
                          <td className="px-4 py-2.5 max-w-xs truncate" style={{ color: 'var(--qms-text-muted)' }} title={performedBy}>
                            {performedBy || '—'}
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
