import type { DoctorEntity } from '@/types/doctor.types'

interface DivisionDoctorsTableProps {
  doctors: DoctorEntity[]
  onView: (doctor: DoctorEntity) => void
}

// Row-table like DivisionMrsTable.tsx/ContactsTable.tsx — a simpler read for a sub-section context
// than RosterTab.tsx's card-grid, which is the main Doctor Management page's own presentation.
const DivisionDoctorsTable = ({ doctors, onView }: DivisionDoctorsTableProps) => {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Name
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Pharma Code
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Specialization
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                City / State
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((doctor) => (
              <tr
                key={doctor.id}
                tabIndex={0}
                role="button"
                onClick={() => onView(doctor)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onView(doctor) } }}
                className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover) focus-visible:outline-2 focus-visible:-outline-offset-2"
                style={{ borderBottom: '1px solid var(--qms-border)', outlineColor: 'var(--qms-brand)' }}
              >
                <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--qms-text)' }}>
                  {doctor.name}
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {doctor.pharmaCode}
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {doctor.specialization.toUpperCase()}
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {doctor.location ? `${doctor.location.city}, ${doctor.location.state}` : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${doctor.status === 'active' ? 'bg-success-soft text-success' : ''}`}
                    style={doctor.status !== 'active' ? { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' } : undefined}
                  >
                    {doctor.status ? (doctor.status === 'active' ? 'ACTIVE' : 'INACTIVE') : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {doctors.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          No doctors found.
        </div>
      )}
    </div>
  )
}

export default DivisionDoctorsTable
