import { useMemo } from 'react'
import { FiLayers } from 'react-icons/fi'
import type { DoctorEntity, DoctorSpecialization } from '@/types/doctor.types'

const SPECIALIZATION_LABEL: Record<DoctorSpecialization, string> = {
  cp: 'CP',
  gp: 'GP',
}

const COLORS: Record<DoctorSpecialization, string> = {
  cp: '#3b6dff',
  gp: '#10b981',
}

interface SpecialtiesTabProps {
  doctors: DoctorEntity[]
  onSelectSpecialization: (specialization: DoctorSpecialization) => void
}

// Real backend only has 2 specializations (cp/gp) — a much shorter list than
// the mock-era 13-item taxonomy this tab used to group by.
const SpecialtiesTab = ({ doctors, onSelectSpecialization }: SpecialtiesTabProps) => {
  const groups = useMemo(() => {
    const map = new Map<DoctorSpecialization, DoctorEntity[]>()
    doctors.forEach((d) => {
      if (!map.has(d.specialization)) map.set(d.specialization, [])
      map.get(d.specialization)!.push(d)
    })
    return [...map.entries()]
      .map(([specialization, docs]) => ({ specialization, docs }))
      .sort((a, b) => b.docs.length - a.docs.length)
  }, [doctors])

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
      {groups.map((g) => {
        const color = COLORS[g.specialization]
        return (
          <div
            key={g.specialization}
            onClick={() => onSelectSpecialization(g.specialization)}
            className="rounded-2xl border p-4 cursor-pointer transition-all hover:-translate-y-0.5"
            style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}1a`, color }}>
                <FiLayers size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-[13.5px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{SPECIALIZATION_LABEL[g.specialization]}</div>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{g.docs.length} doctor{g.docs.length === 1 ? '' : 's'}</div>
              </div>
            </div>
          </div>
        )
      })}
      {groups.length === 0 && (
        <div className="col-span-full text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>No doctors on record.</div>
      )}
    </div>
  )
}

export default SpecialtiesTab
