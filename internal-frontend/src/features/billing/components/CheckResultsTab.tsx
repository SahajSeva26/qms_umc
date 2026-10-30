import { useState } from 'react'
import { FiCheckSquare } from 'react-icons/fi'
import { useEligibleInvoiceCamps } from '@/features/billing/hooks/useEligibleInvoiceCamps'
import { useScreenings } from '@/features/clinical/screening/hooks/useScreenings'
import ScreeningCrossCheckRow from '@/features/billing/components/ScreeningCrossCheckRow'
import BillingProjectPicker from '@/features/billing/components/BillingProjectPicker'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import PaginationControls from '@/components/ui/PaginationControls'
import { usePagination } from '@/hooks/usePagination'
import { formatDate } from '@/utils/formatters'

const PAGE_SIZE = 20

// Lets someone cross-check a camp's recorded patients/screenings/test results before the camp
// gets drafted into an invoice. Reuses the same "project -> billable camps" picker the Generate
// Invoice tab uses (useEligibleInvoiceCamps), since screenings are camp-scoped, not
// project-scoped, on the backend — there's no single endpoint that returns every screening
// across a project's camps in one call.
const CheckResultsTab = () => {
  const [projectId, setProjectId] = useState('')
  const [projectLabel, setProjectLabel] = useState('')
  const [campId, setCampId] = useState('')

  const { data: camps, isLoading: campsLoading, error: campsError, refetch: refetchCamps } = useEligibleInvoiceCamps(projectId || undefined)

  const handleProjectChange = (id: string, label: string) => {
    setProjectId(id)
    setProjectLabel(label)
    setCampId('')
  }

  return (
    <div>
      <div
        className="rounded-xl border p-3.5 mb-3 flex items-center gap-3 flex-wrap"
        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
      >
        <div className="flex items-center gap-1.5 font-extrabold text-[13px]" style={{ color: 'var(--qms-text)' }}>
          <FiCheckSquare size={14} /> Check camp results
        </div>
        <div className="w-80">
          <BillingProjectPicker value={projectId} label={projectLabel} onChange={handleProjectChange} />
        </div>
        {projectId && (
          <div className="w-80">
            <select
              value={campId}
              onChange={(e) => setCampId(e.target.value)}
              disabled={campsLoading || !!campsError}
              className="w-full h-9 rounded-lg border px-2.5 text-[13px]"
              style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)', color: 'var(--qms-text)' }}
            >
              <option value="">
                {campsLoading ? 'Loading camps…' : campsError ? 'Could not load camps' : 'Select a camp…'}
              </option>
              {(camps ?? []).map((camp) => (
                <option key={camp.id} value={camp.id}>
                  {camp.code} — {formatDate(camp.date)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!projectId && (
        <div className="rounded-xl border p-6 text-center text-[13px]" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          Pick a project above to see its billable camps.
        </div>
      )}

      {projectId && !campsLoading && !campsError && (camps ?? []).length === 0 && (
        <div className="rounded-xl border p-6 text-center text-[13px]" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          No billable, closed or cancelled-charged camps are available for this project yet.
        </div>
      )}

      {projectId && campsError && (
        <div className="flex items-center justify-between gap-3 text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          <span>Couldn't load camps for this project.</span>
          <button onClick={() => refetchCamps()} className="shrink-0 underline font-semibold">Retry</button>
        </div>
      )}

      {projectId && campId && <CampCrossCheckPanel campId={campId} />}

      {projectId && !campId && !campsLoading && !campsError && (camps ?? []).length > 0 && (
        <div className="rounded-xl border p-6 text-center text-[13px]" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          Pick a camp above to review its recorded patients.
        </div>
      )}
    </div>
  )
}

interface CampCrossCheckPanelProps {
  campId: string
}

const CampCrossCheckPanel = ({ campId }: CampCrossCheckPanelProps) => {
  const { page, setPage, totalPages } = usePagination(PAGE_SIZE)
  const { data, isLoading, error, refetch } = useScreenings({ camp: campId, page: String(page), limit: String(PAGE_SIZE) })
  const screenings = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
      <div className="flex items-center justify-between gap-2 flex-wrap px-3.5 py-3" style={{ borderBottom: '1px solid var(--qms-border)' }}>
        <div>
          <div className="font-extrabold text-[13px]" style={{ color: 'var(--qms-text)' }}>Recorded patients</div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
            {totalCount} patient{totalCount === 1 ? '' : 's'} at this camp — verify before drafting an invoice
          </div>
        </div>
      </div>

      <div className="p-3.5">
        <QueryStateBlock
          isLoading={isLoading}
          error={error}
          loadingLabel="Loading recorded patients…"
          errorLabel="Couldn't load screenings for this camp."
          onRetry={() => refetch()}
        >
          {screenings.length === 0 && (
            <p className="text-[13px] py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>
              No patients have been recorded at this camp yet.
            </p>
          )}
          {screenings.length > 0 && (
            <div className="space-y-2">
              {screenings.map((s) => <ScreeningCrossCheckRow key={s.id} screening={s} />)}
            </div>
          )}
        </QueryStateBlock>
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} disabled={isLoading} />
      </div>
    </div>
  )
}

export default CheckResultsTab
