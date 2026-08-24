import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useInvoice } from '@/features/billing/hooks/useInvoice'
import { useBillingProject } from '@/features/billing/hooks/useBillingProject'
import { useInvoiceLineItems, invoiceLineItemKeys } from '@/features/billing/hooks/useInvoiceLineItems'
import { useRemoveInvoiceLineItem } from '@/features/billing/hooks/useRemoveInvoiceLineItem'
import InvoiceStatusPill from '@/features/billing/components/InvoiceStatusPill'
import AddCampToInvoiceDialog from '@/features/billing/components/AddCampToInvoiceDialog'
import MoveInvoiceStageDialog from '@/features/billing/components/MoveInvoiceStageDialog'
import SideDrawer from '@/components/ui/SideDrawer'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import PaginationControls from '@/components/ui/PaginationControls'
import { Button } from '@/components/ui/button'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { formatDate, formatINRFull } from '@/utils/formatters'
import { toast } from '@/components/ui/sonner'
import { getApiErrorMessage } from '@/utils/apiError'

const LINE_ITEM_PAGE_SIZE = 10

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex justify-between gap-3 py-1.5 text-[13px]" style={{ borderBottom: '1px solid var(--qms-border)' }}>
    <span style={{ color: 'var(--qms-text-muted)' }}>{label}</span>
    <span className="text-right font-semibold" style={{ color: 'var(--qms-text)' }}>{value}</span>
  </div>
)

interface InvoiceDetailDrawerProps {
  invoiceId: string | null
  onClose: () => void
}

// Reuses the SideDrawer pattern from ProjectDetailDrawer.tsx. Resolves its
// own ProjectEntity (needed for campCost) — the list page's project filter is not a prerequisite.
const InvoiceDetailDrawer = ({ invoiceId, onClose }: InvoiceDetailDrawerProps) => {
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useInvoice(invoiceId ?? undefined)
  const invoice = data?.data ?? null
  const invoiceProjectId = invoice ? (typeof invoice.project === 'string' ? invoice.project : invoice.project._id) : undefined
  const {
    data: projectData,
    refetch: refetchProject,
  } = useBillingProject(invoiceProjectId)
  const project = projectData?.data ?? null
  const { hasAnyPermission } = usePermission()
  const { page, setPage, pageSize, totalPages, resetToFirstPage } = usePagination(LINE_ITEM_PAGE_SIZE)
  const [addCampOpen, setAddCampOpen] = useState(false)
  const [addCampOpening, setAddCampOpening] = useState(false)
  const [stageDialogOpen, setStageDialogOpen] = useState(false)
  const [addSubmitting, setAddSubmitting] = useState(false)

  // Identifies "this exact invoice session," bumped on every invoiceId
  // change (including reopening the SAME id) so async work below can detect a since-reopened session.
  const sessionTokenRef = useRef(0)
  useEffect(() => {
    sessionTokenRef.current += 1
  }, [invoiceId])

  const handleOpenAddCamp = async () => {
    setAddCampOpening(true)
    const startedForToken = sessionTokenRef.current
    try {
      const result = await refetchProject()
      // Refuse to open if the refetch failed, or if the session moved on
      // (even to the same invoiceId reopened) — either way it never confirmed what's displayed now.
      if (result.isError || sessionTokenRef.current !== startedForToken) return
      setAddCampOpen(true)
    } finally {
      setAddCampOpening(false)
    }
  }

  const {
    data: lineItemsData,
    isLoading: lineItemsLoading,
    isFetching: lineItemsFetching,
    error: lineItemsError,
    refetch: refetchLineItems,
  } = useInvoiceLineItems(
    { invoice: invoiceId ?? '', page: String(page), limit: String(pageSize) },
    !!invoiceId && hasAnyPermission(['invoice-line-item:search', 'invoice-line-item:manage', 'tenant:manage']),
  )
  const lineItems = lineItemsData?.data?.items ?? []
  const lineItemCount = lineItemsData?.data?.count ?? 0

  // Kept in sync so the queued remove callback below always reads the
  // current page, since an earlier queued remove's setPage can change it first.
  const pageRef = useRef(page)
  useEffect(() => {
    pageRef.current = page
  }, [page])

  const removeLineItem = useRemoveInvoiceLineItem(invoiceId ?? '')
  // Removes are serialized drawer-wide, not just per-line guarded — two
  // concurrent removes could each see a stale "not last item" snapshot and together empty the page.
  const removingIdsRef = useRef<Set<string>>(new Set())
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const removeQueueRef = useRef<Promise<void>>(Promise.resolve())

  // This component instance is reused across every invoice opened — without
  // resetting per session, an in-flight removal could touch the new session's pagination.
  useEffect(() => {
    removeQueueRef.current = Promise.resolve()
    removingIdsRef.current = new Set()
  }, [invoiceId])

  // removingIds is real state (drives Remove buttons' disabled prop), so
  // it's reset during render rather than lagging a render behind in a ref-only effect.
  const [lastInvoiceId, setLastInvoiceId] = useState(invoiceId)
  if (invoiceId !== lastInvoiceId) {
    setLastInvoiceId(invoiceId)
    setRemovingIds(new Set())
  }

  // Shared by both remove paths — even a failed remove (e.g. 404, already
  // deleted by someone else) needs the line list reconciled and the page clamped.
  const refreshLineStateAndClampPage = async () => {
    // Await and read the refetch's own result — onSuccess's invalidateQueries
    // is fire-and-forget, so mutateAsync resolving doesn't mean the fresh count has landed.
    const fresh = await refetchLineItems()
    const freshCount = fresh.data?.data?.count ?? 0
    const currentPage = pageRef.current
    // Clamp to the actual final page, not just one back — concurrent
    // deletions can drop the valid page count by more than one at once.
    const lastValidPage = Math.max(1, Math.ceil(freshCount / pageSize))
    if (currentPage > lastValidPage) {
      // Each page is a distinct query key — refetchLineItems() above never
      // touched the destination page's cache, so invalidate the whole scope to force a real refetch.
      queryClient.invalidateQueries({ queryKey: invoiceLineItemKeys.all })
      setPage(lastValidPage)
    }
  }

  const handleRemove = (lineItemId: string, campLabel: string) => {
    if (removingIdsRef.current.has(lineItemId)) return
    if (!window.confirm(`Remove ${campLabel} from this invoice?`)) return
    removingIdsRef.current.add(lineItemId)
    setRemovingIds(new Set(removingIdsRef.current))
    const startedForToken = sessionTokenRef.current

    // Chain onto the queue so a second click waits for the first remove's
    // mutation AND its refetch to fully settle first.
    removeQueueRef.current = removeQueueRef.current.then(async () => {
      try {
        await removeLineItem.mutateAsync(lineItemId)
        // If the session has since moved on, the mutation already succeeded
        // server-side, but reconciling now would touch the new session's state instead.
        if (sessionTokenRef.current !== startedForToken) return
        toast.success('Camp removed from invoice')
        await refreshLineStateAndClampPage()
      } catch (err) {
        if (sessionTokenRef.current !== startedForToken) return
        toast.error(getApiErrorMessage(err, 'Could not remove this line — try again.'))
        // A 409 here usually means another actor moved this invoice out of
        // draft — refetch so the DRAFT pill/buttons don't contradict the toast.
        refetch()
        await refreshLineStateAndClampPage()
      } finally {
        // Harmless no-op if the session already changed and the effect above
        // already cleared removingIds — kept unconditional for simplicity.
        removingIdsRef.current.delete(lineItemId)
        setRemovingIds(new Set(removingIdsRef.current))
      }
    })
  }

  const handleClose = () => {
    resetToFirstPage()
    onClose()
  }

  const isDraft = invoice?.status === 'draft'
  // Line-item routes accept invoice-line-item:* or tenant:manage — NOT
  // invoice:manage, a separate permission namespace (verified against invoiceLineItem.routes.ts).
  const canReadLines = hasAnyPermission(['invoice-line-item:search', 'invoice-line-item:manage', 'tenant:manage'])
  const canAddLine = hasAnyPermission(['invoice-line-item:create', 'invoice-line-item:manage', 'tenant:manage'])
  const canRemoveLine = hasAnyPermission(['invoice-line-item:delete', 'invoice-line-item:manage', 'tenant:manage'])
  const canMoveStage = hasAnyPermission(['invoice:manage', 'tenant:manage'])

  // Approval must never fire against an unconfirmed line count — isFetching
  // catches a background refetch, lineItemsError catches a stale pre-deletion `data`. Skipped if this viewer can't read lines at all.
  const lineItemsSettling = canReadLines && (lineItemsData === undefined || lineItemsFetching || !!lineItemsError)
  const canChangeStage = canMoveStage && !lineItemsSettling && removingIds.size === 0 && !addSubmitting

  return (
    <SideDrawer open={!!invoiceId} title={invoice ? invoice.code : ''} onClose={handleClose} widthClassName="max-w-lg">
      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading invoice…" errorLabel="Couldn't load this invoice." onRetry={() => refetch()}>
        {invoice && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <InvoiceStatusPill status={invoice.status} />
              {canMoveStage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStageDialogOpen(true)}
                  disabled={!canChangeStage}
                  title={canChangeStage ? undefined : 'Camps are still updating — try again in a moment.'}
                >
                  Change status
                </Button>
              )}
            </div>

            <div>
              <div className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Amounts</div>
              <Row label="Subtotal" value={formatINRFull(invoice.subtotal)} />
              <Row label="Tax" value={formatINRFull(invoice.tax)} />
              <Row label="Discount" value={formatINRFull(invoice.discount)} />
              <Row label="Total" value={formatINRFull(invoice.total)} />
              <Row label="Issue date" value={formatDate(invoice.issueDate)} />
              {invoice.dueDate && <Row label="Due date" value={formatDate(invoice.dueDate)} />}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--qms-text-muted)' }}>
                  Camps ({lineItemCount})
                </div>
                {isDraft && canAddLine && project && (
                  <Button variant="outline" size="sm" onClick={handleOpenAddCamp} disabled={addCampOpening}>
                    {addCampOpening ? 'Loading…' : 'Add camp'}
                  </Button>
                )}
              </div>

              {!canReadLines && (
                <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
                  You don't have permission to view this invoice's line items.
                </p>
              )}

              {canReadLines && (
                <QueryStateBlock
                  isLoading={lineItemsLoading}
                  error={lineItemsError}
                  loadingLabel="Loading camps…"
                  errorLabel="Couldn't load this invoice's camps."
                  // Must use the same clamp-aware helper as handleRemove — a
                  // bare refetch could land Retry on a now out-of-range page.
                  onRetry={() => refreshLineStateAndClampPage()}
                >
                  {lineItems.length === 0 && (
                    <p className="text-[13px] py-3" style={{ color: 'var(--qms-text-muted)' }}>
                      {isDraft ? 'No camps on this invoice yet — add one above.' : 'No camps on this invoice.'}
                    </p>
                  )}
                  {lineItems.map((line) => {
                    const campLabel = typeof line.camp === 'string' ? line.camp : line.camp.code
                    return (
                    <div key={line.id} className="flex items-center justify-between gap-2 py-1.5" style={{ borderBottom: '1px solid var(--qms-border)' }}>
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--qms-text)' }}>
                        {campLabel}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{formatINRFull(line.amount)}</span>
                        {isDraft && canRemoveLine && (
                          <Button variant="ghost" size="sm" onClick={() => handleRemove(line.id, campLabel)} disabled={removingIds.has(line.id)}>
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                    )
                  })}
                  <PaginationControls page={page} totalPages={totalPages(lineItemCount)} onPageChange={setPage} disabled={lineItemsLoading} />
                </QueryStateBlock>
              )}
            </div>

            {invoice.stageHistory.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Status history</div>
                {[...invoice.stageHistory].reverse().map((h, i) => (
                  <div key={i} className="text-[12px] py-1" style={{ color: 'var(--qms-text-muted)' }}>
                    {h.from} → {h.to} · {h.reason}
                    {(h.actor?.name || h.actor?.email) && <> · {h.actor.name || h.actor.email}</>}
                    {' · '}{formatDate(h.createdAt)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </QueryStateBlock>

      {/* isDraft reflects this drawer's own invoice query, invalidated by a
          failed add — passed as a prop so the dialog disables submission instead of unmounting. */}
      {addCampOpen && invoice && project && (
        <AddCampToInvoiceDialog
          invoice={invoice}
          project={project}
          isInvoiceDraft={isDraft}
          onClose={() => { setAddCampOpen(false); setAddSubmitting(false) }}
          onSubmittingChange={setAddSubmitting}
        />
      )}
      {stageDialogOpen && invoice && (
        <MoveInvoiceStageDialog invoice={invoice} lineItemCount={lineItemCount} onClose={() => setStageDialogOpen(false)} />
      )}
    </SideDrawer>
  )
}

export default InvoiceDetailDrawer
