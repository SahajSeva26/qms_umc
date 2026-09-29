import { useMemo } from 'react'
import { FiUsers, FiHardDrive, FiAlertTriangle } from 'react-icons/fi'
import { useInventoryAssignmentReport } from '@/features/inventory/real/hooks/useInventoryAssignmentReport'
import { useInventoryAssignments } from '@/features/inventory/real/hooks/useInventoryAssignments'
import { usePagination } from '@/hooks/usePagination'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import InventoryReportKpiStrip, { type InventoryReportTile } from '@/features/inventory/real/components/InventoryReportKpiStrip'
import PaginationControls from '@/components/ui/PaginationControls'
import { expiryBand } from '@/features/inventory/real/utils/expiryBand'

const PAGE_SIZE = 10
// Cross-references each FO's consumable assignments for a real expiring-soon count (the report gives only totals).
const FETCH_LIMIT = '1000'

// The prototype's ₹ valuation columns are dropped — no price field exists on our real models (see ui-revisions.md).
const InventoryFoInventoryPanel = () => {
  const { report, isLoading: reportLoading, error: reportError, refetch: refetchReport } = useInventoryAssignmentReport(true)
  const { data: assignmentsData, isLoading: assignmentsLoading, error: assignmentsError, refetch: refetchAssignments } = useInventoryAssignments({ inventoryType: 'InventoryConsumable', limit: FETCH_LIMIT })
  const { page, setPage, totalPages } = usePagination(PAGE_SIZE)

  const isLoading = reportLoading || assignmentsLoading
  const error = reportError || assignmentsError
  const retry = () => {
    refetchReport()
    refetchAssignments()
  }

  // Scanned from a single capped 1000-row fetch, not a real aggregation — undercounts past the cap.
  const assignmentsTruncated = (assignmentsData?.data?.items.length ?? 0) < (assignmentsData?.data?.count ?? 0)

  const expiringSoonByAssignee = useMemo(() => {
    const counts = new Map<string, number>()
    const items = assignmentsData?.data?.items ?? []
    items.forEach((a) => {
      const band = expiryBand(a.inventory.expiryDate)
      if (band && (band.code === 'EXPIRED' || band.code === 'RED' || band.code === 'ORANGE')) {
        counts.set(a.assignee.id, (counts.get(a.assignee.id) ?? 0) + 1)
      }
    })
    return counts
  }, [assignmentsData])

  const rows = report?.fieldOfficers ?? []
  const totalDevices = rows.reduce((sum, r) => sum + r.devicesHeld, 0)
  const totalExpiringSoon = rows.reduce((sum, r) => sum + (expiringSoonByAssignee.get(r.role) ?? 0), 0)

  const reportTiles: InventoryReportTile[] = [
    { key: 'fos', label: 'Field Officers', value: report?.summary.fieldOfficersHoldingInventory ?? 0, tone: 'brand', icon: FiUsers },
    { key: 'devices', label: 'Devices out', value: totalDevices, tone: 'teal', icon: FiHardDrive },
    { key: 'expiring', label: 'Expiring kits (< 90d)', value: totalExpiringSoon, tone: totalExpiringSoon > 0 ? 'amber' : 'emerald', icon: FiAlertTriangle },
  ]

  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      <div className="mb-3">
        <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
          What each field officer currently holds, organisation-wide.
        </p>
      </div>

      <InventoryReportKpiStrip tiles={reportTiles} isLoading={isLoading} error={error} canView skeletonCount={4} />

      {!isLoading && !error && assignmentsTruncated && (
        <p className="text-[12px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>
          Showing the first 1,000 consumable assignments — "Expiring soon" counts may be undercounted past that.
        </p>
      )}

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading field officer inventory…" errorLabel="Failed to load field officer inventory. Please try again." onRetry={retry}>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  {['Field officer', 'Code', 'Devices', 'Consumable units', 'Awaiting approval', 'Awaiting receipt', 'Expiring soon'].map((h) => (
                    <th
                      key={h}
                      className={`font-bold text-[11px] uppercase tracking-wider px-4 py-2 ${h === 'Field officer' || h === 'Code' ? 'text-left' : 'text-right'}`}
                      style={{ color: 'var(--qms-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((fo) => {
                  const expiringSoon = expiringSoonByAssignee.get(fo.role) ?? 0
                  return (
                    <tr key={fo.role} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                      <td className="px-4 py-2 max-w-xs truncate" style={{ color: 'var(--qms-text)' }} title={fo.name}>{fo.name}</td>
                      <td className="px-4 py-2 font-mono" style={{ color: 'var(--qms-text-muted)' }}>{fo.code}</td>
                      <td className="px-4 py-2 text-right font-mono" style={{ color: 'var(--qms-text)' }}>{fo.devicesHeld}</td>
                      <td className="px-4 py-2 text-right font-mono" style={{ color: 'var(--qms-text)' }}>{fo.consumableUnitsHeld}</td>
                      <td className="px-4 py-2 text-right font-mono" style={{ color: 'var(--qms-text)' }}>{fo.awaitingApproval}</td>
                      <td className="px-4 py-2 text-right font-mono" style={{ color: 'var(--qms-text)' }}>{fo.awaitingReceipt}</td>
                      <td className="px-4 py-2 text-right">
                        {expiringSoon > 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(249,115,22,.16)', color: '#c2410c' }}>
                            {expiringSoon} soon
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,.15)', color: '#059669' }}>OK</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              No field officers found.
            </div>
          )}
        </div>
        <PaginationControls page={page} totalPages={totalPages(rows.length)} onPageChange={setPage} />
      </QueryStateBlock>
    </div>
  )
}

export default InventoryFoInventoryPanel
