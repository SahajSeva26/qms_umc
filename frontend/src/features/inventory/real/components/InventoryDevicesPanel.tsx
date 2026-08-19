import { useState } from 'react'
import { FiPlus, FiSearch } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useInventoryDevices } from '@/features/inventory/real/hooks/useInventoryDevices'
import { INVENTORY_DEVICE_STATUS_LABEL, INVENTORY_DEVICE_STATUSES } from '@/types/inventoryDevice.types'
import type { InventoryDeviceEntity, InventoryDeviceStatus } from '@/types/inventoryDevice.types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import CopyButton from '@/components/ui/CopyButton'
import EditInventoryDeviceModal from '@/features/inventory/real/components/EditInventoryDeviceModal'
import InventoryMasterItemPicker from '@/features/inventory/real/components/InventoryMasterItemPicker'
import { usePagination } from '@/hooks/usePagination'
import { truncateIdentifier } from '@/features/inventory/real/utils/truncateIdentifier'

const PAGE_SIZE = 10

const STATUS_STYLE: Record<InventoryDeviceStatus, { bg: string; fg: string }> = {
  available: { bg: 'var(--qms-surface-strong)', fg: 'var(--qms-text-soft)' },
  'in-transit': { bg: 'rgba(245,158,11,.15)', fg: '#d97706' },
  assigned: { bg: 'rgba(59,109,255,.14)', fg: 'var(--qms-brand-700, #2451f0)' },
  maintainance: { bg: 'rgba(245,158,11,.15)', fg: '#d97706' },
  lost: { bg: 'rgba(244,63,94,.15)', fg: '#e11d48' },
  damaged: { bg: 'rgba(244,63,94,.15)', fg: '#e11d48' },
}

// Real backend-wired Devices panel. Device status is never permission-gated
// — every authenticated reader sees the real status, so unlike the
// Consumables panel there is no canManage-based column hiding here.
const InventoryDevicesPanel = () => {
  const { hasAnyPermission } = usePermission()
  const canManage = hasAnyPermission(['inventory-device:manage'])

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [status, setStatus] = useState<InventoryDeviceStatus | 'ALL'>('ALL')
  const [itemId, setItemId] = useState('')
  const [itemLabel, setItemLabel] = useState('')
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const [editModal, setEditModal] = useState<{ open: boolean; device: InventoryDeviceEntity | null }>({ open: false, device: null })

  const { data, isLoading, error, refetch } = useInventoryDevices({
    serialNumber: debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : status,
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
          {!isLoading && !error ? `${totalCount} total` : 'Individual physical device units.'}
        </p>
        {canManage && (
          <Button
            onClick={() => setEditModal({ open: true, device: null })}
            className="text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> New device
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--qms-text-muted)' }} />
          <Input
            placeholder="Search by serial number..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetToFirstPage() }}
            className="pl-8 text-[13px]"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v as InventoryDeviceStatus | 'ALL'); resetToFirstPage() }}>
          <SelectTrigger className="w-40 text-[13px]">
            <SelectValue>{() => (status === 'ALL' ? 'All statuses' : INVENTORY_DEVICE_STATUS_LABEL[status])}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {INVENTORY_DEVICE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{INVENTORY_DEVICE_STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="w-56">
          <InventoryMasterItemPicker
            type="device"
            value={itemId}
            label={itemLabel}
            onChange={(id, label) => { setItemId(id); setItemLabel(label); resetToFirstPage() }}
          />
        </div>
      </div>

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading devices…" errorLabel="Failed to load devices. Please try again." onRetry={refetch}>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  {['Serial number', 'Item', 'Status', 'Mfg date', 'Warranty', 'Next calibration'].map((h) => (
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
                {items.map((device) => {
                  const sc = STATUS_STYLE[device.status]
                  return (
                    <tr
                      key={device.id}
                      onClick={() => canManage && setEditModal({ open: true, device })}
                      className={canManage ? 'cursor-pointer transition-colors hover:bg-(--qms-surface-hover)' : ''}
                      style={{ borderBottom: '1px solid var(--qms-border)' }}
                    >
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono" title={device.serialNumber}>{truncateIdentifier(device.serialNumber)}</span>
                          <CopyButton value={device.serialNumber} label="Serial number" />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 max-w-xs truncate" style={{ color: 'var(--qms-text)' }} title={device.item.name}>
                        {device.item.name ?? device.item.id}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: sc.bg, color: sc.fg }}
                        >
                          {INVENTORY_DEVICE_STATUS_LABEL[device.status].toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{device.manufacturingDate?.slice(0, 10) ?? '—'}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{device.warrantyExpiryDate?.slice(0, 10) ?? '—'}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{device.nextCalibrationDate?.slice(0, 10) ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {items.length === 0 && (
            <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              No devices found.
            </div>
          )}
        </div>
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>

      {editModal.open && (
        <EditInventoryDeviceModal
          device={editModal.device}
          onClose={() => setEditModal({ open: false, device: null })}
        />
      )}
    </div>
  )
}

export default InventoryDevicesPanel
