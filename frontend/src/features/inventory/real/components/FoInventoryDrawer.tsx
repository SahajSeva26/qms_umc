import { useMemo } from 'react'
import { FiCpu, FiPackage, FiCalendar } from 'react-icons/fi'
import SideDrawer from '@/components/ui/SideDrawer'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import PaginationControls from '@/components/ui/PaginationControls'
import { useInventoryAssignments } from '@/features/inventory/real/hooks/useInventoryAssignments'
import { useFoInventoryDevices, useFoInventoryConsumables } from '@/features/inventory/real/hooks/useFoInventoryDetails'
import { expiryBand } from '@/features/inventory/real/utils/expiryBand'
import { INVENTORY_DEVICE_STATUS_LABEL } from '@/types/inventoryDevice.types'
import type { InventoryAssignmentEntity } from '@/types/inventoryAssignment.types'
import { usePagination } from '@/hooks/usePagination'

const PAGE_SIZE = 10

// Stable reference so dependent memos don't re-run on every "no items yet" render.
const EMPTY_ASSIGNMENTS: InventoryAssignmentEntity[] = []

interface FoInventoryDrawerProps {
  open: boolean
  onClose: () => void
  foRoleId: string
  foName: string
  foCode: string
}

// KPI-tile strip + devices/consumables tables, mirroring the prototype's FO inventory
// drawer intent; ₹ valuation columns dropped — no price field on our real models.
const FoInventoryDrawer = ({ open, onClose, foRoleId, foName, foCode }: FoInventoryDrawerProps) => {
  const { page: devicePage, setPage: setDevicePage, totalPages: deviceTotalPages } = usePagination(PAGE_SIZE)
  const { page: consumablePage, setPage: setConsumablePage, totalPages: consumableTotalPages } = usePagination(PAGE_SIZE)
  const { data: deviceAssignmentsData, isLoading: deviceAssignmentsLoading, error: deviceAssignmentsError, refetch: refetchDeviceAssignments } =
    useInventoryAssignments({ assignee: foRoleId, inventoryType: 'InventoryDevice', page: String(devicePage), limit: String(PAGE_SIZE) }, open)
  const { data: consumableAssignmentsData, isLoading: consumableAssignmentsLoading, error: consumableAssignmentsError, refetch: refetchConsumableAssignments } =
    useInventoryAssignments({ assignee: foRoleId, inventoryType: 'InventoryConsumable', page: String(consumablePage), limit: String(PAGE_SIZE) }, open)

  const deviceRows = deviceAssignmentsData?.data?.items ?? EMPTY_ASSIGNMENTS
  const consumableRows = consumableAssignmentsData?.data?.items ?? EMPTY_ASSIGNMENTS
  const deviceCount = deviceAssignmentsData?.data?.count ?? 0
  const consumableCount = consumableAssignmentsData?.data?.count ?? 0

  // Fetched by exact id, not a global list scan — never misses an item regardless of status
  // (the global search defaults to active-only, which would hide expired consumable lots).
  const deviceIds = useMemo(() => deviceRows.map((a) => a.inventory.id), [deviceRows])
  const consumableIds = useMemo(() => consumableRows.map((a) => a.inventory.id), [consumableRows])

  const { data: deviceById, isLoading: devicesLoading, error: devicesError, refetch: refetchDevices } = useFoInventoryDevices(deviceIds, open)
  const { data: consumableById, isLoading: consumablesLoading, error: consumablesError, refetch: refetchConsumables } = useFoInventoryConsumables(consumableIds, open)

  const isLoading = deviceAssignmentsLoading || consumableAssignmentsLoading || devicesLoading || consumablesLoading
  const error = deviceAssignmentsError || consumableAssignmentsError || devicesError || consumablesError
  const retry = () => {
    refetchDeviceAssignments()
    refetchConsumableAssignments()
    refetchDevices()
    refetchConsumables()
  }

  const expiringSoonCount = useMemo(() => {
    return consumableRows.filter((a: InventoryAssignmentEntity) => {
      const band = expiryBand(a.inventory.expiryDate)
      return band && (band.code === 'EXPIRED' || band.code === 'RED' || band.code === 'ORANGE')
    }).length
  }, [consumableRows])

  const initials = foName.split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

  return (
    <SideDrawer open={open} title="FO inventory" onClose={onClose} widthClassName="max-w-2xl">
      <div className="flex items-center gap-3.5 mb-5">
        <div
          className="w-13 h-13 rounded-2xl flex items-center justify-center text-white font-extrabold shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{foName}</div>
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Field Officer · {foCode}</div>
        </div>
      </div>

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading inventory…" errorLabel="Failed to load inventory. Please try again." onRetry={retry}>
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)' }}>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--qms-text-muted)' }}>
              <FiCpu size={11} /> Devices
            </div>
            <div className="text-lg font-extrabold" style={{ color: 'var(--qms-text)' }}>{deviceCount}</div>
          </div>
          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)' }}>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--qms-text-muted)' }}>
              <FiPackage size={11} /> Consumables
            </div>
            <div className="text-lg font-extrabold" style={{ color: 'var(--qms-text)' }}>{consumableCount}</div>
          </div>
          <div className="rounded-xl border p-3 col-span-2" style={{ borderColor: 'var(--qms-border)' }}>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--qms-text-muted)' }}>
              <FiCalendar size={11} /> Expiring soon
            </div>
            <div className="text-lg font-extrabold" style={{ color: expiringSoonCount > 0 ? '#c2410c' : 'var(--qms-text)' }}>{expiringSoonCount}</div>
            <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>This page · &lt; 90 days</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[12px] font-bold mb-2" style={{ color: 'var(--qms-text)' }}>
          <FiCpu size={13} /> Devices ({deviceCount})
        </div>
        {deviceRows.length > 0 ? (
          <div className="rounded-xl border overflow-hidden mb-5" style={{ borderColor: 'var(--qms-border)' }}>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  {['Serial', 'Device', 'Status', 'Calibration'].map((h) => (
                    <th key={h} className="text-left font-bold text-[10px] uppercase tracking-wider px-3 py-2" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deviceRows.map((a) => {
                  const device = deviceById?.get(a.inventory.id)
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                      <td className="px-3 py-2 font-mono" style={{ color: 'var(--qms-text-muted)' }}>{a.inventory.serialNumber ?? '—'}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{device?.item?.name ?? '—'}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--qms-text-muted)' }}>{a.inventory.status ? INVENTORY_DEVICE_STATUS_LABEL[a.inventory.status as keyof typeof INVENTORY_DEVICE_STATUS_LABEL] ?? a.inventory.status : '—'}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--qms-text-muted)' }}>{device?.nextCalibrationDate ? new Date(device.nextCalibrationDate).toLocaleDateString() : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-[12px] mb-5" style={{ color: 'var(--qms-text-muted)' }}>No devices assigned.</div>
        )}
        <div className="mb-5">
          <PaginationControls
            page={devicePage}
            totalPages={deviceTotalPages(deviceCount)}
            onPageChange={setDevicePage}
            disabled={deviceAssignmentsLoading || devicesLoading}
          />
        </div>

        <div className="flex items-center gap-1.5 text-[12px] font-bold mb-2" style={{ color: 'var(--qms-text)' }}>
          <FiPackage size={13} /> Consumables ({consumableCount})
        </div>
        {consumableRows.length > 0 ? (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)' }}>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  {['Item', 'Batch', 'Qty', 'Expiry'].map((h) => (
                    <th key={h} className="text-left font-bold text-[10px] uppercase tracking-wider px-3 py-2" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {consumableRows.map((a) => {
                  const consumable = consumableById?.get(a.inventory.id)
                  const band = expiryBand(a.inventory.expiryDate)
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                      <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{consumable?.item?.name ?? '—'}</td>
                      <td className="px-3 py-2 font-mono" style={{ color: 'var(--qms-text-muted)' }}>{a.inventory.batch ?? '—'}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{a.quantity}</td>
                      <td className="px-3 py-2">
                        {band ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: band.css === 'green' ? 'rgba(16,185,129,.15)' : band.css === 'yellow' ? 'rgba(234,179,8,.18)' : band.css === 'orange' ? 'rgba(249,115,22,.16)' : 'rgba(244,63,94,.15)', color: band.css === 'green' ? '#059669' : band.css === 'yellow' ? '#a16207' : band.css === 'orange' ? '#c2410c' : '#e11d48' }}>
                            {band.label}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--qms-text-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No consumables held.</div>
        )}
        <PaginationControls
          page={consumablePage}
          totalPages={consumableTotalPages(consumableCount)}
          onPageChange={setConsumablePage}
          disabled={consumableAssignmentsLoading || consumablesLoading}
        />
      </QueryStateBlock>
    </SideDrawer>
  )
}

export default FoInventoryDrawer
