import { useMemo } from 'react'
import { FiLayers } from 'react-icons/fi'
import type { Doctor, EngagementStats } from '@/features/doctors/doctors.types'

const COLORS = ['#3b6dff', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#0ea5e9', '#14b8a6', '#a855f7', '#f43f5e', '#64748b', '#7c3aed', '#22c55e', '#facc15']

interface SpecialtiesTabProps {
  doctors: Doctor[]
  engagementFor: (doctorId: string) => EngagementStats
  onSelectSpecialty: (specialty: string) => void
}

const SpecialtiesTab = ({ doctors, engagementFor, onSelectSpecialty }: SpecialtiesTabProps) => {
  const groups = useMemo(() => {
    const map = new Map<string, Doctor[]>()
    doctors.forEach((d) => {
      const key = d.specialty || 'Others'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(d)
    })
    return [...map.entries()]
      .map(([specialty, docs]) => ({ specialty, docs }))
      .sort((a, b) => b.docs.length - a.docs.length)
  }, [doctors])

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {groups.map((g, i) => {
        const color = COLORS[i % COLORS.length]
        const camps = g.docs.reduce((sum, d) => sum + engagementFor(d.id).closedCount, 0)
        const patients = g.docs.reduce((sum, d) => sum + engagementFor(d.id).patients, 0)
        return (
          <div
            key={g.specialty}
            onClick={() => onSelectSpecialty(g.specialty)}
            className="rounded-2xl border p-4 cursor-pointer transition-all hover:-translate-y-0.5"
            style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}1a`, color }}>
                <FiLayers size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-[13.5px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{g.specialty}</div>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{g.docs.length} doctor{g.docs.length === 1 ? '' : 's'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center rounded-lg p-2" style={{ background: `${color}0d` }}>
                <div className="text-base font-extrabold" style={{ color }}>{camps}</div>
                <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Camps</div>
              </div>
              <div className="text-center rounded-lg p-2" style={{ background: `${color}0d` }}>
                <div className="text-base font-extrabold" style={{ color }}>{patients}</div>
                <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Patients</div>
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
