export interface DonutSlice {
  label: string
  value: number
  color: string
}

interface DonutProps {
  slices: DonutSlice[]
  centerLabel: string
  centerSub: string
  /** Rendered below the donut/legend as a fallback when a screen reader or
   * table view is needed — callers render their own table, this just needs
   * the raw slices exposed via the DOM for it (handled by caller). */
  size?: number
}

const RADIUS_RATIO = 0.35
const STROKE_RATIO = 0.135

// Generalized N-slice arc-path donut (stroke-dasharray technique, same as the
// prototype's donut() helper) — replaces per-caller-hardcoded share math with
// slices computed here from raw values, so any tab can hand it real numbers.
const Donut = ({ slices, centerLabel, centerSub, size = 120 }: DonutProps) => {
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  const radius = size * RADIUS_RATIO
  const strokeWidth = size * STROKE_RATIO
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  let offset = 0

  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--qms-surface-strong)" strokeWidth={strokeWidth} />
          {total > 0 &&
            slices.map((slice) => {
              const share = slice.value / total
              const dash = share * circumference
              const el = (
                <circle
                  key={slice.label}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                >
                  <title>{`${slice.label}: ${slice.value.toLocaleString('en-IN')}`}</title>
                </circle>
              )
              offset += dash
              return el
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[16px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{centerLabel}</span>
          <span className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>{centerSub}</span>
        </div>
      </div>
      <div className="space-y-1.5 min-w-0">
        {slices.map((slice) => (
          <div key={slice.label} className="flex items-center gap-2 text-[12px]">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: slice.color }} />
            <span className="truncate" style={{ color: 'var(--qms-text)' }}>{slice.label}</span>
            <span className="font-bold shrink-0 tabular-nums" style={{ color: 'var(--qms-text)' }}>
              {slice.value.toLocaleString('en-IN')}
            </span>
          </div>
        ))}
        {slices.length === 0 && (
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No data for this period.</p>
        )}
      </div>
    </div>
  )
}

export default Donut
