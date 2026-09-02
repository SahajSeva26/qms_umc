import { useState } from 'react'
import { FiUserPlus } from 'react-icons/fi'
import AsyncPicker from '@/components/ui/AsyncPicker'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { usePatientPicker } from '@/features/clinical/patient/hooks/usePatientPicker'
import PatientRegistrationForm from '@/features/clinical/patient/components/PatientRegistrationForm'
import { ReviewCard, ReviewGrid, ReviewField } from '@/components/ui/ReviewCard'
import UserAvatar from '@/components/ui/UserAvatar'
import { Button } from '@/components/ui/button'
import { formatPatientDob, maskedMobile } from '@/features/clinical/patient/patient.utils'
import { PATIENT_GENDER_LABEL, type PatientEntity } from '@/features/clinical/patient/patient.types'

// Never a real patient id — must stay non-empty, since AsyncPicker renders
// results as buttons and needs a truthy value for each.
const REGISTER_NEW_PATIENT = '__register_new_patient__'

const patientLabel = (p: PatientEntity) => {
  const name = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')
  return `${name} · ${p.code} · ${p.mobile}`
}

const patientFullName = (p: PatientEntity) => [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')

interface PatientPickerProps {
  value: string
  label: string
  onChange: (id: string, label: string) => void
  /** Patient ids to exclude from results (e.g. already screened at this camp). */
  excludeIds?: string[]
  disabled?: boolean
}

// Every pick routes through a confirmation card before the caller is
// notified, so a mis-click or same-named person can be caught first.
const PatientPicker = ({ value, label, onChange, excludeIds = [], disabled }: PatientPickerProps) => {
  const { open, setOpen, containerRef } = useAsyncPickerState()
  const [query, setQuery] = useState('')
  const [registering, setRegistering] = useState(false)
  const [pendingPatient, setPendingPatient] = useState<PatientEntity | null>(null)
  const {
    items,
    isFetching,
    isFetchingNextPage,
    error,
    hasNextPage,
    fetchNextPage,
    isFetched,
    isDebouncing,
    hasSearchableQuery,
    isNameQuery,
    refetch,
  } = usePatientPicker(query, open)

  const results = items.filter((p) => !excludeIds.includes(p.id))

  // Checks `items` (raw results), not `results` (excludeIds filtered out): a
  // patient excluded here still exists globally, and mobile has no backend
  // uniqueness constraint — offering "register new" here would dupe them.
  const showRegisterOption =
    hasSearchableQuery && !isDebouncing && isFetched && !isFetching && !error && items.length === 0

  // Name searches only — mobile/code searches are already specific enough.
  const duplicateNameWarning = (() => {
    if (!isNameQuery) return null
    const seen = new Set<string>()
    for (const p of results) {
      const normalized = patientFullName(p).trim().replace(/\s+/g, ' ').toLowerCase()
      if (seen.has(normalized)) return true
      seen.add(normalized)
    }
    return false
  })()

  const resultsBanner = (duplicateNameWarning || hasNextPage) ? (
    <div className="px-2 py-1.5 space-y-1">
      {duplicateNameWarning && (
        <p className="text-[11px]" style={{ color: 'var(--danger)' }}>
          Multiple patients match this name. Confirm date of birth and mobile number before selecting.
        </p>
      )}
      {hasNextPage && (
        <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
          More matches exist — enter mobile number or patient ID to narrow results.
        </p>
      )}
    </div>
  ) : undefined

  // Reacts to the raw (non-debounced) query so guidance appears instantly.
  const noResultsText = hasSearchableQuery
    ? 'No matching patients.'
    : 'Type at least 3 letters, a 6+ digit mobile number, or a full patient ID to search.'

  const handleChange = (id: string, resultLabel: string) => {
    if (id === REGISTER_NEW_PATIENT) {
      setRegistering(true)
      return
    }
    const picked = results.find((p) => p.id === id)
    if (picked) setPendingPatient(picked)
    else onChange(id, resultLabel)
  }

  const handlePatientCreated = (patient: PatientEntity) => {
    setRegistering(false)
    setPendingPatient(patient)
  }

  const handleChangePatient = () => {
    if (disabled) return
    onChange('', '')
    setPendingPatient(null)
    setOpen(true)
  }

  const handleConfirm = () => {
    if (!pendingPatient || disabled) return
    onChange(pendingPatient.id, patientLabel(pendingPatient))
  }

  if (pendingPatient) {
    return (
      <ReviewCard>
        <div className="flex items-center gap-2.5 mb-2.5">
          <UserAvatar firstName={pendingPatient.firstName} lastName={pendingPatient.lastName} size="sm" />
          <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{patientFullName(pendingPatient)}</div>
        </div>
        <ReviewGrid>
          <ReviewField label="Date of birth" value={formatPatientDob(pendingPatient.dateOfBirth)} />
          <ReviewField label="Patient ID" value={pendingPatient.code} />
          <ReviewField label="Mobile" value={maskedMobile(pendingPatient.mobile)} />
        </ReviewGrid>
        <div className="flex gap-2 mt-3">
          <Button type="button" variant="secondary" size="sm" onClick={handleChangePatient} disabled={disabled}>
            Change patient
          </Button>
          <Button type="button" size="sm" onClick={handleConfirm} disabled={disabled}>
            Start screening
          </Button>
        </div>
      </ReviewCard>
    )
  }

  return (
    <>
      <AsyncPicker<PatientEntity | { id: typeof REGISTER_NEW_PATIENT }>
        value={value}
        label={label}
        onChange={handleChange}
        query={query}
        onQueryChange={setQuery}
        open={open}
        onOpenChange={setOpen}
        containerRef={containerRef}
        results={showRegisterOption ? [...results, { id: REGISTER_NEW_PATIENT }] : results}
        isFetching={hasSearchableQuery && (isDebouncing || (isFetching && !isFetchingNextPage))}
        getId={(item) => item.id}
        getLabel={(item) => ('firstName' in item ? patientLabel(item) : 'Register new patient')}
        searchPlaceholder="Search by mobile, patient ID, or name"
        clearAriaLabel="Clear"
        emptyQueryText="Start typing a mobile number, patient ID, or name to search."
        noResultsText={noResultsText}
        resultsBanner={resultsBanner}
        renderResult={(item) =>
          'firstName' in item ? (
            <span className="flex flex-col">
              <span>{patientFullName(item)}</span>
              <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                DOB: {formatPatientDob(item.dateOfBirth)} · {PATIENT_GENDER_LABEL[item.gender]} · {maskedMobile(item.mobile)} · {item.code}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5" style={{ color: 'var(--qms-brand)' }}>
              <FiUserPlus size={12} /> Register new patient…
            </span>
          )
        }
        isError={!!error}
        errorText="Couldn't search patients. Try again."
        onRetry={() => refetch()}
        hasMore={hasNextPage}
        isLoadingMore={isFetchingNextPage}
        onLoadMore={fetchNextPage}
        disabled={disabled}
      />

      <PatientRegistrationForm open={registering} onClose={() => setRegistering(false)} onCreated={handlePatientCreated} />
    </>
  )
}

export default PatientPicker
