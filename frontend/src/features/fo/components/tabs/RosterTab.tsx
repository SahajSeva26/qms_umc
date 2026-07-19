import { useMemo, useState } from 'react'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import FoFilterBar, { type FoFilters } from '@/features/fo/components/FoFilterBar'
import { foLiveStatus, STATUS_LABEL, STATUS_COLOR, initials, avatarGradient, personCamps, closedCampsOf, upcomingCampsOf, avgFeedback } from '@/features/fo/components/fo.ui'

interface RosterTabProps {
  fos: Person[]
  camps: Camp[]
  onOpenFo: (id: string) => void
}

const RosterTab = ({ fos, camps, onOpenFo }: RosterTabProps) => {
  const [filters, setFilters] = useState<FoFilters>({ state: 'ALL', status: 'ALL', search: '' })
  const onFilterChange = (patch: Partial<FoFilters>) => setFilters((prev) => ({ ...prev, ...patch }))

  const states = useMemo(() => [...new Set(fos.flatMap((f) => f.states ?? []))].sort(), [fos])

  const todayIso = new Date().toISOString().slice(0, 10)

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return fos.filter((f) => {
      if (filters.state !== 'ALL' && !(f.states ?? []).includes(filters.state)) return false
      if (filters.status !== 'ALL' && foLiveStatus(f, camps) !== filters.status) return false
      if (q && !`${f.name} ${f.hq} ${f.phone}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [fos, camps, filters])

  return (
    <div>
      <FoFilterBar filters={filters} onChange={onFilterChange} states={states} />
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {filtered.map((f) => {
          const myCamps = personCamps(f, camps)
          const status = foLiveStatus(f, camps)
          const todayCamp = myCamps.find((c) => c.date?.slice(0, 10) === todayIso)
          const closed = closedCampsOf(myCamps).length
          const upcoming = upcomingCampsOf(myCamps).length
          const fb = avgFeedback(myCamps)
          return (
            <button
              key={f.id}
              onClick={() => onOpenFo(f.id)}
              className="text-left rounded-xl border p-3.5 transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
            >
              <div className="flex items-start gap-2.5 mb-2.5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[13px] shrink-0" style={{ background: avatarGradient(f) }}>
                  {initials(f.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold truncate" style={{ color: 'var(--qms-text)' }}>{f.name}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{f.hq} · {(f.states ?? []).join(', ')}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: `color-mix(in oklab, ${STATUS_COLOR[status]} 16%, transparent)`, color: STATUS_COLOR[status] }}>
                  {STATUS_LABEL[status]}
                </span>
              </div>

              {todayCamp ? (
                <div className="text-[11px] font-semibold px-2 py-1.5 rounded-lg mb-2.5" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                  Today: {todayCamp.id} · {todayCamp.city}
                </div>
              ) : (
                <div className="text-[11px] px-2 py-1.5 rounded-lg mb-2.5" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                  No camp today
                </div>
              )}

              <div className="grid grid-cols-4 gap-1 text-center">
                <div>
                  <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{closed}</div>
                  <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Closed</div>
                </div>
                <div>
                  <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{upcoming}</div>
                  <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Upcoming</div>
                </div>
                <div>
                  <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{f.occupancyPct ?? '—'}%</div>
                  <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Occ.</div>
                </div>
                <div>
                  <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{fb > 0 ? fb.toFixed(1) : '—'}</div>
                  <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>★</div>
                </div>
              </div>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-10 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No FOs match these filters.</div>
        )}
      </div>
    </div>
  )
}

export default RosterTab
