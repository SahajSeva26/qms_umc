import { useMemo, useState } from 'react'
import { FiAlertTriangle, FiCheckCircle, FiCpu, FiHardDrive, FiPlus, FiTag } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useInventoryDevices } from '@/features/inventory/real/hooks/useInventoryDevices'
import { useInventoryDeviceReport } from '@/features/inventory/real/hooks/useInventoryDeviceReport'
import { INVENTORY_DEVICE_STATUS_LABEL, INVENTORY_DEVICE_STATUSES } from '@/types/inventoryDevice.types'
import type { InventoryDeviceEntity, InventoryDeviceStatus } from '@/types/inventoryDevice.types'
import type { InventoryMovementHistorySource } from '@/types/inventoryLedger.types'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import CopyButton from '@/components/ui/CopyButton'
import EditInventoryDeviceModal from '@/features/inventory/real/components/EditInventoryDeviceModal'
import InventoryDeviceDetailDrawer from '@/features/inventory/real/components/InventoryDeviceDetailDrawer'
import InventoryDeviceSearchBar from '@/features/inventory/real/components/InventoryDeviceSearchBar'
import type { InventoryDeviceSearchBarValue } from '@/features/inventory/real/components/InventoryDeviceSearchBar'
import InventoryMovementHistoryDrawer from '@/features/inventory/real/components/InventoryMovementHistoryDrawer'
import InventoryReportKpiStrip, { type InventoryReportTile } from '@/features/inventory/real/components/InventoryReportKpiStrip'
import { usePagination } from '@/hooks/usePagination'
import { truncateIdentifier } from '@/features/inventory/real/utils/truncateIdentifier'

// 'in-transit' is the one status deliberately left off the KPI strip — the other 5 fill all 4 tiles.
const NEEDS_ATTENTION_STATUSES: InventoryDeviceStatus[] = ['maintainance', 'lost', 'damaged']

const PAGE_SIZE = 10

const STATUS_STYLE: Record<InventoryDeviceStatus, { bg: string; fg: string }> = {
  available: { bg: 'var(--qms-surface-strong)', fg: 'var(--qms-text-soft)' },
  'in-transit': { bg: 'rgba(245,158,11,.15)', fg: '#d97706' },
  assigned: { bg: 'rgba(59,109,255,.14)', fg: 'var(--qms-brand-700, #2451f0)' },
  maintainance: { bg: 'rgba(245,158,11,.15)', fg: '#d97706' },
  lost: { bg: 'rgba(244,63,94,.15)', fg: '#e11d48' },
  damaged: { bg: 'rgba(244,63,94,.15)', fg: '#e11d48' },
}

// Device status is never permission-gated — every authenticated reader sees
// it, unlike the Consumables panel's canManage-based Status column hiding.
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
  // Card click opens the read-only detail drawer — Edit and Movement history both live inside it.
  const [detailDevice, setDetailDevice] = useState<InventoryDeviceEntity | null>(null)

  const { data, isLoading, error, refetch } = useInventoryDevices({
    serialNumber: debouncedSerial.trim() || undefined,
    status: status === 'ALL' ? undefined : status,
    item: searchBar.item?.id || undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const items = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  const { report, isLoading: reportLoading, error: reportError } = useInventoryDeviceReport(canManage)
  const reportTiles = useMemo<InventoryReportTile[]>(() => {
    if (!report) return []
    const byStatus = new Map(report.devices.byStatus.map((s) => [s.status, s.count]))
    const needsAttention = NEEDS_ATTENTION_STATUSES.reduce((sum, s) => sum + (byStatus.get(s) ?? 0), 0)
    return [
      { key: 'total', label: 'Total', value: report.summary.totalDevices, tone: 'brand', icon: FiHardDrive },
      { key: 'available', label: INVENTORY_DEVICE_STATUS_LABEL.available, value: byStatus.get('available') ?? 0, tone: 'emerald', icon: FiCheckCircle },
      { key: 'assigned', label: INVENTORY_DEVICE_STATUS_LABEL.assigned, value: byStatus.get('assigned') ?? 0, tone: 'teal', icon: FiTag },
      { key: 'needs-attention', label: 'Needs attention', value: needsAttention, tone: 'rose', icon: FiAlertTriangle },
    ]
  }, [report])

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

      <InventoryReportKpiStrip
        tiles={reportTiles}
        isLoading={reportLoading}
        error={reportError}
        canView={canManage}
        skeletonCount={4}
      />

      <div
        className="flex flex-wrap items-center gap-2 mb-3 rounded-xl border p-2.5"
        style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}
      >
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
        {items.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
            No devices found.
          </div>
        ) : (
          <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {items.map((device) => {
              const sc = STATUS_STYLE[device.status]
              return (
                <div
                  key={device.id}
                  onClick={() => setDetailDevice(device)}
                  className="rounded-xl border p-3.5 space-y-2.5 cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                  style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, rgba(36,81,240,.16), rgba(20,184,166,.16))', color: 'var(--qms-brand)' }}
                    >
                      <FiCpu size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold truncate" style={{ color: 'var(--qms-text)' }} title={device.item.name}>
                        {device.item.name ?? device.item.id}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                        <span className="font-mono" title={device.serialNumber}>{truncateIdentifier(device.serialNumber)}</span>
                        <CopyButton value={device.serialNumber} label="Serial number" />
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: sc.bg, color: sc.fg }}
                    >
                      {INVENTORY_DEVICE_STATUS_LABEL[device.status].toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2" style={{ borderTop: '1px solid var(--qms-border)' }}>
                    <div>
                      <div className="text-[12px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{device.manufacturingDate?.slice(0, 10) ?? '—'}</div>
                      <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Mfg date</div>
                    </div>
                    <div>
                      <div className="text-[12px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{device.warrantyExpiryDate?.slice(0, 10) ?? '—'}</div>
                      <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Warranty</div>
                    </div>
                    <div>
                      <div className="text-[12px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{device.nextCalibrationDate?.slice(0, 10) ?? '—'}</div>
                      <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Next calib.</div>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}
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

      {detailDevice && (
        <InventoryDeviceDetailDrawer
          device={detailDevice}
          canManage={canManage}
          canViewLedger={canViewLedger}
          onClose={() => setDetailDevice(null)}
          onEdit={() => {
            setEditModal({ open: true, device: detailDevice })
            setDetailDevice(null)
          }}
          onViewHistory={() => {
            setHistorySource({
              mode: 'inventory',
              inventoryType: 'InventoryDevice',
              inventoryId: detailDevice.id,
              summary: { serialNumber: detailDevice.serialNumber, itemName: detailDevice.item.name ?? detailDevice.item.id, status: detailDevice.status },
            })
            setDetailDevice(null)
          }}
        />
      )}
    </div>
  )
}

export default InventoryDevicesPanel
