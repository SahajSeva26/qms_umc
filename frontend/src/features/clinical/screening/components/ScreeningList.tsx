import { useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import PaginationControls from '@/components/ui/PaginationControls'
import { usePagination } from '@/hooks/usePagination'
import { useScreenings } from '@/features/clinical/screening/hooks/useScreenings'
import { useCreateScreening } from '@/features/clinical/screening/hooks/useCreateScreening'
import { screeningService } from '@/features/clinical/screening/screening.service'
import PatientPicker from '@/features/clinical/patient/components/PatientPicker'
import { SCREENING_STATUS_LABEL, type ScreeningEntity } from '@/features/clinical/screening/screening.types'

const PAGE_SIZE = 20

interface ScreeningListProps {
  campId: string
  canWrite: boolean
  onOpen: (screening: ScreeningEntity) => void
}

const patientName = (screening: ScreeningEntity) => {
  const patient = screening.patient
  if (!patient) return 'Unknown patient'
  return [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ')
}

const ScreeningList = ({ campId, canWrite, onOpen }: ScreeningListProps) => {
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const { data, isLoading, error, refetch } = useScreenings({ camp: campId, page: String(page), limit: String(PAGE_SIZE) })
  const screenings = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0
  const createMutation = useCreateScreening()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [patientId, setPatientId] = useState('')
  const [patientLabel, setPatientLabel] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)

  const handlePick = async (id: string, label: string) => {
    setPatientId(id)
    setPatientLabel(label)
    setCreateError(null)

    // Point-check this one patient against this one camp instead of
    // prefetching every screening at this camp just to build an exclusion
    // list — that scaled with camp size on every page load regardless of
    // whether "New screening" was even open. camp+patient is an always-on,
    // unconditional backend filter (screening.service.ts's search()), so a
    // single limit=1 lookup is enough to know whether this patient is
    // already screened here.
    setIsCheckingDuplicate(true)
    try {
      const existing = await screeningService.searchScreenings({ camp: campId, patient: id, limit: '1' })
      if ((existing.data?.count ?? 0) > 0) {
        setCreateError(`${label.split(' · ')[0] || 'This patient'} has already been screened at this camp.`)
        return
      }
    } catch {
      setCreateError('Could not verify this patient has not already been screened. Try again.')
      return
    } finally {
      setIsCheckingDuplicate(false)
    }

    createMutation.mutate(
      { patient: id, camp: campId },
      {
        onSuccess: () => {
          setPickerOpen(false)
          setPatientId('')
          setPatientLabel('')
          resetToFirstPage()
        },
        onError: (err) => {
          const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          setCreateError(message || 'Could not create this screening.')
        },
      },
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>{totalCount} screening{totalCount === 1 ? '' : 's'}</h2>
        {canWrite && (
          <Button size="sm" onClick={() => setPickerOpen((v) => !v)}>
            <FiPlus size={13} /> New screening
          </Button>
        )}
      </div>

      {pickerOpen && (
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)' }}>
          <PatientPicker
            value={patientId}
            label={patientLabel}
            onChange={handlePick}
            disabled={isCheckingDuplicate || createMutation.isPending}
          />
          {createError && (
            <div className="text-[11px] rounded-lg px-2.5 py-1.5 mt-2 bg-danger-soft border border-danger text-danger">{createError}</div>
          )}
        </div>
      )}

      <QueryStateBlock
        isLoading={isLoading}
        error={error}
        loadingLabel="Loading screenings…"
        errorLabel="Failed to load screenings. Please try again."
        onRetry={() => refetch()}
      >
        {screenings.length === 0 ? (
          <div className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No screenings yet.</div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)' }}>
            {screenings.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onOpen(s)}
                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left border-t first:border-t-0 hover:bg-(--qms-surface-hover)"
                style={{ borderColor: 'var(--qms-border)' }}
              >
                <div>
                  <div className="text-[13px] font-semibold" style={{ color: 'var(--qms-text)' }}>{patientName(s)}</div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{s.patient?.code} · {s.patient?.mobile}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.referral && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                      REFERRED
                    </span>
                  )}
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: s.status === 'completed' ? 'var(--success-soft)' : s.status === 'cancelled' ? 'var(--danger-soft)' : 'var(--qms-surface-strong)',
                      color: s.status === 'completed' ? 'var(--success)' : s.status === 'cancelled' ? 'var(--danger)' : 'var(--qms-text-muted)',
                    }}
                  >
                    {SCREENING_STATUS_LABEL[s.status].toUpperCase()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>
    </div>
  )
}

export default ScreeningList
