import { useState } from 'react'
import { FiCheckSquare } from 'react-icons/fi'
import { DatePicker } from '@qms/ui'
import { useEligibleInvoiceCamps } from '@/features/billing/hooks/useEligibleInvoiceCamps'
import { useScreenings } from '@/features/clinical/screening/hooks/useScreenings'
import ScreeningCrossCheckRow from '@/features/billing/components/ScreeningCrossCheckRow'
import BillingProjectPicker from '@/features/billing/components/BillingProjectPicker'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import PaginationControls from '@/components/ui/PaginationControls'
import { usePagination } from '@/hooks/usePagination'
import { formatDate } from '@/utils/formatters'

const PAGE_SIZE = 20

// Navigation range only, not a business rule — mirrors CampsFilterBarReal's own constants/field class.
const FILTER_DATE_START_MONTH = new Date(new Date().getFullYear() - 10, 0)
const FILTER_DATE_END_MONTH = new Date(new Date().getFullYear() + 10, 11)
const DATE_FIELD_CLASS = 'w-36 h-auto rounded-lg px-2.5 py-1.5 text-[12px]'

// Screenings are camp-scoped, not project-scoped, on the backend — no single endpoint returns
// every screening across a project's camps, hence the project -> camp drill-down.
const CheckResultsTab = () => {
  const [projectId, setProjectId] = useState('')
  const [projectLabel, setProjectLabel] = useState('')
  const [campId, setCampId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const isInvalidRange = !!dateFrom && !!dateTo && dateTo < dateFrom

  const { data: camps, isLoading: campsLoading, error: campsError, refetch: refetchCamps } = useEligibleInvoiceCamps(
    !isInvalidRange ? (projectId || undefined) : undefined,
    { dateFrom, dateTo },
  )

  const handleProjectChange = (id: string, label: string) => {
    setProjectId(id)
    setProjectLabel(label)
    setCampId('')
  }

  // The selected camp may fall outside a newly-narrowed date range and silently disappear from
  // the dropdown — clear the selection so a stale, now-hidden camp's results don't keep showing.
  const handleDateFromChange = (v: string) => {
    setDateFrom(v)
    setCampId('')
  }
  const handleDateToChange = (v: string) => {
    setDateTo(v)
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
          <>
            <DatePicker
              value={dateFrom}
              onChange={handleDateFromChange}
              placeholder="Camp date from"
              className={DATE_FIELD_CLASS}
              startMonth={FILTER_DATE_START_MONTH}
              endMonth={FILTER_DATE_END_MONTH}
            />
            <DatePicker
              value={dateTo}
              onChange={handleDateToChange}
              placeholder="Camp date to"
              className={DATE_FIELD_CLASS}
              startMonth={FILTER_DATE_START_MONTH}
              endMonth={FILTER_DATE_END_MONTH}
            />
          </>
        )}
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

      {isInvalidRange && (
        <div className="text-[13px] rounded-xl px-3 py-2 mb-3 bg-danger-soft border border-danger text-danger">
          "Camp date to" can't be before "Camp date from" — pick a valid range.
        </div>
      )}

      {!isInvalidRange && !projectId && (
        <div className="rounded-xl border p-6 text-center text-[13px]" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          Pick a project above to see its billable camps.
        </div>
      )}

      {!isInvalidRange && projectId && !campsLoading && !campsError && (camps ?? []).length === 0 && (
        <div className="rounded-xl border p-6 text-center text-[13px]" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          {dateFrom || dateTo
            ? 'No billable, closed or cancelled-charged camps fall in this date range for this project.'
            : 'No billable, closed or cancelled-charged camps are available for this project yet.'}
        </div>
      )}

      {!isInvalidRange && projectId && campsError && (
        <div className="flex items-center justify-between gap-3 text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          <span>Couldn't load camps for this project.</span>
          <button onClick={() => refetchCamps()} className="shrink-0 underline font-semibold">Retry</button>
        </div>
      )}

      {/* Keyed by campId so switching camps remounts the panel — usePagination's page state must
          not survive a camp switch, or a later page carried over to a smaller camp can look empty. */}
      {!isInvalidRange && projectId && campId && <CampCrossCheckPanel key={campId} campId={campId} />}

      {!isInvalidRange && projectId && !campId && !campsLoading && !campsError && (camps ?? []).length > 0 && (
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
