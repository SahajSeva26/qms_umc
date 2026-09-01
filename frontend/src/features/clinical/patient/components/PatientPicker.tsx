import { useState } from 'react'
import { FiUserPlus } from 'react-icons/fi'
import AsyncPicker from '@/components/ui/AsyncPicker'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { usePatientPicker } from '@/features/clinical/patient/hooks/usePatientPicker'
import PatientRegistrationForm from '@/features/clinical/patient/components/PatientRegistrationForm'
import type { PatientEntity } from '@/features/clinical/patient/patient.types'

// Sentinel for the inline "+ Register new patient" option — never a real
// patient id, non-empty as AsyncPicker's results-are-rendered-as-buttons
// contract requires. Same convention as NewAppointmentDialog.tsx's
// ADD_NEW_CONTACT_VALUE.
const REGISTER_NEW_PATIENT = '__register_new_patient__'

const patientLabel = (p: PatientEntity) => {
  const name = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')
  return `${name} · ${p.code} · ${p.mobile}`
}

interface PatientPickerProps {
  value: string
  label: string
  onChange: (id: string, label: string) => void
  /** Patient ids to exclude from results (e.g. already screened at this camp). */
  excludeIds?: string[]
  disabled?: boolean
}

// Debounced search-as-you-type over the global patient registry, with an
// inline "+ Register new patient" affordance for the not-found case — mirrors
// NewAppointmentDialog.tsx's contact-picker pattern, but async-search-backed
// (AsyncPicker/InventoryMasterMultiPicker's shape) since the patient set is
// unbounded, unlike a short preloaded contact list.
const PatientPicker = ({ value, label, onChange, excludeIds = [], disabled }: PatientPickerProps) => {
  const { open, setOpen, containerRef } = useAsyncPickerState()
  const [query, setQuery] = useState('')
  const [registering, setRegistering] = useState(false)
  const { items, isFetching, error, refetch } = usePatientPicker(query, open)

  const results = items.filter((p) => !excludeIds.includes(p.id))
  // Only offer "register new" once a search has actually run and found no
  // matching patient AT ALL — never before typing, never while still
  // loading. Deliberately checks `items` (the raw search results), not
  // `results` (items with excludeIds filtered out): a patient excluded here
  // (e.g. already screened at this camp) still exists globally, so offering
  // "register new" in that case would create a genuine duplicate patient
  // record. excludeIds only controls what's selectable, never whether the
  // real-world person is a known match. Patient.mobile has no backend
  // uniqueness constraint, so this distinction is the only thing preventing
  // duplicate patient records for the same person.
  const showRegisterOption = query.trim().length > 0 && !isFetching && !error && items.length === 0

  const handleChange = (id: string, resultLabel: string) => {
    if (id === REGISTER_NEW_PATIENT) {
      setRegistering(true)
      return
    }
    onChange(id, resultLabel)
  }

  const handlePatientCreated = (patient: PatientEntity) => {
    setRegistering(false)
    onChange(patient.id, patientLabel(patient))
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
        isFetching={isFetching}
        getId={(item) => item.id}
        getLabel={(item) => ('firstName' in item ? patientLabel(item) : 'Register new patient')}
        searchPlaceholder="Search by mobile or name…"
        clearAriaLabel="Clear"
        emptyQueryText="Start typing a mobile number or name to search."
        noResultsText="No matching patients."
        renderResult={(item) =>
          'firstName' in item ? (
            <span>{patientLabel(item)}</span>
          ) : (
            <span className="flex items-center gap-1.5" style={{ color: 'var(--qms-brand)' }}>
              <FiUserPlus size={12} /> Register new patient…
            </span>
          )
        }
        isError={!!error}
        errorText="Couldn't search patients. Try again."
        onRetry={() => refetch()}
        disabled={disabled}
      />

      <PatientRegistrationForm open={registering} onClose={() => setRegistering(false)} onCreated={handlePatientCreated} />
    </>
  )
}

export default PatientPicker
