import { useMemo, useState } from 'react'
import { FiAward } from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import FoFilterBar, { type FoFilters } from '@/features/fo/components/FoFilterBar'
import { foLiveStatus, closedCampsOf, avgFeedback } from '@/features/fo/components/fo.ui'

interface PerformanceTabProps {
  fos: Person[]
  camps: Camp[]
  onOpenFo: (id: string) => void
}

const MEDAL_COLOR = ['#f59e0b', '#94a3b8', '#b45309']

const PerformanceTab = ({ fos, camps, onOpenFo }: PerformanceTabProps) => {
  const [filters, setFilters] = useState<FoFilters>({ state: 'ALL', status: 'ALL', search: '' })
  const onFilterChange = (patch: Partial<FoFilters>) => setFilters((prev) => ({ ...prev, ...patch }))
  const states = useMemo(() => [...new Set(fos.flatMap((f) => f.states ?? []))].sort(), [fos])

  const leaderboard = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return fos
      .filter((f) => {
        if (filters.state !== 'ALL' && !(f.states ?? []).includes(filters.state)) return false
        if (filters.status !== 'ALL' && foLiveStatus(f, camps) !== filters.status) return false
        if (q && !`${f.name} ${f.hq} ${f.phone}`.toLowerCase().includes(q)) return false
        return true
      })
      .map((f) => {
        const myCamps = camps.filter((c) => c.foId === f.id)
        const closed = closedCampsOf(myCamps)
        const patients = closed.reduce((sum, c) => sum + (c.patientsDone || 0), 0)
        const fb = avgFeedback(myCamps) || (f.feedbackAvg ?? 0)
        const occupancyPct = f.occupancyPct ?? 0
        const efficiencyPct = f.efficiencyPct ?? 0
        const score = Math.round(occupancyPct * 0.4 + efficiencyPct * 0.3 + fb * 20 * 0.3)
        return { person: f, closed: closed.length, patients, fb, occupancyPct, score }
      })
      .sort((a, b) => b.score - a.score)
  }, [fos, camps, filters])

  return (
    <div>
      <FoFilterBar filters={filters} onChange={onFilterChange} states={states} />
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {leaderboard.map((row, i) => (
          <button
            key={row.person.id}
            onClick={() => onOpenFo(row.person.id)}
            className="text-left rounded-xl border p-3.5"
            style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[13px] shrink-0"
                style={{ background: i < 3 ? `${MEDAL_COLOR[i]}22` : 'var(--qms-surface-strong)', color: i < 3 ? MEDAL_COLOR[i] : 'var(--qms-text-muted)' }}
              >
                {i < 3 ? <FiAward size={15} /> : `#${i + 1}`}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold truncate" style={{ color: 'var(--qms-text)' }}>{row.person.name}</div>
                <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{row.person.hq} · {(row.person.states ?? []).join(', ')}</div>
              </div>
              <div className="text-2xl font-extrabold shrink-0" style={{ color: 'var(--qms-brand)' }}>{row.score}</div>
            </div>

            <div className="grid grid-cols-4 gap-1 text-center mb-2.5">
              <div>
                <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{row.closed}</div>
                <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Camps</div>
              </div>
              <div>
                <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{row.patients}</div>
                <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Patients</div>
              </div>
              <div>
                <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{row.occupancyPct}%</div>
                <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Occ.</div>
              </div>
              <div>
                <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{row.fb ? row.fb.toFixed(1) : '—'}</div>
                <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>★</div>
              </div>
            </div>

            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--qms-surface-strong)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, row.score)}%`, background: 'linear-gradient(90deg, var(--qms-brand), var(--qms-teal))' }} />
            </div>
          </button>
        ))}
        {leaderboard.length === 0 && (
          <div className="col-span-full text-center py-10 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No FOs match these filters.</div>
        )}
      </div>
    </div>
  )
}

export default PerformanceTab
