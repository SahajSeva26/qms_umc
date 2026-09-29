import { useMemo, useState } from 'react'
import { FiPlus, FiLayers, FiPackage, FiAlertCircle, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useInventoryConsumables } from '@/features/inventory/real/hooks/useInventoryConsumables'
import { useInventoryConsumableReport } from '@/features/inventory/real/hooks/useInventoryConsumableReport'
import { INVENTORY_CONSUMABLE_STATUS_LABEL } from '@/types/inventoryConsumable.types'
import type { InventoryConsumableEntity, InventoryConsumableStatus } from '@/types/inventoryConsumable.types'
import type { InventoryMovementHistorySource } from '@/types/inventoryLedger.types'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import CopyButton from '@/components/ui/CopyButton'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import EditInventoryConsumableModal from '@/features/inventory/real/components/EditInventoryConsumableModal'
import InventoryConsumableDetailDrawer from '@/features/inventory/real/components/InventoryConsumableDetailDrawer'
import InventoryConsumableSearchBar from '@/features/inventory/real/components/InventoryConsumableSearchBar'
import type { InventoryConsumableSearchBarValue } from '@/features/inventory/real/components/InventoryConsumableSearchBar'
import InventoryMovementHistoryDrawer from '@/features/inventory/real/components/InventoryMovementHistoryDrawer'
import InventoryReportKpiStrip, { type InventoryReportTile } from '@/features/inventory/real/components/InventoryReportKpiStrip'
import ExpiryBandPill from '@/features/inventory/real/components/ExpiryBandPill'
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
  // Row click opens the read-only detail drawer — Edit and Movement history
  // both live inside it, matching the prototype's drawer-first pattern.
  const [detailLot, setDetailLot] = useState<InventoryConsumableEntity | null>(null)

  const { data, isLoading, error, refetch } = useInventoryConsumables({
    batch: searchBar.batch || undefined,
    status: canManage && status !== 'ALL' ? status : undefined,
    item: searchBar.item?.id || undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const items = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  const { report, isLoading: reportLoading, error: reportError } = useInventoryConsumableReport(canManage)
  const reportTiles = useMemo<InventoryReportTile[]>(() => {
    if (!report) return []
    const byStatus = new Map(report.consumables.byStatus.map((s) => [s.status, s.count]))
    return [
      { key: 'lots', label: 'Consumable Lots', value: report.summary.consumableLots, tone: 'brand', icon: FiLayers },
      // "Active stock units", not "Warehouse Qty" — there's no
      // warehouse/location filter; it's the same value as summary.warehouseConsumableQuantity.
      { key: 'stock-units', label: 'Active stock units', value: report.consumables.warehouseQuantity, tone: 'teal', icon: FiPackage },
      // Distinct from the 'expired' status tile below: this is a date-based
      // count (past expiryDate), not the lot's own status field.
      { key: 'expired-by-date', label: 'Expired (by date)', value: report.consumables.expiredByDate, tone: 'amber', icon: FiAlertCircle },
      { key: 'status-active', label: INVENTORY_CONSUMABLE_STATUS_LABEL.active, value: byStatus.get('active') ?? 0, tone: 'emerald', icon: FiCheckCircle },
      { key: 'status-expired', label: INVENTORY_CONSUMABLE_STATUS_LABEL.expired, value: byStatus.get('expired') ?? 0, tone: 'rose', icon: FiXCircle },
    ]
  }, [report])

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

      <InventoryReportKpiStrip
        tiles={reportTiles}
        isLoading={reportLoading}
        error={reportError}
        canView={canManage}
        skeletonCount={5}
      />

      <div
        className="flex flex-wrap items-center gap-2 mb-3 rounded-xl border p-2.5"
        style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}
      >
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
                  {['Batch', 'Item', 'Qty', 'Mfg date', 'Expiry date', 'FEFO', ...(canManage ? ['Status'] : [])].map((h) => (
                    <th
                      key={h}
                      className={`font-bold text-[11px] uppercase tracking-wider px-4 py-2 ${h === 'Qty' ? 'text-right' : 'text-left'}`}
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
                    onClick={() => setDetailLot(lot)}
                    className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                    style={{ borderBottom: '1px solid var(--qms-border)' }}
                  >
                    <td className="px-4 py-2" style={{ color: 'var(--qms-text)' }}>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono" title={lot.batch}>{truncateIdentifier(lot.batch)}</span>
                        <CopyButton value={lot.batch} label="Batch number" />
                      </div>
                    </td>
                    <td className="px-4 py-2 max-w-xs truncate" style={{ color: 'var(--qms-text)' }} title={lot.item.name}>
                      {lot.item.name ?? lot.item.id}
                    </td>
                    <td className="px-4 py-2 text-right font-mono" style={{ color: 'var(--qms-text)' }}>{lot.quantity}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--qms-text-muted)' }}>{lot.manufacturingDate?.slice(0, 10) ?? '—'}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--qms-text-muted)' }}>{lot.expiryDate?.slice(0, 10) ?? '—'}</td>
                    <td className="px-4 py-2"><ExpiryBandPill expiryDate={lot.expiryDate} /></td>
                    {canManage && (
                      <td className="px-4 py-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lot.status === 'active' ? 'bg-success-soft text-success' : ''}`}
                          style={lot.status !== 'active' ? { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' } : undefined}
                        >
                          {lot.status === 'active' ? 'ACTIVE' : 'EXPIRED'}
                        </span>
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

      {detailLot && (
        <InventoryConsumableDetailDrawer
          lot={detailLot}
          canManage={canManage}
          canViewLedger={canViewLedger}
          onClose={() => setDetailLot(null)}
          onEdit={() => {
            setEditModal({ open: true, lot: detailLot })
            setDetailLot(null)
          }}
          onViewHistory={() => {
            setHistorySource({
              mode: 'inventory',
              inventoryType: 'InventoryConsumable',
              inventoryId: detailLot.id,
              summary: { batch: detailLot.batch, itemName: detailLot.item.name ?? detailLot.item.id, quantity: detailLot.quantity, status: detailLot.status, expiryDate: detailLot.expiryDate },
            })
            setDetailLot(null)
          }}
        />
      )}
    </div>
  )
}

export default InventoryConsumablesPanel
