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
}

const RosterTab = ({ doctors, filters, setFilter, reset, onOpenDoctor }: RosterTabProps) => (
  <div>
    <DoctorFilterBar filters={filters} setFilter={setFilter} reset={reset} />

    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {doctors.map((d) => (
        <div
          key={d.id}
          onClick={() => onOpenDoctor(d.id)}
          className="rounded-2xl border p-4 cursor-pointer transition-all hover:-translate-y-0.5"
          style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg,#3b6dff,#8b5cf6)' }}
            >
              {initials(d.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{d.name}</div>
              <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{d.specialization.toUpperCase()}</div>
              <div className="text-[10.5px] truncate" style={{ color: 'var(--qms-text-soft)' }}>{d.pharmaCode} · {d.city}, {d.state}</div>
            </div>
            <StatusPill status={d.status} />
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
