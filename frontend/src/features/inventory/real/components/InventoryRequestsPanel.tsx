import { useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useInventoryRequests } from '@/features/inventory/real/hooks/useInventoryRequests'
import {
  INVENTORY_REQUEST_STATUSES,
  INVENTORY_REQUEST_STATUS_LABEL,
  INVENTORY_REQUEST_TYPE_LABEL,
  getAllowedStageActions,
} from '@/types/inventoryRequest.types'
import type { InventoryRequestEntity, InventoryRequestStatus, InventoryRequestType } from '@/types/inventoryRequest.types'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import EditInventoryRequestModal from '@/features/inventory/real/components/EditInventoryRequestModal'
import MoveRequestStageDialog from '@/features/inventory/real/components/MoveRequestStageDialog'
import { usePagination } from '@/hooks/usePagination'

const PAGE_SIZE = 10

const STATUS_STYLE: Record<InventoryRequestStatus, { bg: string; fg: string }> = {
  requested: { bg: 'rgba(245,158,11,.15)', fg: '#d97706' },
  approved: { bg: 'rgba(59,109,255,.14)', fg: 'var(--qms-brand-700, #2451f0)' },
  rejected: { bg: 'rgba(244,63,94,.15)', fg: '#e11d48' },
  received: { bg: 'rgba(16,185,129,.15)', fg: '#059669' },
  cancelled: { bg: 'var(--qms-surface-strong)', fg: 'var(--qms-text-soft)' },
}

// Unlike device/consumable/master, GET here requires inventory-request:search
// OR :manage — the list must never mount unguarded. :create is independent of :search, so the button can show even when the list can't load.
const InventoryRequestsPanel = () => {
  const { hasAnyPermission } = usePermission()
  const canSearch = hasAnyPermission(['inventory-request:search', 'inventory-request:manage'])
  const canCreate = hasAnyPermission(['inventory-request:create', 'inventory-request:manage'])
  const canUpdate = hasAnyPermission(['inventory-request:update', 'inventory-request:manage'])
  const canManage = hasAnyPermission(['inventory-request:manage'])

  const [typeFilter, setTypeFilter] = useState<InventoryRequestType | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<InventoryRequestStatus | 'ALL'>('ALL')
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const [editModal, setEditModal] = useState<{ open: boolean; request: InventoryRequestEntity | null }>({ open: false, request: null })
  const [stageAction, setStageAction] = useState<{ requestId: string; to: InventoryRequestStatus } | null>(null)

  const { data, isLoading, error, refetch } = useInventoryRequests(
    {
      type: typeFilter === 'ALL' ? undefined : typeFilter,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      page: String(page),
      limit: String(PAGE_SIZE),
    },
    canSearch,
  )
  const items = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
          {canSearch && !isLoading && !error ? `${totalCount} total` : 'Refill / return requests.'}
        </p>
        {canCreate && (
          <Button
            onClick={() => setEditModal({ open: true, request: null })}
            className="text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> New request
          </Button>
        )}
      </div>

      {!canSearch ? (
        <div className="px-4 py-10 text-center text-[13px] rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
          You don't have permission to view the request list.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as InventoryRequestType | 'ALL'); resetToFirstPage() }}>
              <SelectTrigger className="w-36 text-[13px]">
                <SelectValue>{() => (typeFilter === 'ALL' ? 'All types' : INVENTORY_REQUEST_TYPE_LABEL[typeFilter])}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="refill">Refill</SelectItem>
                <SelectItem value="return">Return</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as InventoryRequestStatus | 'ALL'); resetToFirstPage() }}>
              <SelectTrigger className="w-40 text-[13px]">
                <SelectValue>{() => (statusFilter === 'ALL' ? 'All statuses' : INVENTORY_REQUEST_STATUS_LABEL[statusFilter])}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {INVENTORY_REQUEST_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{INVENTORY_REQUEST_STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading requests…" errorLabel="Failed to load requests. Please try again." onRetry={refetch}>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                      {['Type', 'Status', 'Requested by', 'Lines', 'Created', 'Actions'].map((h) => (
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
                    {items.map((request) => {
                      const sc = STATUS_STYLE[request.status]
                      // A return withdraws stock immediately on create, but update() never
                      // reverses/reapplies that movement — editing a return would desync holdings from the ledger, so it's gated to refills only.
                      const editable = request.status === 'requested' && request.type === 'refill' && canUpdate
                      const actions = getAllowedStageActions(request.type, request.status, canManage)
                      return (
                        <tr
                          key={request.id}
                          onClick={() => editable && setEditModal({ open: true, request })}
                          className={editable ? 'cursor-pointer transition-colors hover:bg-(--qms-surface-hover)' : ''}
                          style={{ borderBottom: '1px solid var(--qms-border)' }}
                        >
                          <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>{INVENTORY_REQUEST_TYPE_LABEL[request.type]}</td>
                          <td className="px-4 py-2.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.fg }}>
                              {INVENTORY_REQUEST_STATUS_LABEL[request.status].toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 max-w-xs truncate" style={{ color: 'var(--qms-text-muted)' }} title={request.requestedBy.name}>
                            {request.requestedBy.name ?? request.requestedBy.id}
                          </td>
                          <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{request.lineItems.length}</td>
                          <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{request.createdAt.slice(0, 10)}</td>
                          <td className="px-4 py-2.5">
                            {canUpdate && actions.length > 0 && (
                              <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                                {actions.map((to) => (
                                  <button
                                    key={to}
                                    type="button"
                                    onClick={() => setStageAction({ requestId: request.id, to })}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors hover:bg-(--qms-surface-hover)"
                                    style={{ borderColor: 'var(--qms-border-strong)', color: 'var(--qms-text-soft)' }}
                                  >
                                    {INVENTORY_REQUEST_STATUS_LABEL[to]}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {items.length === 0 && (
                <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
                  No requests found.
                </div>
              )}
            </div>
            <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
          </QueryStateBlock>
        </>
      )}

      {editModal.open && (
        <EditInventoryRequestModal
          request={editModal.request}
          onClose={() => setEditModal({ open: false, request: null })}
        />
      )}

      {stageAction && (
        <MoveRequestStageDialog
          requestId={stageAction.requestId}
          to={stageAction.to}
          onClose={() => setStageAction(null)}
          onSuccess={() => setStageAction(null)}
        />
      )}
    </div>
  )
}

export default InventoryRequestsPanel
