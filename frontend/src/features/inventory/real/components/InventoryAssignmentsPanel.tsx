import { useMemo, useState } from 'react'
import { FiDownload, FiCpu, FiPackage, FiHome, FiUserPlus } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useInventoryAssignments } from '@/features/inventory/real/hooks/useInventoryAssignments'
import { useInventoryAssignmentReport } from '@/features/inventory/real/hooks/useInventoryAssignmentReport'
import { useInventoryDevices } from '@/features/inventory/real/hooks/useInventoryDevices'
import { useInventoryConsumables } from '@/features/inventory/real/hooks/useInventoryConsumables'
import { useGeoProfiles } from '@/features/geo-profile/hooks/useGeoProfiles'
import { inventoryAssignmentService } from '@/features/inventory/real/inventoryAssignment.service'
import { inventoryDeviceService } from '@/features/inventory/real/inventoryDevice.service'
import { geoProfileService } from '@/features/geo-profile/geoProfile.service'
import { downloadAssignedDevicesCsv, type AssignedDeviceRow } from '@/features/inventory/real/inventoryAssignment.export'
import { calibrationStatus } from '@/features/inventory/real/utils/calibrationStatus'
import { expiryBand } from '@/features/inventory/real/utils/expiryBand'
import { Button } from '@/components/ui/button'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import DirectAssignmentModal from '@/features/inventory/real/components/DirectAssignmentModal'
import { toast } from '@/components/ui/sonner'
import { getApiErrorMessage } from '@/utils/apiError'

// Same capped-fetch pattern used across this feature (Expiry/Calibration) —
// the prototype's chip grid shows every FO/device at once, no pagination.
const FETCH_LIMIT = '1000'

interface AssignmentChip {
  id: string
  label: string
  isConsumable: boolean
  color: string | null
}

// Matches the prototype's Assignments tab (inventory.js:650-690,
// .inv-assignment-grid) — a per-FO chip grid, not the KPI/table layout FO Inventory uses.
const InventoryAssignmentsPanel = () => {
  const { hasAnyPermission } = usePermission()
  const canManage = hasAnyPermission(['inventory-assignment:manage'])

  const { report, isLoading: reportLoading, error: reportError, refetch: refetchReport } = useInventoryAssignmentReport(canManage)
  const fieldOfficers = report?.fieldOfficers ?? []

  const { data: deviceAssignmentsData, isLoading: deviceAssignmentsLoading, error: deviceAssignmentsError, refetch: refetchDeviceAssignments } = useInventoryAssignments({ inventoryType: 'InventoryDevice', limit: FETCH_LIMIT }, canManage)
  const { data: consumableAssignmentsData, isLoading: consumableAssignmentsLoading, error: consumableAssignmentsError, refetch: refetchConsumableAssignments } = useInventoryAssignments({ inventoryType: 'InventoryConsumable', limit: FETCH_LIMIT }, canManage)
  // Gated on canManage like the rest — nothing here should fire for a viewer the `!canManage` early return below blocks.
  const { data: devicesData, isLoading: devicesLoading, error: devicesError, refetch: refetchDevices } = useInventoryDevices({ limit: FETCH_LIMIT }, canManage)
  const { data: consumablesData, isLoading: consumablesLoading, error: consumablesError, refetch: refetchConsumables } = useInventoryConsumables({ limit: FETCH_LIMIT }, canManage)
  const { data: geoProfilesData, isLoading: geoProfilesLoading, error: geoProfilesError, refetch: refetchGeoProfiles } = useGeoProfiles({ type: 'fo', limit: FETCH_LIMIT }, canManage)

  const isLoading = reportLoading || deviceAssignmentsLoading || consumableAssignmentsLoading || devicesLoading || consumablesLoading || geoProfilesLoading
  const error = reportError || deviceAssignmentsError || consumableAssignmentsError || devicesError || consumablesError || geoProfilesError
  const retryGrid = () => {
    refetchReport()
    refetchDeviceAssignments()
    refetchConsumableAssignments()
    refetchDevices()
    refetchConsumables()
    refetchGeoProfiles()
  }

  // Capped fetches, not real pagination — past the cap, rows silently disappear from chips/counts/HQ.
  const truncatedLabels = useMemo(() => {
    const labels: string[] = []
    if ((deviceAssignmentsData?.data?.items.length ?? 0) < (deviceAssignmentsData?.data?.count ?? 0)) labels.push('device assignments')
    if ((consumableAssignmentsData?.data?.items.length ?? 0) < (consumableAssignmentsData?.data?.count ?? 0)) labels.push('consumable assignments')
    if ((devicesData?.data?.items.length ?? 0) < (devicesData?.data?.count ?? 0)) labels.push('devices')
    if ((consumablesData?.data?.items.length ?? 0) < (consumablesData?.data?.count ?? 0)) labels.push('consumable lots')
    if ((geoProfilesData?.data?.items.length ?? 0) < (geoProfilesData?.data?.count ?? 0)) labels.push('FO locations')
    return labels
  }, [deviceAssignmentsData, consumableAssignmentsData, devicesData, consumablesData, geoProfilesData])

  const deviceById = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null }>()
    const items = devicesData?.data?.items ?? []
    items.forEach((d) => {
      const status = calibrationStatus(d.nextCalibrationDate)
      const color = status.code === 'OVERDUE' ? '#e11d48' : status.code === 'DUE_SOON' ? '#d97706' : null
      map.set(d.id, { name: d.item?.name ?? d.item?.id ?? d.serialNumber, color })
    })
    return map
  }, [devicesData])

  const consumableById = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null }>()
    const items = consumablesData?.data?.items ?? []
    items.forEach((c) => {
      const band = expiryBand(c.expiryDate)
      const color = band?.code === 'EXPIRED' || band?.code === 'RED' ? '#e11d48' : band?.code === 'ORANGE' ? '#d97706' : null
      map.set(c.id, { name: c.item?.name ?? c.item?.id ?? c.batch, color })
    })
    return map
  }, [consumablesData])

  const hqByRole = useMemo(() => {
    const map = new Map<string, string>()
    const items = geoProfilesData?.data?.items ?? []
    items.forEach((g) => {
      const parts = [g.city, g.state].filter(Boolean)
      if (parts.length) map.set(g.role, parts.join(' · '))
    })
    return map
  }, [geoProfilesData])

  const chipsByAssignee = useMemo(() => {
    const map = new Map<string, AssignmentChip[]>()
    const deviceItems = deviceAssignmentsData?.data?.items ?? []
    const consumableItems = consumableAssignmentsData?.data?.items ?? []

    deviceItems.forEach((a) => {
      const device = deviceById.get(a.inventory.id)
      const chip: AssignmentChip = {
        id: a.id,
        label: device ? `${device.name} · ${a.inventory.serialNumber ?? ''}` : (a.inventory.serialNumber ?? a.inventory.id),
        isConsumable: false,
        color: device?.color ?? null,
      }
      const list = map.get(a.assignee.id) ?? []
      list.push(chip)
      map.set(a.assignee.id, list)
    })

    consumableItems.forEach((a) => {
      const consumable = consumableById.get(a.inventory.id)
      const chip: AssignmentChip = {
        id: a.id,
        label: consumable ? `${consumable.name} · ×${a.quantity}` : `${a.inventory.batch ?? a.inventory.id} · ×${a.quantity}`,
        isConsumable: true,
        color: consumable?.color ?? null,
      }
      const list = map.get(a.assignee.id) ?? []
      list.push(chip)
      map.set(a.assignee.id, list)
    })

    return map
  }, [deviceAssignmentsData, consumableAssignmentsData, deviceById, consumableById])

  const availableDevices = useMemo(() => {
    const items = devicesData?.data?.items ?? []
    const held = new Set((deviceAssignmentsData?.data?.items ?? []).map((a) => a.inventory.id))
    return items.filter((d) => d.status === 'available' && !held.has(d.id)).slice(0, 30)
  }, [devicesData, deviceAssignmentsData])
  const availableCount = useMemo(() => {
    const items = devicesData?.data?.items ?? []
    const held = new Set((deviceAssignmentsData?.data?.items ?? []).map((a) => a.inventory.id))
    return items.filter((d) => d.status === 'available' && !held.has(d.id)).length
  }, [devicesData, deviceAssignmentsData])

  const [showDirectAssignment, setShowDirectAssignment] = useState(false)
  const [exporting, setExporting] = useState(false)
  // Attempts to export all device assignments (capped at 1000, warns if truncated), not just what's rendered.
  const handleExport = async () => {
    setExporting(true)
    try {
      const [assignmentsRes, devicesRes, geoProfilesRes] = await Promise.all([
        inventoryAssignmentService.searchInventoryAssignments({ inventoryType: 'InventoryDevice', limit: '1000' }),
        inventoryDeviceService.searchInventoryDevices({ limit: '1000' }),
        geoProfileService.searchGeoProfiles({ type: 'fo', limit: '1000' }),
      ])
      const deviceByIdFull = new Map(devicesRes.data.items.map((d) => [d.id, d]))
      const geoProfileByRole = new Map(geoProfilesRes.data.items.map((g) => [g.role, g]))
      const rows: AssignedDeviceRow[] = assignmentsRes.data.items.map((assignment) => ({
        assignment,
        device: deviceByIdFull.get(assignment.inventory.id) ?? null,
        geoProfile: geoProfileByRole.get(assignment.assignee.id) ?? null,
      }))
      const truncated = [
        assignmentsRes.data.items.length < assignmentsRes.data.count ? 'assignments' : null,
        devicesRes.data.items.length < devicesRes.data.count ? 'devices' : null,
        geoProfilesRes.data.items.length < geoProfilesRes.data.count ? 'FO geo-profiles' : null,
      ].filter((v): v is string => v !== null)
      if (truncated.length > 0) {
        toast.warning(`Export is incomplete: too many ${truncated.join(', ')} to include all — some rows may show missing data.`)
      }
      downloadAssignedDevicesCsv(rows, `device-assignments-${new Date().toISOString().slice(0, 10)}.csv`)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to export assignments.'))
    } finally {
      setExporting(false)
    }
  }

  if (!canManage) {
    return (
      <div className="px-4 py-10 text-center text-[13px] rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
        You don't have permission to view assignments.
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
          Who currently holds what, by field officer.
        </p>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowDirectAssignment(true)}
              disabled={reportLoading || !!reportError || fieldOfficers.length === 0}
            >
              <FiUserPlus size={14} /> Assign to FO
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="shrink-0">
              <FiDownload size={14} /> {exporting ? 'Exporting…' : 'Export devices'}
            </Button>
          </div>
          {reportError && (
            <div className="flex items-center gap-2 text-[12px] text-danger">
              <span>Couldn't load field officers.</span>
              <Button variant="outline" size="sm" onClick={() => refetchReport()}>Retry</Button>
            </div>
          )}
        </div>
      </div>

      {showDirectAssignment && (
        <DirectAssignmentModal fieldOfficers={fieldOfficers} onClose={() => setShowDirectAssignment(false)} />
      )}

      {!isLoading && !error && truncatedLabels.length > 0 && (
        <p className="text-[12px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>
          Showing the first 1,000 {truncatedLabels.join(', ')} — some chips, HQ locations, or available-device counts may be incomplete.
        </p>
      )}

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading assignments…" errorLabel="Failed to load assignments. Please try again." onRetry={retryGrid}>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)' }}>
          {fieldOfficers.map((fo) => {
            const chips = chipsByAssignee.get(fo.role) ?? []
            return (
              <div key={fo.role} className="grid" style={{ gridTemplateColumns: '220px 1fr', borderBottom: '1px solid var(--qms-border)' }}>
                <div className="p-3" style={{ background: 'rgba(0,0,0,.02)' }}>
                  <div className="text-[12px] font-bold" style={{ color: 'var(--qms-text)' }}>{fo.name}</div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{hqByRole.get(fo.role) ?? '—'}</div>
                </div>
                <div className="p-3 flex flex-wrap gap-1.5 items-start content-start">
                  {chips.length === 0 ? (
                    <span className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>— No units assigned —</span>
                  ) : (
                    chips.map((chip) => (
                      <span
                        key={chip.id}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                        style={chip.color
                          ? { background: `${chip.color}1a`, color: chip.color }
                          : { background: 'rgba(59,109,255,.1)', color: 'var(--qms-brand-700, #2451f0)' }}
                      >
                        {chip.isConsumable ? <FiPackage size={11} /> : <FiCpu size={11} />} {chip.label}
                      </span>
                    ))
                  )}
                </div>
              </div>
            )
          })}

          {fieldOfficers.length === 0 && (
            <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              No field officers found.
            </div>
          )}

          <div className="grid" style={{ gridTemplateColumns: '220px 1fr' }}>
            <div className="p-3" style={{ background: 'rgba(0,0,0,.02)' }}>
              <div className="text-[12px] font-bold" style={{ color: 'var(--qms-text)' }}>In hubs / available</div>
              <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{availableCount} devices</div>
            </div>
            <div className="p-3 flex flex-wrap gap-1.5 items-start content-start">
              {availableDevices.length === 0 ? (
                <span className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>— None —</span>
              ) : (
                <>
                  {availableDevices.map((d) => (
                    <span
                      key={d.id}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}
                    >
                      <FiHome size={11} /> {d.item?.name ?? d.item?.id ?? 'Device'} · {d.serialNumber}
                    </span>
                  ))}
                  {availableCount > 30 && (
                    <span className="text-[11px] px-2 py-1" style={{ color: 'var(--qms-text-muted)' }}>+{availableCount - 30} more</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </QueryStateBlock>
    </div>
  )
}

export default InventoryAssignmentsPanel
