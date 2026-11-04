import { useMemo } from 'react'
import { FiLayers } from 'react-icons/fi'
import type { DoctorEntity, DoctorSpecialization } from '@/types/doctor.types'
import { SPECIALIZATION_LABEL } from '@/features/doctors/doctors.ui'

// A fixed, repeating palette — enough distinct hues that adjacent tiles rarely clash, cycled via
// index rather than hand-mapped per specialization (12 values and growing isn't worth a 1:1 map).
const TILE_COLORS = ['#3b6dff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']
const colorFor = (index: number) => TILE_COLORS[index % TILE_COLORS.length]

interface SpecialtiesTabProps {
  doctors: DoctorEntity[]
  onSelectSpecialization: (specialization: DoctorSpecialization) => void
  /** True when `doctors` is a capped sample, not the full active-doctor set — no backend
   * aggregate exists for a true specialization breakdown yet (see DoctorsPage's AGGREGATE_LIMIT). */
  isSample?: boolean
}

const SpecialtiesTab = ({ doctors, onSelectSpecialization, isSample }: SpecialtiesTabProps) => {
  const groups = useMemo(() => {
    const map = new Map<DoctorSpecialization, DoctorEntity[]>()
    // A doctor with no specialization on record (legacy/malformed data) has nowhere meaningful
    // to group into — excluded here rather than creating an `undefined`-keyed tile.
    doctors.forEach((d) => {
      if (!d.specialization) return
      if (!map.has(d.specialization)) map.set(d.specialization, [])
      map.get(d.specialization)!.push(d)
    })
    return [...map.entries()]
      .map(([specialization, docs]) => ({ specialization, docs }))
      .sort((a, b) => b.docs.length - a.docs.length)
  }, [doctors])

  return (
    <div>
      {isSample && (
        <p className="text-[12px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>
          Based on a sample of {doctors.length} active doctors — not the full roster (no aggregate endpoint yet).
        </p>
      )}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
      {groups.map((g, index) => {
        const color = colorFor(index)
        return (
          <div
            key={g.specialization}
            onClick={() => onSelectSpecialization(g.specialization)}
            className="rounded-2xl border p-4 cursor-pointer transition-all hover:-translate-y-0.5"
            style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 text-white" style={{ background: color }}>
                <FiLayers size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-extrabold truncate" style={{ color: 'var(--qms-text)' }}>{SPECIALIZATION_LABEL[g.specialization]}</div>
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
    </div>
  )
}

export default SpecialtiesTab
