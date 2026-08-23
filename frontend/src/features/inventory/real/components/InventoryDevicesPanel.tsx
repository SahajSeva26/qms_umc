import { useState } from 'react'
import { FiPlus, FiClock } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useInventoryDevices } from '@/features/inventory/real/hooks/useInventoryDevices'
import { INVENTORY_DEVICE_STATUS_LABEL, INVENTORY_DEVICE_STATUSES } from '@/features/inventory/real/inventoryDevice.types'
import type { InventoryDeviceEntity, InventoryDeviceStatus } from '@/features/inventory/real/inventoryDevice.types'
import type { InventoryMovementHistorySource } from '@/features/inventory/real/inventoryLedger.types'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import CopyButton from '@/components/ui/CopyButton'
import EditInventoryDeviceModal from '@/features/inventory/real/components/EditInventoryDeviceModal'
import InventoryDeviceSearchBar from '@/features/inventory/real/components/InventoryDeviceSearchBar'
import type { InventoryDeviceSearchBarValue } from '@/features/inventory/real/components/InventoryDeviceSearchBar'
import InventoryMovementHistoryDrawer from '@/features/inventory/real/components/InventoryMovementHistoryDrawer'
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
  // Independent of inventory-device:manage — the History trigger must show for anyone
  // holding inventory-ledger:manage, whether or not they can edit this device.
  const canViewLedger = hasAnyPermission(['inventory-ledger:manage'])

  const [searchBar, setSearchBar] = useState<InventoryDeviceSearchBarValue>({ serial: '', item: null })
  const debouncedSerial = useDebouncedValue(searchBar.serial, 300)
  const [status, setStatus] = useState<InventoryDeviceStatus | 'ALL'>('ALL')
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const [editModal, setEditModal] = useState<{ open: boolean; device: InventoryDeviceEntity | null }>({ open: false, device: null })
  const [historySource, setHistorySource] = useState<InventoryMovementHistorySource | null>(null)

  const { data, isLoading, error, refetch } = useInventoryDevices({
    serialNumber: debouncedSerial.trim() || undefined,
    status: status === 'ALL' ? undefined : status,
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
        <InventoryDeviceSearchBar
          value={searchBar}
          onChange={(v) => { setSearchBar(v); resetToFirstPage() }}
        />
        <div className="sm:ml-auto">
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
        </div>
      </div>

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading devices…" errorLabel="Failed to load devices. Please try again." onRetry={refetch}>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  {['Serial number', 'Item', 'Status', 'Mfg date', 'Warranty', 'Next calibration', ...(canViewLedger ? [''] : [])].map((h) => (
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
                      {canViewLedger && (
                        <td className="px-4 py-2.5">
                          <button
                            type="button"
                            title="View movement history" aria-label="View movement history"
                            onClick={(e) => {
                              e.stopPropagation()
                              setHistorySource({
                                mode: 'inventory',
                                inventoryType: 'InventoryDevice',
                                inventoryId: device.id,
                                summary: { serialNumber: device.serialNumber, itemName: device.item.name ?? device.item.id, status: device.status },
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

export default InventoryDevicesPanel
