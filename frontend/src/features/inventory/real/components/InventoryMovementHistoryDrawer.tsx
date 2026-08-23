import { useEffect } from 'react'
import SideDrawer from '@/components/ui/SideDrawer'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import PaginationControls from '@/components/ui/PaginationControls'
import { usePagination } from '@/hooks/usePagination'
import { useInventoryLedgers } from '@/features/inventory/real/hooks/useInventoryLedgers'
import { truncateIdentifier } from '@/features/inventory/real/utils/truncateIdentifier'
import { INVENTORY_REQUEST_TYPE_LABEL, INVENTORY_REQUEST_STATUS_LABEL } from '@/features/inventory/real/inventoryRequest.types'
import { INVENTORY_DEVICE_STATUS_LABEL } from '@/features/inventory/real/inventoryDevice.types'
import { movementEventLabel, INVENTORY_LEDGER_LOCATION_LABEL } from '@/features/inventory/real/inventoryLedger.types'
import type { InventoryMovementHistorySource } from '@/features/inventory/real/inventoryLedger.types'

const PAGE_SIZE = 20

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })

const sourceIdentity = (source: InventoryMovementHistorySource) =>
  source.mode === 'request' ? source.requestId : source.inventoryId

interface InventoryMovementHistoryDrawerProps {
  open: boolean
  onClose: () => void
  source: InventoryMovementHistorySource
  /** true only when the viewer holds inventory-ledger:manage — the drawer stays defensive if opened without it regardless. */
  canManage: boolean
}

// Same ledger the Ledger tab shows, scoped to one request/item, reframed as readable events.
const InventoryMovementHistoryDrawer = ({ open, onClose, source, canManage }: InventoryMovementHistoryDrawerProps) => {
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)

  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on identity only, not the whole source object
  useEffect(() => { resetToFirstPage() }, [sourceIdentity(source)])

  const query =
    source.mode === 'request'
      ? { request: source.requestId, page: String(page), limit: String(PAGE_SIZE) }
      : { inventory: source.inventoryId, page: String(page), limit: String(PAGE_SIZE) }

  const { data, isLoading, error, refetch } = useInventoryLedgers(query, open && canManage)
  const items = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  const title = source.mode === 'request'
    ? INVENTORY_REQUEST_TYPE_LABEL[source.requestType] + ' request'
    : source.inventoryType === 'InventoryDevice'
      ? `${source.summary.serialNumber} · ${source.summary.itemName}`
      : `${source.summary.batch} · ${source.summary.itemName}`

  const emptyMessage = source.mode === 'request'
    ? 'No stock movements have been recorded for this request.'
    : 'No stock movements have been recorded for this item.'

  return (
    <SideDrawer open={open} title={title} onClose={onClose} widthClassName="max-w-lg">
      <div className="mb-4 pb-4" style={{ borderBottom: '1px solid var(--qms-border)' }}>
        {source.mode === 'request' ? (
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
            {INVENTORY_REQUEST_STATUS_LABEL[source.requestStatus].toUpperCase()}
          </span>
        ) : source.inventoryType === 'InventoryDevice' ? (
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
            {INVENTORY_DEVICE_STATUS_LABEL[source.summary.status].toUpperCase()}
          </span>
        ) : (
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            Warehouse quantity: {source.summary.quantity} · {source.summary.status === 'active' ? 'Active' : source.summary.status === 'expired' ? 'Expired' : 'Status unavailable'} · Expires {formatDate(source.summary.expiryDate)}
          </p>
        )}
      </div>

      {!canManage ? (
        <div className="px-4 py-10 text-center text-[13px] rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
          You don't have permission to view the movement ledger.
        </div>
      ) : (
        <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading history…" errorLabel="Failed to load movement history. Please try again." onRetry={refetch}>
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              {emptyMessage}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((row) => {
                const itemIdentifier = row.inventory?.serialNumber ?? row.inventory?.batch ?? row.inventory?.id
                const performedBy = row.actor?.name || row.actor?.email
                return (
                  <div key={row.id} className="rounded-lg border p-3" style={{ borderColor: 'var(--qms-border)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>
                        {movementEventLabel(row.requestType, row.from, row.to)}
                      </p>
                      <p className="text-[11px] whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{formatDateTime(row.createdAt)}</p>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
                      {INVENTORY_LEDGER_LOCATION_LABEL[row.from]} → {INVENTORY_LEDGER_LOCATION_LABEL[row.to]}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[12px]" style={{ color: 'var(--qms-text)' }}>
                      {source.mode === 'request' && (
                        <span className="font-mono" title={itemIdentifier}>{itemIdentifier ? truncateIdentifier(itemIdentifier) : '—'}</span>
                      )}
                      <span>Qty: {row.quantity}</span>
                      <span title={row.assignee?.name}>FO: {row.assignee?.name ?? row.assignee?.id ?? '—'}</span>
                      <span title={performedBy}>By: {performedBy || '—'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
        </QueryStateBlock>
      )}
    </SideDrawer>
  )
}

export default InventoryMovementHistoryDrawer
