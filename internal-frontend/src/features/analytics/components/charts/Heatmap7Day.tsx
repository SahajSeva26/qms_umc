interface HeatmapCell {
  state: string
  /** ISO date (YYYY-MM-DD) */
  date: string
  count: number
}

interface Heatmap7DayProps {
  states: string[]
  days: string[]
  cells: HeatmapCell[]
}

// RGB decomposition of --qms-brand (#2451f0) — needed as a triplet so opacity
// can scale with cell intensity; kept in sync with the token manually since
// CSS custom properties can't be read as separate r/g/b components.
const BRAND_RGB = '36,81,240'

// Bespoke 7-day-by-state activity grid — always the trailing real 7 days,
// mirroring the prototype's heatmap (it ignores the period selector too).
const Heatmap7Day = ({ states, days, cells }: Heatmap7DayProps) => {
  const cellFor = (state: string, date: string) => cells.find((c) => c.state === state && c.date === date)
  const maxCount = Math.max(1, ...cells.map((c) => c.count))

  const dayLabel = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { weekday: 'short' })

  return (
    <div className="overflow-x-auto">
      <table className="text-[11px]">
        <thead>
          <tr>
            <th className="text-left font-semibold pr-3 pb-1.5" style={{ color: 'var(--qms-text-muted)' }} />
            {days.map((d) => (
              <th key={d} className="font-semibold px-1 pb-1.5 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                {dayLabel(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {states.map((state) => (
            <tr key={state}>
              <td className="pr-3 py-0.5 font-semibold truncate max-w-24" style={{ color: 'var(--qms-text)' }}>{state}</td>
              {days.map((d) => {
                const cell = cellFor(state, d)
                const count = cell?.count ?? 0
                const opacity = count > 0 ? Math.max(0.18, count / maxCount) : 0
                return (
                  <td key={d} className="px-1 py-0.5">
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center font-bold"
                      style={
                        count > 0
                          ? { background: `rgba(${BRAND_RGB},${opacity})`, color: opacity > 0.5 ? '#fff' : 'var(--qms-text)' }
                          : { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }
                      }
                      title={`${state} · ${d}: ${count}`}
                    >
                      {count > 0 ? count : '—'}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
          {states.length === 0 && (
            <tr>
              <td colSpan={days.length + 1} className="py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                No camp activity in the last 7 days.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default Heatmap7Day
