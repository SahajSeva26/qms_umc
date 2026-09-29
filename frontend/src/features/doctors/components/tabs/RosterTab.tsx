import type { DoctorEntity } from '@/types/doctor.types'
import type { DoctorsFilterState } from '@/features/doctors/hooks/useDoctorsFilters'
import DoctorFilterBar from '@/features/doctors/components/DoctorFilterBar'
import StatusPill from '@/features/doctors/components/StatusPill'
import { initials } from '@/features/doctors/doctors.ui'

interface RosterTabProps {
  doctors: DoctorEntity[]
  filters: DoctorsFilterState
  setFilter: <K extends keyof DoctorsFilterState>(key: K, value: DoctorsFilterState[K]) => void
  reset: () => void
  onOpenDoctor: (id: string) => void
  /** From the Geography tab's "jump to roster" action — bumped on every jump so the filter bar's
   * StateCityFilter remounts and re-seeds, even for the same city/state clicked twice in a row. */
  geographySeedKey?: number
  geographySeed?: { city: string; state: string } | null
}

const RosterTab = ({ doctors, filters, setFilter, reset, onOpenDoctor, geographySeedKey, geographySeed }: RosterTabProps) => (
  <div>
    <DoctorFilterBar
      filters={filters}
      setFilter={setFilter}
      reset={reset}
      geographySeedKey={geographySeedKey}
      geographySeed={geographySeed}
    />

    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
      {doctors.map((d) => (
        <div key={d.id} onClick={() => onOpenDoctor(d.id)} className="doc-card">
          <div className="h">
            <div className="av">{initials(d.name)}</div>
            <div className="min-w-0 flex-1">
              <div className="nm">{d.name}</div>
              <div className="sp">{d.specialization.toUpperCase()}</div>
              <div className="ct">{d.pharmaCode} · {d.location ? `${d.location.city}, ${d.location.state}` : '—'}</div>
            </div>
            <StatusPill status={d.status} />
          </div>
          {/* Camps is a real Camp.doctor filter, no per-doctor aggregate exists yet; Patients/Rx/★ have no backend field at all — see md-files/ui-revisions.md. */}
          <div className="stats">
            <div className="stat"><b>—</b><div className="l">Camps</div></div>
            <div className="stat"><b>—</b><div className="l">Patients</div></div>
            <div className="stat"><b>—</b><div className="l">Rx</div></div>
            <div className="stat"><b>—</b><div className="l">★</div></div>
          </div>
        </div>
      ))}
      {doctors.length === 0 && (
        <div className="col-span-full text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          No doctors match these filters.
        </div>
      )}
    </div>
  </div>
)

export default RosterTab
