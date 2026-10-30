import { useMemo } from 'react'
import { FiAward, FiPieChart } from 'react-icons/fi'
import type { Camp, Doctor } from '@/types/camp.types'
import AnalyticsSectionCard from '@/features/analytics/components/AnalyticsSectionCard'
import Donut from '@/features/analytics/components/charts/Donut'

const SPECIALTY_PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', '#0ea5e9', '#f43f5e', '#a855f7']

interface DoctorsTabProps {
  camps: Camp[]
  doctors: Doctor[]
}

const DoctorsTab = ({ camps, doctors }: DoctorsTabProps) => {
  const topDoctors = useMemo(() => {
    const byDoctor = new Map<string, { camps: number; patients: number; rx: number; ratings: number[] }>()
    for (const c of camps) {
      if (!c.doctorId) continue
      const entry = byDoctor.get(c.doctorId) ?? { camps: 0, patients: 0, rx: 0, ratings: [] }
      entry.camps += 1
      entry.patients += c.patientsDone || 0
      entry.rx += c.rxCount || 0
      if (c.feedback > 0) entry.ratings.push(c.feedback)
      byDoctor.set(c.doctorId, entry)
    }
    return [...byDoctor.entries()]
      .map(([doctorId, v]) => {
        const doctor = doctors.find((d) => d.id === doctorId)
        const avgRating = v.ratings.length > 0 ? Math.round((v.ratings.reduce((s, r) => s + r, 0) / v.ratings.length) * 10) / 10 : null
        return { doctorId, name: doctor?.name ?? doctorId, specialty: doctor?.specialty ?? '—', ...v, avgRating }
      })
      .sort((a, b) => b.camps - a.camps)
      .slice(0, 10)
  }, [camps, doctors])

  const specialtyMix = useMemo(() => {
    const counts = new Map<string, number>()
    const seenDoctors = new Set<string>()
    for (const c of camps) {
      if (!c.doctorId) continue
      seenDoctors.add(c.doctorId)
      const doctor = doctors.find((d) => d.id === c.doctorId)
      const specialty = doctor?.specialty || 'Others'
      counts.set(specialty, (counts.get(specialty) ?? 0) + 1)
    }
    const slices = [...counts.entries()]
      .map(([specialty, value], i) => ({ label: specialty, value, color: SPECIALTY_PALETTE[i % SPECIALTY_PALETTE.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
    return { slices, distinctDoctors: seenDoctors.size }
  }, [camps, doctors])

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
      <div className="md:col-span-2">
        <AnalyticsSectionCard
          icon={FiAward}
          iconGradient="linear-gradient(135deg, var(--chart-3), #a855f7)"
          title="Top doctors by engagement"
          subtitle="Top 10 in period"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  {['Doctor', 'Specialty', 'Camps', 'Patients', 'Rx', '★'].map((h) => (
                    <th key={h} className="text-left font-bold text-[11px] uppercase tracking-wider px-3 py-2" style={{ color: 'var(--qms-text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topDoctors.map((row) => (
                  <tr key={row.doctorId} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                    <td className="px-3 py-2 font-semibold" style={{ color: 'var(--qms-text)' }}>{row.name}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text-muted)' }}>{row.specialty}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.camps}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.patients}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.rx}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.avgRating !== null ? row.avgRating : '—'}</td>
                  </tr>
                ))}
                {topDoctors.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                      No camps with a mapped doctor in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AnalyticsSectionCard>
      </div>

      <AnalyticsSectionCard
        icon={FiPieChart}
        iconGradient="linear-gradient(135deg, var(--chart-1), var(--qms-teal))"
        title="Specialty mix"
        subtitle={`${specialtyMix.distinctDoctors} doctors`}
      >
        <Donut slices={specialtyMix.slices} centerLabel={String(specialtyMix.distinctDoctors)} centerSub="doctors" />
      </AnalyticsSectionCard>
    </div>
  )
}

export default DoctorsTab
