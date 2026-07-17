import { useMemo } from 'react'
import { FiAward, FiMapPin } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import type { FieldOfficer } from '@/types/analytics.types'
import AnalyticsSectionCard from '@/features/analytics/components/AnalyticsSectionCard'
import BarsHorizontal from '@/features/analytics/components/charts/BarsHorizontal'

interface FoPerformanceTabProps {
  camps: Camp[]
  fieldOfficers: FieldOfficer[]
}

const MEDALS = ['🥇', '🥈', '🥉']

// Score = occ × 0.4 + eff × 0.3 + ★×20 × 0.3 — ported exactly from the
// prototype's FO leaderboard formula (confirmed via research).
const FoPerformanceTab = ({ camps, fieldOfficers }: FoPerformanceTabProps) => {
  const leaderboard = useMemo(() => {
    return fieldOfficers
      .map((fo) => {
        const foCamps = camps.filter((c) => c.foId === fo.id)
        const closed = foCamps.filter((c) => c.status === 'CLOSED')
        const patients = closed.reduce((sum, c) => sum + (c.patientsDone || 0), 0)
        const rated = closed.filter((c) => c.feedback > 0)
        const avgFb = rated.length > 0 ? rated.reduce((sum, c) => sum + c.feedback, 0) / rated.length : fo.feedbackAvg
        const score = Math.round(fo.occupancyPct * 0.4 + fo.efficiencyPct * 0.3 + avgFb * 20 * 0.3)
        return { ...fo, camps: foCamps.length, closed: closed.length, patients, avgFb: Math.round(avgFb * 10) / 10, score }
      })
      .sort((a, b) => b.score - a.score)
  }, [camps, fieldOfficers])

  const byHq = useMemo(() => {
    const groups = new Map<string, { fos: number; camps: number }>()
    for (const fo of fieldOfficers) {
      const hq = fo.hq || '—'
      const entry = groups.get(hq) ?? { fos: 0, camps: 0 }
      entry.fos += 1
      entry.camps += camps.filter((c) => c.foId === fo.id).length
      groups.set(hq, entry)
    }
    return [...groups.entries()].map(([hq, v]) => ({
      label: `${hq} · ${v.fos} FO${v.fos === 1 ? '' : 's'}`,
      value: v.camps,
      formattedValue: String(v.camps),
    }))
  }, [camps, fieldOfficers])

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
      <div className="md:col-span-2">
        <AnalyticsSectionCard
          icon={FiAward}
          iconGradient="linear-gradient(135deg, var(--qms-teal), var(--chart-1))"
          title="FO leaderboard"
          subtitle="Score = occ × 0.4 + eff × 0.3 + ★×20 × 0.3"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  {['Rank', 'FO', 'HQ', 'Score', 'Camps', 'Closed', 'Patients', 'Occ%', 'Eff%', '★'].map((h) => (
                    <th key={h} className="text-left font-bold text-[11px] uppercase tracking-wider px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, i) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                    <td className="px-3 py-2 font-bold" style={{ color: 'var(--qms-text)' }}>{MEDALS[i] ?? i + 1}</td>
                    <td className="px-3 py-2 font-semibold" style={{ color: 'var(--qms-text)' }}>{row.name}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text-muted)' }}>{row.hq}</td>
                    <td className="px-3 py-2 font-bold" style={{ color: 'var(--qms-text)' }}>{row.score}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.camps}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.closed}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.patients}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.occupancyPct}%</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.efficiencyPct}%</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.avgFb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnalyticsSectionCard>
      </div>

      <div className="md:col-span-2">
        <AnalyticsSectionCard icon={FiMapPin} iconGradient="linear-gradient(135deg, var(--chart-1), var(--qms-teal))" title="By HQ" subtitle="Camps assigned per HQ">
          <BarsHorizontal bars={byHq} />
        </AnalyticsSectionCard>
      </div>
    </div>
  )
}

export default FoPerformanceTab
