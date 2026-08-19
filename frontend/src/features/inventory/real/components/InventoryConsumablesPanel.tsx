import { useState } from 'react'
import { FiPlus, FiSearch } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useInventoryConsumables } from '@/features/inventory/real/hooks/useInventoryConsumables'
import type { InventoryConsumableEntity, InventoryConsumableStatus } from '@/types/inventoryConsumable.types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import EditInventoryConsumableModal from '@/features/inventory/real/components/EditInventoryConsumableModal'
import InventoryMasterItemPicker from '@/features/inventory/real/components/InventoryMasterItemPicker'
import { usePagination } from '@/hooks/usePagination'
import { truncateIdentifier } from '@/features/inventory/real/utils/truncateIdentifier'

const PAGE_SIZE = 10

// status is only visible for a manage-level caller — search silently
// defaults to active-only otherwise. Rows must render in API order: FEFO (expiryDate ascending) is server-enforced, never re-sort client-side.
const InventoryConsumablesPanel = () => {
  const { hasAnyPermission } = usePermission()
  const canManage = hasAnyPermission(['inventory-consumable:manage'])

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [status, setStatus] = useState<InventoryConsumableStatus | 'ALL'>('ALL')
  const [itemId, setItemId] = useState('')
  const [itemLabel, setItemLabel] = useState('')
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const [editModal, setEditModal] = useState<{ open: boolean; lot: InventoryConsumableEntity | null }>({ open: false, lot: null })

  const { data, isLoading, error, refetch } = useInventoryConsumables({
    batch: debouncedSearch || undefined,
    status: canManage && status !== 'ALL' ? status : undefined,
    item: itemId || undefined,
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
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--qms-text-muted)' }} />
          <Input
            placeholder="Search by batch..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetToFirstPage() }}
            className="pl-8 text-[13px]"
          />
        </div>
        {canManage && (
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
        )}
        <div className="w-56">
          <InventoryMasterItemPicker
            type="consumable"
            value={itemId}
            label={itemLabel}
            onChange={(id, label) => { setItemId(id); setItemLabel(label); resetToFirstPage() }}
          />
        </div>
      </div>

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading lots…" errorLabel="Failed to load lots. Please try again." onRetry={refetch}>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  {['Batch', 'Item', 'Qty', 'Mfg date', 'Expiry date', ...(canManage ? ['Status'] : [])].map((h) => (
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
                    <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--qms-text)' }} title={lot.batch}>{truncateIdentifier(lot.batch)}</td>
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
    </div>
  )
}

export default InventoryConsumablesPanel
