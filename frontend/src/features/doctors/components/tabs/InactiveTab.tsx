import type { DoctorEntity } from '@/types/doctor.types'
import StatusPill from '@/features/doctors/components/StatusPill'

interface InactiveTabProps {
  doctors: DoctorEntity[]
  onOpenDoctor: (id: string) => void
}

// Real `status: 'inactive'` field (doctor.constants.ts's DOCTOR_STATUS) —
// not a replacement for the mock-era engagement-decay heuristic (Dormant/
// Inactive/New bands derived from camp gaps), which has no backend
// equivalent. `doctors` is expected to already be scoped to status=inactive
// by the caller (DoctorsPage.tsx runs a dedicated `status: 'inactive'`
// query) — search() only returns inactive doctors when explicitly asked,
// and only for callers with `doctor:manage`, so this can never be derived
// by filtering an already-active-only list client-side.
const InactiveTab = ({ doctors, onOpenDoctor }: InactiveTabProps) => {
  const rows = doctors

  if (rows.length === 0) {
    return (
      <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
        No inactive doctors on record.
      </div>
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ background: 'var(--qms-surface-strong)' }}>
              {['Doctor', 'Specialization', 'City', 'Status'].map((h) => (
                <th key={h} className="text-left font-semibold px-2.5 py-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr
                key={d.id}
                onClick={() => onOpenDoctor(d.id)}
                className="border-t cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                style={{ borderColor: 'var(--qms-border)' }}
              >
                <td className="px-2.5 py-2 font-semibold" style={{ color: 'var(--qms-text)' }}>{d.name}</td>
                <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{d.specialization.toUpperCase()}</td>
                <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{d.city}</td>
                <td className="px-2.5 py-2"><StatusPill status={d.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default InactiveTab
