import { useState } from 'react'
import { FiPlus, FiSearch } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useInventoryMasters } from '@/features/inventory/real/hooks/useInventoryMasters'
import { INVENTORY_MASTER_TYPE_LABEL, INVENTORY_MASTER_TYPES } from '@/types/inventoryMaster.types'
import type { InventoryMasterEntity, InventoryMasterStatus, InventoryMasterType } from '@/types/inventoryMaster.types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import CopyButton from '@/components/ui/CopyButton'
import EditInventoryMasterModal from '@/features/inventory/real/components/EditInventoryMasterModal'
import { usePagination } from '@/hooks/usePagination'
import { truncateIdentifier } from '@/features/inventory/real/utils/truncateIdentifier'

const PAGE_SIZE = 10

const InventoryMasterTab = () => {
  const { hasAnyPermission } = usePermission()
  const canManage = hasAnyPermission(['inventory-master:manage'])

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [type, setType] = useState<InventoryMasterType | 'ALL'>('ALL')

  const [statusFilter, setStatusFilter] = useState<InventoryMasterStatus>('active')
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const [editModal, setEditModal] = useState<{ open: boolean; item: InventoryMasterEntity | null }>({ open: false, item: null })

  const { data, isLoading, error, refetch } = useInventoryMasters({
    name: debouncedSearch || undefined,
    type: type === 'ALL' ? undefined : type,
    status: canManage ? statusFilter : undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const items = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
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
            <FiPlus size={14} /> New Catalogue
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--qms-text-muted)' }} />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetToFirstPage() }}
            className="pl-8 text-[13px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Select value={type} onValueChange={(v) => { setType(v as InventoryMasterType | 'ALL'); resetToFirstPage() }}>
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
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as InventoryMasterStatus); resetToFirstPage() }}>
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
      </div>

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading items…" errorLabel="Failed to load items. Please try again." onRetry={refetch}>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  {['Code', 'Name', 'Type', 'SKU', 'Unit', ...(canManage ? ['Status'] : []), 'Stock range'].map((h) => (
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
                    <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono" title={item.code}>{truncateIdentifier(item.code)}</span>
                        <CopyButton value={item.code} label="Code" />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-semibold max-w-xs truncate" style={{ color: 'var(--qms-text)' }} title={item.name}>{item.name}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{INVENTORY_MASTER_TYPE_LABEL[item.type]}</td>
                    <td className="px-4 py-2.5 max-w-xs truncate" style={{ color: 'var(--qms-text-muted)' }} title={item.sku}>{item.sku}</td>
                    <td className="px-4 py-2.5 max-w-xs truncate" style={{ color: 'var(--qms-text-muted)' }} title={item.unit}>{item.unit}</td>
                    {canManage && (
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.status === 'active' ? 'bg-success-soft text-success' : ''}`}
                          style={item.status !== 'active' ? { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' } : undefined}
                        >
                          {item.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{item.minStock} - {item.maxStock}</td>
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
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>

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
