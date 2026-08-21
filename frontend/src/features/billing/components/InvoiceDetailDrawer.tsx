import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ProjectEntity } from '@/types/project.types'
import { useInvoice } from '@/features/billing/hooks/useInvoice'
import { useInvoiceLineItems } from '@/features/billing/hooks/useInvoiceLineItems'
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
  project: ProjectEntity | null
  onClose: () => void
  // Refetches the parent page's billing project cache — awaited before
  // opening AddCampToInvoiceDialog so the campCost it displays is confirmed
  // current, not whatever happened to still be cached (up to 5 minutes
  // stale, per useBillingProject's default staleTime). Typed to at least the
  // `isError` field so handleOpenAddCamp can tell a failed refetch apart
  // from a successful one — this is always useBillingProject's own `refetch`
  // (a QueryObserverResult-returning function) in practice.
  onRefetchProject: () => Promise<{ isError: boolean }>
}

// Reuses the SideDrawer pattern from ProjectDetailDrawer.tsx. `project` is
// passed in by the caller (already known from the page's selected project)
// so this drawer doesn't need its own project fetch just to label camps —
// only used for the "Add camp" dialog's campCost prop.
const InvoiceDetailDrawer = ({ invoiceId, project, onClose, onRefetchProject }: InvoiceDetailDrawerProps) => {
  const { data, isLoading, error, refetch } = useInvoice(invoiceId ?? undefined)
  const invoice = data?.data ?? null
  const { hasAnyPermission } = usePermission()
  const { page, setPage, pageSize, totalPages, resetToFirstPage } = usePagination(LINE_ITEM_PAGE_SIZE)
  const [addCampOpen, setAddCampOpen] = useState(false)
  const [addCampOpening, setAddCampOpening] = useState(false)
  const [stageDialogOpen, setStageDialogOpen] = useState(false)
  const [addSubmitting, setAddSubmitting] = useState(false)

  // Read inside handleOpenAddCamp's awaited continuation to detect the
  // `project` prop changing (parent switched projects) WHILE the refetch
  // below was in flight. `project` itself can't be used for this comparison
  // — handleOpenAddCamp is redefined every render, so the specific closure
  // instance that's executing still only ever sees the `project` value from
  // the render where it was created and invoked; comparing it against
  // itself can never detect a later change. A ref, updated every render, is
  // what actually reflects the LIVE prop value at the moment the check runs.
  const projectRef = useRef(project)
  useEffect(() => {
    projectRef.current = project
  }, [project])

  const handleOpenAddCamp = async () => {
    setAddCampOpening(true)
    const targetProjectId = project?.id
    try {
      const result = await onRefetchProject()
      // Same two failure modes as InvoicesPage's handleOpenGenerate: don't
      // open on a failed refetch, and don't open if the `project` prop
      // itself changed (parent switched projects) while this was in flight
      // — that would open on a project this refetch never actually confirmed.
      if (result.isError || projectRef.current?.id !== targetProjectId) return
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

  // Kept in sync after every render so the queued remove callback below
  // always starts from the current page (setPage from an earlier queued
  // remove can change it before this one's turn comes up).
  const pageRef = useRef(page)
  useEffect(() => {
    pageRef.current = page
  }, [page])

  const removeLineItem = useRemoveInvoiceLineItem(invoiceId ?? '')
  // Removes are serialized (one in-flight at a time across the whole
  // drawer, not per-line) rather than merely double-click-guarded per line.
  // Two concurrent removes on the same page each computed "am I the last
  // item on this page?" from their own stale `lineItems` snapshot and could
  // both answer "no" even though together they empty the page — clamping
  // per-click can't see the other click's effect. Serializing means the
  // second remove's turn only starts once the first's mutation has fired
  // AND an explicit refetch (awaited here, not left to invalidateQueries'
  // fire-and-forget background refetch) has returned the fresh count.
  const removingIdsRef = useRef<Set<string>>(new Set())
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const removeQueueRef = useRef<Promise<void>>(Promise.resolve())

  // This is one persistent component instance reused across every invoice
  // the user opens — without resetting these, a removal still in flight for
  // invoice A when the user closes and opens invoice B would keep running
  // in B's context: A's queued callback would call B's refetchLineItems/
  // setPage (re-created fresh for B), silently touching B's pagination for
  // a removal that was never about B's data.
  //
  // invoiceIdRef (read inside handleRemove's callback via closure) lets
  // that in-flight work detect the drawer has moved on and skip touching
  // shared state — refs written inside an effect, the sanctioned pattern
  // this repo's lint rules allow (mirrors the pre-existing pageRef above).
  const invoiceIdRef = useRef(invoiceId)
  useEffect(() => {
    invoiceIdRef.current = invoiceId
    removeQueueRef.current = Promise.resolve()
    removingIdsRef.current = new Set()
  }, [invoiceId])

  // removingIds is real React state (drives the Remove buttons' disabled
  // prop), so it can't be reset from the ref-only effect above without an
  // extra render lagging behind the invoice switch — adjusted during render
  // instead (React's documented pattern; see GenerateInvoiceDialog's
  // identical `lastCamps` technique), comparing against a tracked previous
  // id in state, never a ref, since this repo's lint rules reject both
  // calling a state setter inside an effect AND touching a ref during render.
  const [lastInvoiceId, setLastInvoiceId] = useState(invoiceId)
  if (invoiceId !== lastInvoiceId) {
    setLastInvoiceId(invoiceId)
    setRemovingIds(new Set())
  }

  // Shared by both the success and failure paths of a remove — a failed
  // remove (e.g. 404 because another user already deleted that exact line)
  // still needs the line list reconciled: the stale line must not keep
  // showing, and the page must not strand the user on a now-invalid page
  // (e.g. after Retry on a line-items error) once the fresh count comes in.
  const refreshLineStateAndClampPage = async () => {
    // Explicitly await the refetch and read ITS result — invalidateQueries()
    // inside the mutation's onSuccess is fire-and-forget, so mutateAsync
    // resolving does NOT mean the fresh count has landed yet.
    const fresh = await refetchLineItems()
    const freshCount = fresh.data?.data?.count ?? 0
    const currentPage = pageRef.current
    if (currentPage > 1 && freshCount <= (currentPage - 1) * pageSize) {
      setPage(currentPage - 1)
    }
  }

  const handleRemove = (lineItemId: string, campLabel: string) => {
    if (removingIdsRef.current.has(lineItemId)) return
    if (!window.confirm(`Remove ${campLabel} from this invoice?`)) return
    removingIdsRef.current.add(lineItemId)
    setRemovingIds(new Set(removingIdsRef.current))
    const startedForInvoiceId = invoiceId

    // Chain onto the queue so a second click (on a different line) waits for
    // the first remove's mutation AND its explicit refetch to fully settle
    // before this one even starts.
    removeQueueRef.current = removeQueueRef.current.then(async () => {
      try {
        await removeLineItem.mutateAsync(lineItemId)
        // If the drawer has since moved on to a different invoice (closed
        // and reopened elsewhere while this was in flight), the mutation
        // itself already succeeded server-side — nothing to undo — but
        // reconciling here would touch the NEW invoice's page/line state,
        // which this remove was never actually about. Skip the toast and
        // reconciliation, the useEffect above already reset this drawer's
        // queue/removingIds for the new invoice.
        if (invoiceIdRef.current !== startedForInvoiceId) return
        toast.success('Camp removed from invoice')
        await refreshLineStateAndClampPage()
      } catch (err) {
        if (invoiceIdRef.current !== startedForInvoiceId) return
        toast.error(getApiErrorMessage(err, 'Could not remove this line — try again.'))
        // A 409 here usually means another actor moved this invoice out of
        // draft since this drawer last fetched it — refetch so the stale
        // DRAFT pill/Add-Remove buttons don't keep contradicting the toast.
        refetch()
        // Also reconcile the line list itself — a failed remove can mean the
        // line is already gone server-side (deleted by someone else), so the
        // drawer must not keep showing it as still present, and the page
        // must not strand the user on an invalid page for the fresh count.
        await refreshLineStateAndClampPage()
      } finally {
        // Only this drawer's OWN removingIds (for startedForInvoiceId) should
        // be touched — if the invoice already changed, the useEffect above
        // already cleared removingIds for the new invoice; re-clearing here
        // with a leftover reference to the old id would be a harmless no-op
        // at worst, so this stays unconditional for simplicity.
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
  // invoice:manage, which is a different permission namespace entirely
  // (confirmed directly against invoiceLineItem.routes.ts's AuthorizeMiddleware
  // arrays). tenant:manage is the blanket override every route accepts.
  const canReadLines = hasAnyPermission(['invoice-line-item:search', 'invoice-line-item:manage', 'tenant:manage'])
  const canAddLine = hasAnyPermission(['invoice-line-item:create', 'invoice-line-item:manage', 'tenant:manage'])
  const canRemoveLine = hasAnyPermission(['invoice-line-item:delete', 'invoice-line-item:manage', 'tenant:manage'])
  const canMoveStage = hasAnyPermission(['invoice:manage', 'tenant:manage'])

  // A stage change (specifically approval) must never fire against a line
  // count that isn't confirmed current. isFetching (not just isLoading)
  // covers the background refetch React Query runs after any add/remove
  // invalidates this query — that window is exactly where a fast approval
  // could catch a stale, higher count right after the last camp was removed.
  // lineItemsError also counts as unsettled: React Query keeps the last
  // successful `data` on a failed refetch by default, so a network error
  // right after a delete can leave `lineItemsData` showing the OLD
  // (pre-deletion) count with isFetching already back to false — exactly
  // the state that let an empty invoice slip through approval. If this
  // viewer can't read line items at all (a real, narrow permission
  // combination — invoice:manage without invoice-line-item:*/tenant:manage),
  // lineItemsData never arrives and this check would block approval forever;
  // in that case defer entirely to the backend's own count check instead.
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
                  // Must go through the same clamp-aware helper as handleRemove,
                  // not a bare refetchLineItems() — otherwise recovering from a
                  // failed refresh via Retry can land on a page that's now out
                  // of range (e.g. the page emptied while this was erroring),
                  // showing a contradictory "Camps (N)" header over a false
                  // "No camps" body with no pagination back to the real data.
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

      {addCampOpen && invoice && project && (
        <AddCampToInvoiceDialog
          invoice={invoice}
          project={project}
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
