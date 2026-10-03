import { useMemo, useState } from 'react'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useInventoryDevices } from '@/features/inventory/real/hooks/useInventoryDevices'
import { useInventoryAssignments } from '@/features/inventory/real/hooks/useInventoryAssignments'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import InventoryDeviceSearchBar from '@/features/inventory/real/components/InventoryDeviceSearchBar'
import type { InventoryDeviceSearchBarValue } from '@/features/inventory/real/components/InventoryDeviceSearchBar'
import { calibrationStatus, CALIBRATION_STATUS_COLOR, type CalibrationStatusCode } from '@/features/inventory/real/utils/calibrationStatus'
import { INVENTORY_DEVICE_STATUS_LABEL } from '@/types/inventoryDevice.types'

const STATUS_OPTIONS: { value: CalibrationStatusCode | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'DUE_SOON', label: 'Due soon' },
  { value: 'OK', label: 'Calibrated' },
  { value: 'UNSCHEDULED', label: 'Not scheduled' },
]

// Same capped-fetch pattern as InventoryExpiryPanel — shows all loaded devices (default filter is ALL), no pagination.
const FETCH_LIMIT = '1000'

// The prototype's "mark calibrated" action has no backend endpoint yet (see md-files/ui-revisions.md) — read-only.
// Same real device list as InventoryDevicesPanel, re-sorted by calibration due date, assignee cross-referenced.
const InventoryCalibrationPanel = () => {
  const { hasAnyPermission } = usePermission()
  const canViewAssignments = hasAnyPermission(['inventory-assignment:manage'])
  const [searchBar, setSearchBar] = useState<InventoryDeviceSearchBarValue>({ serial: '', item: null })
  const debouncedSerial = useDebouncedValue(searchBar.serial, 300)
  const [statusFilter, setStatusFilter] = useState<CalibrationStatusCode | 'ALL'>('ALL')

  const { data, isLoading, error, refetch } = useInventoryDevices({
    serialNumber: debouncedSerial.trim() || undefined,
    item: searchBar.item?.id || undefined,
    limit: FETCH_LIMIT,
  })
  const items = useMemo(() => data?.data?.items ?? [], [data])
  const totalCount = data?.data?.count ?? 0
  const truncated = items.length < totalCount

  const { data: assignmentsData } = useInventoryAssignments({ inventoryType: 'InventoryDevice', limit: FETCH_LIMIT }, canViewAssignments)
  const assigneeByDevice = useMemo(() => {
    const map = new Map<string, string>()
    const rows = assignmentsData?.data?.items ?? []
    rows.forEach((a) => { map.set(a.inventory.id, a.assignee.name ?? a.assignee.id) })
    return map
  }, [assignmentsData])

  const withStatus = useMemo(() => {
    return items
      .map((device) => ({ device, status: calibrationStatus(device.nextCalibrationDate) }))
      .sort((a, b) => {
        // Unscheduled last; otherwise most-overdue/soonest-due first.
        if (a.status.days === null) return b.status.days === null ? 0 : 1
        if (b.status.days === null) return -1
        return a.status.days - b.status.days
      })
  }, [items])

  const shown = statusFilter === 'ALL' ? withStatus : withStatus.filter((d) => d.status.code === statusFilter)

  return (
    <div>
      <div className="mb-3">
        <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
          {!isLoading && !error ? `${totalCount} devices, sorted by calibration due date` : 'Devices by calibration due date.'}
        </p>
      </div>

      {truncated && !isLoading && !error && (
        <p className="text-[12px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>
          Showing the first {items.length} of {totalCount} devices.
        </p>
      )}

      <div className="inv-filter mb-3">
        <InventoryDeviceSearchBar value={searchBar} onChange={setSearchBar} />
        <div className="sm:ml-auto">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CalibrationStatusCode | 'ALL')}>
            <SelectTrigger className="w-40 text-[13px]">
              <SelectValue>{() => STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading devices…" errorLabel="Failed to load devices. Please try again." onRetry={refetch}>
        <div className="inv-card">
          <div className="overflow-x-auto">
            <table className="inv-tbl">
              <thead>
                <tr>
                  <th>Serial</th>
                  <th>Device type</th>
                  <th>Vendor</th>
                  <th>Last calibrated</th>
                  <th>Next due</th>
                  <th>Status</th>
                  {canViewAssignments && <th>Assigned to / location</th>}
                </tr>
              </thead>
              <tbody>
                {shown.map(({ device, status }) => {
                  const color = CALIBRATION_STATUS_COLOR[status.code]
                  return (
                    <tr key={device.id}>
                      <td><b>{device.serialNumber}</b></td>
                      <td>{device.item.name ?? device.item.id}</td>
                      <td className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{device.vendor?.name ?? '—'}</td>
                      <td>{device.lastCalibrationDate?.slice(0, 10) ?? '—'}</td>
                      <td>{device.nextCalibrationDate?.slice(0, 10) ?? '—'}</td>
                      <td>
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: color.bg, color: color.text }}>
                          {status.label}
                        </span>
                      </td>
                      {canViewAssignments && (
                        <td>{assigneeByDevice.get(device.id) ?? INVENTORY_DEVICE_STATUS_LABEL[device.status]}</td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {shown.length === 0 && (
            <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              No devices match.
            </div>
          )}
        </div>
      </QueryStateBlock>
    </div>
  )
}

export default InventoryCalibrationPanel
