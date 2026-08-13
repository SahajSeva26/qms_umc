import { useState } from 'react'
import { FiPlus, FiSearch } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useInventoryMasters } from '@/features/inventory/hooks/useInventoryMasters'
import { useUpdateInventoryMaster } from '@/features/inventory/hooks/useUpdateInventoryMaster'
import { INVENTORY_MASTER_TYPE_LABEL, INVENTORY_MASTER_TYPES } from '@/types/inventoryMaster.types'
import type { InventoryMasterEntity, InventoryMasterStatus, InventoryMasterType } from '@/types/inventoryMaster.types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import PaginationControls from '@/components/ui/PaginationControls'
import EditInventoryMasterModal from '@/features/inventory/components/EditInventoryMasterModal'
import { toast } from '@/components/ui/sonner'

const PAGE_SIZE = 10

// Real backend-wired replacement for the "Item Master" tab — deliberately a
// separate component from ItemMasterTab.tsx (the old mock), which stays
// untouched since ExpiryFEFOTab.tsx/ForecastTab.tsx still import its
// ItemDetailDrawerBody export for their own (still-mock) data. Once a real
// inventory-item/transaction/assignment module lands, those other 17 tabs
// get their own migration pass — out of scope here.
const InventoryMasterTab = () => {
  const { hasAnyPermission } = usePermission()
  const canManage = hasAnyPermission(['inventory-master:manage'])

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [type, setType] = useState<InventoryMasterType | 'ALL'>('ALL')
  // No "all statuses" option — the backend's search() always assigns
  // where.status (defaulting to 'active') and only ever overwrites it with
  // an explicit filter value; there is no code path that removes the status
  // filter entirely, so a request with no `status` param silently behaves
  // exactly like status=active instead of returning everything. Only
  // Active/Inactive are real, distinct results. Only a manage caller can
  // override the default at all (non-manage callers never see inactive
  // items), so this only matters/renders for canManage below.
  const [statusFilter, setStatusFilter] = useState<InventoryMasterStatus>('active')
  const [page, setPage] = useState(1)
  const [editModal, setEditModal] = useState<{ open: boolean; item: InventoryMasterEntity | null }>({ open: false, item: null })
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)

  const { data, isLoading, error } = useInventoryMasters({
    name: debouncedSearch || undefined,
    type: type === 'ALL' ? undefined : type,
    status: canManage ? statusFilter : undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const items = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const toggleStatusMutation = useUpdateInventoryMaster(deactivatingId ?? '')

  const handleToggleStatus = (item: InventoryMasterEntity) => {
    // No DELETE endpoint exists on the backend — the only way to retire (or
    // restore) an item is PUT .../:id with the opposite status.
    const nextStatus = item.status === 'active' ? 'inactive' : 'active'
    setDeactivatingId(item.id)
    toggleStatusMutation.mutate(
      { status: nextStatus },
      {
        onSuccess: () => {
          toast.success(`${item.name} ${nextStatus === 'active' ? 'reactivated' : 'deactivated'}`)
          setDeactivatingId(null)
        },
        onError: () => {
          toast.error('Could not update the item — try again.')
          setDeactivatingId(null)
        },
      },
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--qms-text)' }}>Item Master</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
            {!isLoading && !error ? `${totalCount} total` : 'The shared catalog of inventory item codes.'}
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => setEditModal({ open: true, item: null })}
            className="text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> New item
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--qms-text-muted)' }} />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-8 text-[13px]"
          />
        </div>
        <Select value={type} onValueChange={(v) => { setType(v as InventoryMasterType | 'ALL'); setPage(1) }}>
          <SelectTrigger className="w-40 text-[13px]">
            <SelectValue>{() => (type === 'ALL' ? 'All types' : INVENTORY_MASTER_TYPE_LABEL[type])}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {INVENTORY_MASTER_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{INVENTORY_MASTER_TYPE_LABEL[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canManage && (
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as InventoryMasterStatus); setPage(1) }}>
            <SelectTrigger className="w-36 text-[13px]">
              <SelectValue>{() => (statusFilter === 'active' ? 'Active' : 'Inactive')}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading items…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load items. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                    {['Code', 'Name', 'Type', 'SKU', 'Unit', 'Min / Max stock', ...(canManage ? ['Status', ''] : [])].map((h) => (
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
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => canManage && setEditModal({ open: true, item })}
                      className={canManage ? 'cursor-pointer transition-colors hover:bg-(--qms-surface-hover)' : ''}
                      style={{ borderBottom: '1px solid var(--qms-border)' }}
                    >
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--qms-text)' }}>{item.code}</td>
                      <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{item.name}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{INVENTORY_MASTER_TYPE_LABEL[item.type]}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{item.sku}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{item.unit}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{item.minStock} / {item.maxStock}</td>
                      {canManage && (
                        <>
                          <td className="px-4 py-2.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.status === 'active' ? 'bg-success-soft text-success' : ''}`}
                              style={item.status !== 'active' ? { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' } : undefined}
                            >
                              {item.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleToggleStatus(item) }}
                              disabled={deactivatingId === item.id && toggleStatusMutation.isPending}
                            >
                              {deactivatingId === item.id && toggleStatusMutation.isPending
                                ? (item.status === 'active' ? 'Deactivating…' : 'Reactivating…')
                                : (item.status === 'active' ? 'Deactivate' : 'Reactivate')}
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {items.length === 0 && (
              <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
                No items found.
              </div>
            )}
          </div>
          {totalPages > 1 && <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />}
        </>
      )}

      {editModal.open && (
        <EditInventoryMasterModal
          item={editModal.item}
          onClose={() => setEditModal({ open: false, item: null })}
        />
      )}
    </div>
  )
}

export default InventoryMasterTab
