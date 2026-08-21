import { useState } from 'react'
import { FiPlus, FiClock } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useInventoryConsumables } from '@/features/inventory/real/hooks/useInventoryConsumables'
import type { InventoryConsumableEntity, InventoryConsumableStatus } from '@/types/inventoryConsumable.types'
import type { InventoryMovementHistorySource } from '@/types/inventoryLedger.types'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import CopyButton from '@/components/ui/CopyButton'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import EditInventoryConsumableModal from '@/features/inventory/real/components/EditInventoryConsumableModal'
import InventoryConsumableSearchBar from '@/features/inventory/real/components/InventoryConsumableSearchBar'
import type { InventoryConsumableSearchBarValue } from '@/features/inventory/real/components/InventoryConsumableSearchBar'
import InventoryMovementHistoryDrawer from '@/features/inventory/real/components/InventoryMovementHistoryDrawer'
import { usePagination } from '@/hooks/usePagination'
import { truncateIdentifier } from '@/features/inventory/real/utils/truncateIdentifier'

const PAGE_SIZE = 10

// status is only visible for a manage-level caller — search silently
// defaults to active-only otherwise. Rows must render in API order: FEFO (expiryDate ascending) is server-enforced, never re-sort client-side.
const InventoryConsumablesPanel = () => {
  const { hasAnyPermission } = usePermission()
  const canManage = hasAnyPermission(['inventory-consumable:manage'])
  // Independent of inventory-consumable:manage — the History trigger must show for anyone
  // holding inventory-ledger:manage, whether or not they can edit this lot.
  const canViewLedger = hasAnyPermission(['inventory-ledger:manage'])

  const [searchBar, setSearchBar] = useState<InventoryConsumableSearchBarValue>({ batch: '', item: null })
  const [status, setStatus] = useState<InventoryConsumableStatus | 'ALL'>('ALL')
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const [editModal, setEditModal] = useState<{ open: boolean; lot: InventoryConsumableEntity | null }>({ open: false, lot: null })
  const [historySource, setHistorySource] = useState<InventoryMovementHistorySource | null>(null)

  const { data, isLoading, error, refetch } = useInventoryConsumables({
    batch: searchBar.batch || undefined,
    status: canManage && status !== 'ALL' ? status : undefined,
    item: searchBar.item?.id || undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const items = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
          {!isLoading && !error ? `${totalCount} total` : 'Physical stock lots, earliest expiry first.'}
        </p>
        {canManage && (
          <Button
            onClick={() => setEditModal({ open: true, lot: null })}
            className="text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> New consumable lot
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <InventoryConsumableSearchBar
          value={searchBar}
          onChange={(v) => { setSearchBar(v); resetToFirstPage() }}
        />
        {canManage && (
          <div className="sm:ml-auto">
            <Select value={status} onValueChange={(v) => { setStatus(v as InventoryConsumableStatus | 'ALL'); resetToFirstPage() }}>
              <SelectTrigger className="w-36 text-[13px]">
                <SelectValue>{() => (status === 'ALL' ? 'All statuses' : status === 'active' ? 'Active' : 'Expired')}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading lots…" errorLabel="Failed to load lots. Please try again." onRetry={refetch}>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  {['Batch', 'Item', 'Qty', 'Mfg date', 'Expiry date', ...(canManage ? ['Status'] : []), ...(canViewLedger ? [' '] : [])].map((h) => (
                    <th
                      key={h}
                      className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5"
                      style={{ color: 'var(--qms-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((lot) => (
                  <tr
                    key={lot.id}
                    onClick={() => canManage && setEditModal({ open: true, lot })}
                    className={canManage ? 'cursor-pointer transition-colors hover:bg-(--qms-surface-hover)' : ''}
                    style={{ borderBottom: '1px solid var(--qms-border)' }}
                  >
                    <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono" title={lot.batch}>{truncateIdentifier(lot.batch)}</span>
                        <CopyButton value={lot.batch} label="Batch number" />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 max-w-xs truncate" style={{ color: 'var(--qms-text)' }} title={lot.item.name}>
                      {lot.item.name ?? lot.item.id}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>{lot.quantity}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{lot.manufacturingDate?.slice(0, 10) ?? '—'}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{lot.expiryDate?.slice(0, 10) ?? '—'}</td>
                    {canManage && (
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lot.status === 'active' ? 'bg-success-soft text-success' : ''}`}
                          style={lot.status !== 'active' ? { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' } : undefined}
                        >
                          {lot.status === 'active' ? 'ACTIVE' : 'EXPIRED'}
                        </span>
                      </td>
                    )}
                    {canViewLedger && (
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          title="View movement history" aria-label="View movement history"
                          onClick={(e) => {
                            e.stopPropagation()
                            setHistorySource({
                              mode: 'inventory',
                              inventoryType: 'InventoryConsumable',
                              inventoryId: lot.id,
                              summary: { batch: lot.batch, itemName: lot.item.name ?? lot.item.id, quantity: lot.quantity, status: lot.status, expiryDate: lot.expiryDate },
                            })
                          }}
                          className="rounded p-1 transition-colors hover:bg-(--qms-surface-hover)"
                          style={{ color: 'var(--qms-text-muted)' }}
                        >
                          <FiClock size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {items.length === 0 && (
            <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              No lots found.
            </div>
          )}
        </div>
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>

      {editModal.open && (
        <EditInventoryConsumableModal
          lot={editModal.lot}
          onClose={() => setEditModal({ open: false, lot: null })}
          canManageStatus={canManage}
        />
      )}

      {historySource && (
        <InventoryMovementHistoryDrawer
          open
          source={historySource}
          canManage={canViewLedger}
          onClose={() => setHistorySource(null)}
        />
      )}
    </div>
  )
}

export default InventoryConsumablesPanel
