import { useMemo, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import { Button } from '@/components/ui/button'
import FoFilterBar, { type FoFilters } from '@/features/fo/components/FoFilterBar'
import { foLiveStatus, stubOpenCamp } from '@/features/fo/components/fo.ui'

interface AssignmentsTabProps {
  fos: Person[]
  camps: Camp[]
  onOpenFo: (id: string) => void
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function startOfWeek(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay() // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day // move back to Monday
  copy.setDate(copy.getDate() + diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const AssignmentsTab = ({ fos, camps, onOpenFo }: AssignmentsTabProps) => {
  const [filters, setFilters] = useState<FoFilters>({ state: 'ALL', status: 'ALL', search: '' })
  const onFilterChange = (patch: Partial<FoFilters>) => setFilters((prev) => ({ ...prev, ...patch }))
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => startOfWeek(new Date()))

  const states = useMemo(() => [...new Set(fos.flatMap((f) => f.states ?? []))].sort(), [fos])
  const todayIso = iso(new Date())

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return fos.filter((f) => {
      if (filters.state !== 'ALL' && !(f.states ?? []).includes(filters.state)) return false
      if (filters.status !== 'ALL' && foLiveStatus(f, camps) !== filters.status) return false
      if (q && !`${f.name} ${f.hq} ${f.phone}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [fos, camps, filters])

  const weekStart = startOfWeek(weekAnchor)
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const campsByFoDay = useMemo(() => {
    const map = new Map<string, Camp[]>()
    for (const c of camps) {
      if (!c.foId || !c.date) continue
      const key = `${c.foId}::${c.date.slice(0, 10)}`
      const arr = map.get(key) ?? []
      arr.push(c)
      map.set(key, arr)
    }
    return map
  }, [camps])

  return (
    <div>
      <FoFilterBar filters={filters} onChange={onFilterChange} states={states} />

      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-semibold" style={{ color: 'var(--qms-text)' }}>
          {days[0].toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – {days[6].toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setWeekAnchor(addDays(weekStart, -7))}><FiChevronLeft size={13} /></Button>
          <Button size="sm" variant="outline" onClick={() => setWeekAnchor(startOfWeek(new Date()))}>This week</Button>
          <Button size="sm" variant="outline" onClick={() => setWeekAnchor(addDays(weekStart, 7))}><FiChevronRight size={13} /></Button>
        </div>
      </div>

      <div className="rounded-xl border overflow-x-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div style={{ minWidth: 200 + 7 * 140 }}>
          <div className="grid" style={{ gridTemplateColumns: `200px repeat(7, 1fr)` }}>
            <div className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)', borderBottom: '1px solid var(--qms-border)', background: 'var(--qms-surface-strong)' }}>Field Officer</div>
            {days.map((d) => {
              const isToday = iso(d) === todayIso
              return (
                <div
                  key={iso(d)}
                  className="px-2 py-2.5 text-[11px] font-semibold text-center uppercase tracking-wide"
                  style={{
                    color: isToday ? 'var(--qms-brand)' : 'var(--qms-text-muted)',
                    borderBottom: '1px solid var(--qms-border)',
                    background: isToday ? 'color-mix(in oklab, var(--qms-brand) 8%, var(--qms-surface-strong))' : 'var(--qms-surface-strong)',
                  }}
                >
                  {DAY_LABELS[(d.getDay() + 6) % 7]} {d.getDate()}
                </div>
              )
            })}
          </div>

          {filtered.map((f) => (
            <div key={f.id} className="grid" style={{ gridTemplateColumns: `200px repeat(7, 1fr)`, borderTop: '1px solid var(--qms-border)' }}>
              <button onClick={() => onOpenFo(f.id)} className="text-left px-3 py-2.5">
                <div className="font-semibold text-[13px] truncate" style={{ color: 'var(--qms-text)' }}>{f.name}</div>
                <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{f.hq}</div>
              </button>
              {days.map((d) => {
                const isToday = iso(d) === todayIso
                const dayCamps = campsByFoDay.get(`${f.id}::${iso(d)}`) ?? []
                return (
                  <div
                    key={iso(d)}
                    className="px-1.5 py-2 flex flex-col gap-1"
                    style={{ background: isToday ? 'color-mix(in oklab, var(--qms-brand) 5%, transparent)' : 'transparent' }}
                  >
                    {dayCamps.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => stubOpenCamp(c.id)}
                        className="text-[10px] font-semibold px-1.5 py-1 rounded-md truncate text-left"
                        style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)', border: '1px solid var(--qms-border)' }}
                        title={`${c.id} · ${c.type}`}
                      >
                        {c.id} · {c.type}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No FOs match these filters.</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AssignmentsTab
