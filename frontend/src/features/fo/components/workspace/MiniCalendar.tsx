import { useMemo, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'

interface MiniCalendarProps {
  camps: Camp[]
  onSelectDay: (dayCamps: Camp[]) => void
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Current-month grid — Monday-first, leading/trailing blanks from adjacent
// months included so the grid is always a multiple of 7 cells.
function buildMonthGrid(anchor: Date): (Date | null)[] {
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const firstDay = (firstOfMonth.getDay() + 6) % 7 // 0=Mon..6=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const MiniCalendar = ({ camps, onSelectDay }: MiniCalendarProps) => {
  const [anchor, setAnchor] = useState(() => new Date())
  const todayStr = iso(new Date())

  const campsByDay = useMemo(() => {
    const map = new Map<string, Camp[]>()
    for (const c of camps) {
      if (!c.date) continue
      const key = c.date.slice(0, 10)
      const arr = map.get(key) ?? []
      arr.push(c)
      map.set(key, arr)
    }
    return map
  }, [camps])

  const cells = useMemo(() => buildMonthGrid(anchor), [anchor])

  const monthLabel = anchor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const shiftMonth = (delta: number) => {
    setAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  return (
    <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[12.5px] font-bold" style={{ color: 'var(--qms-text)' }}>{monthLabel}</div>
        <div className="flex items-center gap-1">
          <button onClick={() => shiftMonth(-1)} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ color: 'var(--qms-text-muted)' }} aria-label="Previous month">
            <FiChevronLeft size={13} />
          </button>
          <button onClick={() => setAnchor(new Date())} className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md" style={{ color: 'var(--qms-text-muted)' }}>
            Today
          </button>
          <button onClick={() => shiftMonth(1)} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ color: 'var(--qms-text-muted)' }} aria-label="Next month">
            <FiChevronRight size={13} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((l, i) => (
          <div key={i} className="text-center text-[9.5px] font-bold uppercase" style={{ color: 'var(--qms-text-muted)' }}>{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const key = iso(d)
          const dayCamps = campsByDay.get(key) ?? []
          const isToday = key === todayStr
          return (
            <button
              key={i}
              onClick={() => dayCamps.length > 0 && onSelectDay(dayCamps)}
              disabled={dayCamps.length === 0}
              className="aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors disabled:cursor-default"
              style={{
                background: isToday ? 'color-mix(in oklab, var(--qms-brand) 12%, transparent)' : 'transparent',
                border: isToday ? '1.5px solid var(--qms-brand)' : '1px solid transparent',
              }}
            >
              <span className="text-[11px] font-semibold" style={{ color: isToday ? 'var(--qms-brand)' : 'var(--qms-text)' }}>{d.getDate()}</span>
              {dayCamps.length > 0 && <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--qms-teal)' }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default MiniCalendar
