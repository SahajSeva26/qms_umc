import { useMemo, useState } from 'react'
import { FiCheckCircle, FiLayers, FiPlus, FiSearch, FiXCircle } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useInventoryMasters } from '@/features/inventory/real/hooks/useInventoryMasters'
import { useInventoryMasterReport } from '@/features/inventory/real/hooks/useInventoryMasterReport'
import {
  INVENTORY_MASTER_STATUS_LABEL,
  INVENTORY_MASTER_TYPE_LABEL,
  INVENTORY_MASTER_TYPES,
} from '@/types/inventoryMaster.types'
import type { InventoryMasterEntity, InventoryMasterStatus, InventoryMasterType } from '@/types/inventoryMaster.types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import CopyButton from '@/components/ui/CopyButton'
import EditInventoryMasterModal from '@/features/inventory/real/components/EditInventoryMasterModal'
import InventoryMasterDetailDrawer from '@/features/inventory/real/components/InventoryMasterDetailDrawer'
import InventoryReportKpiStrip, { type InventoryReportTile } from '@/features/inventory/real/components/InventoryReportKpiStrip'
import InventoryMasterTypeStrip from '@/features/inventory/real/components/InventoryMasterTypeStrip'
import { INVENTORY_MASTER_TYPE_META } from '@/features/inventory/real/utils/inventoryMasterTypeMeta'
import { usePagination } from '@/hooks/usePagination'
import { truncateIdentifier } from '@/features/inventory/real/utils/truncateIdentifier'

const STATUS_TONE: Record<InventoryMasterStatus, 'emerald' | 'rose'> = { active: 'emerald', inactive: 'rose' }

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
  // Row click opens the read-only detail drawer (open to any reader) — Edit lives inside it, not a row-end button.
  const [detailItem, setDetailItem] = useState<InventoryMasterEntity | null>(null)

  const { data, isLoading, error, refetch } = useInventoryMasters({
    name: debouncedSearch || undefined,
    type: type === 'ALL' ? undefined : type,
    status: canManage ? statusFilter : undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const items = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  const { report, isLoading: reportLoading, error: reportError } = useInventoryMasterReport(canManage)
  // Real counts per type, from the same report query the KPI strip already
  // fetches — undefined while loading/unauthorized (shown as "—", not 0).
  const typeCounts = useMemo<Record<InventoryMasterType, number> | undefined>(() => {
    if (!report) return undefined
    const byType = new Map(report.catalog.byType.map((t) => [t.type, t.count]))
    return {
      device: byType.get('device') ?? 0,
      consumable: byType.get('consumable') ?? 0,
    }
  }, [report])
  // Type breakdown lives in InventoryMasterTypeStrip below (also doubles as
  // the type filter) — this strip covers only totals the type-strip doesn't.
  const reportTiles = useMemo<InventoryReportTile[]>(() => {
    if (!report) return []
    const byStatus = new Map(report.catalog.byStatus.map((s) => [s.status, s.count]))
    return [
      { key: 'catalogItems', label: 'Catalog Items', value: report.summary.catalogItems, tone: 'brand', icon: FiLayers },
      {
        key: 'status-active',
        label: INVENTORY_MASTER_STATUS_LABEL.active,
        value: byStatus.get('active') ?? 0,
        tone: STATUS_TONE.active,
        icon: FiCheckCircle,
      },
      {
        key: 'status-inactive',
        label: INVENTORY_MASTER_STATUS_LABEL.inactive,
        value: byStatus.get('inactive') ?? 0,
        tone: STATUS_TONE.inactive,
        icon: FiXCircle,
      },
    ]
  }, [report])

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

      <InventoryReportKpiStrip
        tiles={reportTiles}
        isLoading={reportLoading}
        error={reportError}
        canView={canManage}
        skeletonCount={5}
        extraTiles={
          <InventoryMasterTypeStrip
            counts={typeCounts}
            activeType={type}
            onSelectType={(t) => { setType(t); resetToFirstPage() }}
          />
        }
      />

      <div
        className="flex flex-wrap items-center gap-2 mb-3 rounded-xl border p-2.5"
        style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}
      >
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
                  {['Code', 'Name', 'Type', 'SKU', 'Unit', ...(canManage ? ['Status'] : []), 'Min stock'].map((h, i) => (
                    <th
                      key={`${h}-${i}`}
                      className={`font-bold text-[11px] uppercase tracking-wider px-4 py-2 ${h === 'Min stock' ? 'text-right' : 'text-left'}`}
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
                    onClick={() => setDetailItem(item)}
                    className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                    style={{ borderBottom: '1px solid var(--qms-border)' }}
                  >
                    <td className="px-4 py-2" style={{ color: 'var(--qms-text)' }}>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold" title={item.code}>{truncateIdentifier(item.code)}</span>
                        <CopyButton value={item.code} label="Code" />
                      </div>
                    </td>
                    <td className="px-4 py-2 max-w-xs truncate" style={{ color: 'var(--qms-text)' }} title={item.name}>{item.name}</td>
                    <td className="px-4 py-2">
                      {(() => {
                        const meta = INVENTORY_MASTER_TYPE_META[item.type]
                        const Icon = meta.icon
                        return (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: `color-mix(in srgb, ${meta.color} 10%, transparent)`, color: meta.color }}
                          >
                            <Icon size={11} />
                            {INVENTORY_MASTER_TYPE_LABEL[item.type]}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-2 max-w-xs truncate" style={{ color: 'var(--qms-text-muted)' }} title={item.sku}>{item.sku}</td>
                    <td className="px-4 py-2 max-w-xs truncate" style={{ color: 'var(--qms-text-muted)' }} title={item.unit}>{item.unit}</td>
                    {canManage && (
                      <td className="px-4 py-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.status === 'active' ? 'bg-success-soft text-success' : ''}`}
                          style={item.status !== 'active' ? { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' } : undefined}
                        >
                          {item.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-2 text-right font-mono" style={{ color: 'var(--qms-text-muted)' }}>{item.minStock}</td>
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

      {detailItem && (
        <InventoryMasterDetailDrawer
          item={detailItem}
          canManage={canManage}
          onClose={() => setDetailItem(null)}
          onEdit={() => {
            setEditModal({ open: true, item: detailItem })
            setDetailItem(null)
          }}
        />
      )}
    </div>
  )
}

export default InventoryMasterTab
