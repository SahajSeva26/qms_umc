import { useMemo, useState } from 'react'
import { FiDownload, FiUsers, FiUserCheck } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useInventoryAssignments } from '@/features/inventory/real/hooks/useInventoryAssignments'
import { useInventoryAssignmentReport } from '@/features/inventory/real/hooks/useInventoryAssignmentReport'
import { useFieldOfficerRoles } from '@/features/inventory/real/hooks/useFieldOfficerRoles'
import { truncateIdentifier } from '@/features/inventory/real/utils/truncateIdentifier'
import { inventoryAssignmentService } from '@/features/inventory/real/inventoryAssignment.service'
import { inventoryDeviceService } from '@/features/inventory/real/inventoryDevice.service'
import { geoProfileService } from '@/features/geo-profile/geoProfile.service'
import { downloadAssignedDevicesCsv, type AssignedDeviceRow } from '@/features/inventory/real/inventoryAssignment.export'
import type { InventoryAssignmentType } from '@/types/inventoryAssignment.types'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import InventoryReportKpiStrip, { type InventoryReportTile } from '@/features/inventory/real/components/InventoryReportKpiStrip'
import { usePagination } from '@/hooks/usePagination'
import { toast } from '@/components/ui/sonner'
import { getApiErrorMessage } from '@/utils/apiError'

const PAGE_SIZE = 10
const FO_ROSTER_PAGE_SIZE = 10

// Read-only — rows only ever appear/disappear via the FO refill/return
// request lifecycle (see inventory-request.service.ts's adjustHolding calls). No manual create/edit/delete path exists here by design.
const InventoryAssignmentsPanel = () => {
  // GET /role-types needs tenant:manage/tenant:admin, not an inventory-* code — a stock Inventory Manager holds neither.
  const { hasAnyPermission } = usePermission()
  const canViewFieldOfficers = hasAnyPermission(['tenant:manage', 'tenant:admin'])
  const canManage = hasAnyPermission(['inventory-assignment:manage'])
  const { roles: foRoles } = useFieldOfficerRoles(canViewFieldOfficers)

  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<InventoryAssignmentType | 'ALL'>('ALL')
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  // Independent from `page` above — the FO roster is a separate, unfiltered dataset and must never page together with the filtered assignment list.
  const { page: reportPage, setPage: setReportPage, totalPages: reportTotalPages } = usePagination(FO_ROSTER_PAGE_SIZE)

  const { data, isLoading, error, refetch } = useInventoryAssignments({
    assignee: assigneeFilter === 'ALL' ? undefined : assigneeFilter,
    inventoryType: typeFilter === 'ALL' ? undefined : typeFilter,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const items = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  const { report, isLoading: reportLoading, error: reportError } = useInventoryAssignmentReport(canManage)
  const fieldOfficers = report?.fieldOfficers ?? []
  // Derived, not stored — a refetch with fewer FOs self-corrects next render, no useEffect needed.
  const safeReportPage = Math.min(reportPage, reportTotalPages(fieldOfficers.length))
  const pagedFieldOfficers = fieldOfficers.slice((safeReportPage - 1) * FO_ROSTER_PAGE_SIZE, safeReportPage * FO_ROSTER_PAGE_SIZE)

  const reportTiles = useMemo<InventoryReportTile[]>(() => {
    if (!report) return []
    return [
      { key: 'total-fos', label: 'Total Field Officers', value: report.summary.totalFieldOfficers, tone: 'brand', icon: FiUsers },
      { key: 'fos-holding', label: 'FOs Holding Inventory', value: report.summary.fieldOfficersHoldingInventory, tone: 'teal', icon: FiUserCheck },
    ]
  }, [report])

  const [exporting, setExporting] = useState(false)
  // Exports every device assignment, not just the current page. Calibration and FO
  // City are joined in separately — assignment search only returns slim refs.
  const handleExport = async () => {
    setExporting(true)
    try {
      const [assignmentsRes, devicesRes, geoProfilesRes] = await Promise.all([
        inventoryAssignmentService.searchInventoryAssignments({
          assignee: assigneeFilter === 'ALL' ? undefined : assigneeFilter,
          inventoryType: 'InventoryDevice',
          limit: '1000',
        }),
        inventoryDeviceService.searchInventoryDevices({ limit: '1000' }),
        geoProfileService.searchGeoProfiles({ type: 'fo', limit: '1000' }),
      ])
      const deviceById = new Map(devicesRes.data.items.map((d) => [d.id, d]))
      const geoProfileByRole = new Map(geoProfilesRes.data.items.map((g) => [g.role, g]))
      const rows: AssignedDeviceRow[] = assignmentsRes.data.items.map((assignment) => ({
        assignment,
        device: deviceById.get(assignment.inventory.id) ?? null,
        geoProfile: geoProfileByRole.get(assignment.assignee.id) ?? null,
      }))
      // Each of the 3 fetches is capped at limit:'1000' — a truncated devices/geoProfiles
      // fetch would otherwise silently null out the Status/Calibration/FO City join.
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

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
          {!isLoading && !error ? `${totalCount} total` : 'Who currently holds what.'}
        </p>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="shrink-0">
          <FiDownload size={14} /> {exporting ? 'Exporting…' : 'Export devices'}
        </Button>
      </div>

      <InventoryReportKpiStrip
        tiles={reportTiles}
        isLoading={reportLoading}
        error={reportError}
        canView={canManage}
        skeletonCount={2}
      />

      <div className="flex flex-wrap items-center gap-2 mb-3 sm:justify-end">
        {canViewFieldOfficers && (
          <Select value={assigneeFilter} onValueChange={(v) => { if (!v) return; setAssigneeFilter(v); resetToFirstPage() }}>
            <SelectTrigger className="w-56 text-[13px]">
              <SelectValue>{() => (assigneeFilter === 'ALL' ? 'All field officers' : foRoles.find((r) => r.id === assigneeFilter)?.name ?? assigneeFilter)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All field officers</SelectItem>
              {foRoles.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as InventoryAssignmentType | 'ALL'); resetToFirstPage() }}>
          <SelectTrigger className="w-40 text-[13px]">
            <SelectValue>{() => (typeFilter === 'ALL' ? 'All types' : typeFilter === 'InventoryDevice' ? 'Device' : 'Consumable')}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            <SelectItem value="InventoryDevice">Device</SelectItem>
            <SelectItem value="InventoryConsumable">Consumable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading assignments…" errorLabel="Failed to load assignments. Please try again." onRetry={refetch}>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  {['Field officer', 'Item', 'Type', 'Qty'].map((h) => (
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
                {items.map((assignment) => {
                  const identifier = assignment.inventory.serialNumber ?? assignment.inventory.batch ?? assignment.inventory.id
                  return (
                    <tr key={assignment.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                      <td className="px-4 py-2.5 max-w-xs truncate" style={{ color: 'var(--qms-text)' }} title={assignment.assignee.name}>
                        {assignment.assignee.name ?? assignment.assignee.id}
                      </td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--qms-text)' }} title={identifier}>{truncateIdentifier(identifier)}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{assignment.inventoryType === 'InventoryDevice' ? 'Device' : 'Consumable'}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>{assignment.quantity}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {items.length === 0 && (
            <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              No assignments found.
            </div>
          )}
        </div>
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>

      {canManage && !reportLoading && !reportError && report && (
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            All active field officers
          </p>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                    {['Name', 'Code', 'Devices Held', 'Consumable Units Held', 'Awaiting Approval', 'Awaiting Receipt'].map((h) => (
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
                  {pagedFieldOfficers.map((fo) => (
                    <tr key={fo.role} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                      <td className="px-4 py-2.5 max-w-xs truncate" style={{ color: 'var(--qms-text)' }} title={fo.name}>{fo.name}</td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--qms-text-muted)' }}>{fo.code}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>{fo.devicesHeld}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>{fo.consumableUnitsHeld}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>{fo.awaitingApproval}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>{fo.awaitingReceipt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {fieldOfficers.length === 0 && (
              <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
                No field officers found.
              </div>
            )}
          </div>
          <PaginationControls page={safeReportPage} totalPages={reportTotalPages(fieldOfficers.length)} onPageChange={setReportPage} />
        </div>
      )}
    </div>
  )
}

export default InventoryAssignmentsPanel
