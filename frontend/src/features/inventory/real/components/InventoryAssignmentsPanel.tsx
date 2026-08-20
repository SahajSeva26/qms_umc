import { useState } from 'react'
import { usePermission } from '@/hooks/usePermission'
import { useInventoryAssignments } from '@/features/inventory/real/hooks/useInventoryAssignments'
import { useFieldOfficerRoles } from '@/features/inventory/real/hooks/useFieldOfficerRoles'
import { truncateIdentifier } from '@/features/inventory/real/utils/truncateIdentifier'
import type { InventoryAssignmentType } from '@/types/inventoryAssignment.types'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { usePagination } from '@/hooks/usePagination'

const PAGE_SIZE = 10

// Read-only — rows only ever appear/disappear via the FO refill/return
// request lifecycle (see inventory-request.service.ts's adjustHolding calls). No manual create/edit/delete path exists here by design.
const InventoryAssignmentsPanel = () => {
  // GET /role-types needs tenant:manage/tenant:admin, not an inventory-* code — a stock Inventory Manager holds neither.
  const { hasAnyPermission } = usePermission()
  const canViewFieldOfficers = hasAnyPermission(['tenant:manage', 'tenant:admin'])
  const { roles: foRoles } = useFieldOfficerRoles(canViewFieldOfficers)

  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<InventoryAssignmentType | 'ALL'>('ALL')
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)

  const { data, isLoading, error, refetch } = useInventoryAssignments({
    assignee: assigneeFilter === 'ALL' ? undefined : assigneeFilter,
    inventoryType: typeFilter === 'ALL' ? undefined : typeFilter,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const items = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
          {!isLoading && !error ? `${totalCount} total` : 'Who currently holds what.'}
        </p>
      </div>

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
    </div>
  )
}

export default InventoryAssignmentsPanel
