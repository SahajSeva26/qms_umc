interface Slice {
  label: string
  value: number
  share: number
  color: string
}

interface GenderDonutProps {
  slices: Slice[]
}

const RADIUS = 36
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const GenderDonut = ({ slices }: GenderDonutProps) => {
  let offset = 0

  return (
    <div className="flex items-center gap-6">
      <svg width={104} height={104} viewBox="0 0 104 104" className="shrink-0 -rotate-90">
        <circle cx={52} cy={52} r={RADIUS} fill="none" stroke="var(--qms-surface-strong)" strokeWidth={14} />
        {slices.map((slice) => {
          const dash = (slice.share / 100) * CIRCUMFERENCE
          const circle = (
            <circle
              key={slice.label}
              cx={52}
              cy={52}
              r={RADIUS}
              fill="none"
              stroke={slice.color}
              strokeWidth={14}
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          )
          offset += dash
          return circle
        })}
      </svg>
      <div className="space-y-1.5">
        {slices.map((slice) => (
          <div key={slice.label} className="flex items-center gap-2 text-[13px]">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: slice.color }} />
            <span style={{ color: 'var(--qms-text)' }}>{slice.label}</span>
            <span className="font-bold ml-1 tabular-nums" style={{ color: 'var(--qms-text)' }}>
              {slice.value.toLocaleString('en-IN')} · {slice.share}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default GenderDonut
