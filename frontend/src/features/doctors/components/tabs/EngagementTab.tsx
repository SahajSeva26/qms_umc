import { useMemo } from 'react'
import type { Doctor, EngagementBand, EngagementStats } from '@/features/doctors/doctors.types'
import DoctorFilterBar, { type DoctorFilters } from '@/features/doctors/components/DoctorFilterBar'
import BandPill from '@/features/doctors/components/BandPill'
import { visibleDoctors } from '@/features/doctors/doctors.filter'
import { formatDate } from '@/utils/formatters'

interface EngagementTabProps {
  doctors: Doctor[]
  filters: DoctorFilters
  onFilterChange: (patch: Partial<DoctorFilters>) => void
  engagementFor: (doctorId: string) => EngagementStats
  engagementBand: (e: EngagementStats) => EngagementBand
  engagementScore: (e: EngagementStats) => number
  onOpenDoctor: (id: string) => void
}

const EngagementTab = ({ doctors, filters, onFilterChange, engagementFor, engagementBand, engagementScore, onOpenDoctor }: EngagementTabProps) => {
  const specialties = useMemo(() => [...new Set(doctors.map((d) => d.specialty || 'Others'))].sort(), [doctors])
  const cities = useMemo(() => [...new Set(doctors.map((d) => d.city).filter(Boolean))].sort(), [doctors])

  const rows = useMemo(() => {
    const bandOf = (d: Doctor) => engagementBand(engagementFor(d.id))
    const list = visibleDoctors(doctors, filters, bandOf)
    return list
      .map((d) => {
        const stats = engagementFor(d.id)
        return { doctor: d, stats, band: engagementBand(stats), score: engagementScore(stats) }
      })
      .sort((a, b) => b.score - a.score)
  }, [doctors, filters, engagementFor, engagementBand, engagementScore])

  return (
    <div>
      <DoctorFilterBar filters={filters} onChange={onFilterChange} specialties={specialties} cities={cities} />

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['#', 'Doctor', 'Specialty', 'City', 'Camps', 'Patients', 'Rx', '★', 'Last camp', 'Score', 'Band'].map((h) => (
                  <th key={h} className="text-left font-semibold px-2.5 py-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.doctor.id}
                  onClick={() => onOpenDoctor(r.doctor.id)}
                  className="border-t cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                  style={{ borderColor: 'var(--qms-border)' }}
                >
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-muted)' }}>{i + 1}</td>
                  <td className="px-2.5 py-2">
                    <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{r.doctor.name}</div>
                    <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>{r.doctor.code}</div>
                  </td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{r.doctor.specialty}</td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{r.doctor.city}</td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{r.stats.closedCount}</td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{r.stats.patients}</td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{r.stats.rx}</td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{r.stats.avgRating || '—'}</td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>
                    {r.stats.lastDate ? (
                      <>
                        {formatDate(r.stats.lastDate)}{' '}
                        <span style={{ color: 'var(--qms-text-muted)' }}>({r.stats.daysSinceLast}d)</span>
                      </>
                    ) : '—'}
                  </td>
                  <td className="px-2.5 py-2 font-bold" style={{ color: 'var(--qms-text)' }}>{r.score}</td>
                  <td className="px-2.5 py-2"><BandPill band={r.band} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={11} className="text-center py-6 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No doctors match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default EngagementTab
