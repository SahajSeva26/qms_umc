import { useMemo } from 'react'
import { FiMap } from 'react-icons/fi'
import type { DoctorEntity } from '@/types/doctor.types'
import DoBar from '@/features/dedicatedops/components/DoBar'

interface GeographyTabProps {
  doctors: DoctorEntity[]
  onSelectCity: (city: string) => void
}

const GeographyTab = ({ doctors, onSelectCity }: GeographyTabProps) => {
  const byState = useMemo(() => {
    const map = new Map<string, number>()
    doctors.forEach((d) => {
      if (!d.state) return
      map.set(d.state, (map.get(d.state) ?? 0) + 1)
    })
    return [...map.entries()].map(([state, count]) => ({ state, count })).sort((a, b) => b.count - a.count)
  }, [doctors])

  const byCity = useMemo(() => {
    const map = new Map<string, { city: string; state: string; count: number }>()
    doctors.forEach((d) => {
      if (!d.city) return
      const existing = map.get(d.city)
      if (existing) {
        existing.count += 1
      } else {
        map.set(d.city, { city: d.city, state: d.state || '—', count: 1 })
      }
    })
    return [...map.values()].sort((a, b) => b.count - a.count)
  }, [doctors])

  const maxState = Math.max(1, ...byState.map((s) => s.count))

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-2 text-[13px] font-bold mb-3" style={{ color: 'var(--qms-text)' }}>
          <FiMap size={15} style={{ color: 'var(--qms-brand)' }} /> By state
        </div>
        {byState.map((s) => (
          <div key={s.state} className="mb-2.5">
            <div className="flex justify-between text-[11.5px] font-semibold mb-1">
              <span style={{ color: 'var(--qms-text)' }}>{s.state}</span>
              <span style={{ color: 'var(--qms-text-muted)' }}>{s.count} drs</span>
            </div>
            <DoBar pct={Math.round((100 * s.count) / maxState)} color="linear-gradient(90deg, var(--qms-brand), var(--qms-teal))" />
          </div>
        ))}
        {byState.length === 0 && <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No doctors on record.</p>}
      </div>

      <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-2 text-[13px] font-bold mb-3" style={{ color: 'var(--qms-text)' }}>
          <FiMap size={15} style={{ color: 'var(--qms-teal)' }} /> By city
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr>
                {['City', 'State', 'Doctors'].map((h) => (
                  <th key={h} className="text-left font-semibold px-2 py-1.5 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byCity.map((c) => (
                <tr
                  key={c.city}
                  onClick={() => onSelectCity(c.city)}
                  className="border-t cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                  style={{ borderColor: 'var(--qms-border)' }}
                >
                  <td className="px-2 py-1.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{c.city}</td>
                  <td className="px-2 py-1.5" style={{ color: 'var(--qms-text-soft)' }}>{c.state}</td>
                  <td className="px-2 py-1.5" style={{ color: 'var(--qms-text-soft)' }}>{c.count}</td>
                </tr>
              ))}
              {byCity.length === 0 && (
                <tr><td colSpan={3} className="text-center py-4 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No doctors on record.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default GeographyTab
