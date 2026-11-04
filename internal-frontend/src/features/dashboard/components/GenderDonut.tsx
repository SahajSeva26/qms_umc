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

// Each slice's offset is the running sum of prior dash lengths, computed as
// its own pass so repeated renders with the same props are deterministic.
function withOffsets(slices: Slice[]): (Slice & { dash: number; offset: number })[] {
  let cursor = 0
  return slices.map((slice) => {
    const dash = (slice.share / 100) * CIRCUMFERENCE
    const withOffset = { ...slice, dash, offset: cursor }
    cursor += dash
    return withOffset
  })
}

const GenderDonut = ({ slices }: GenderDonutProps) => {
  const slicesWithOffsets = withOffsets(slices)

  return (
    <div className="flex items-center gap-6">
      <svg width={104} height={104} viewBox="0 0 104 104" className="shrink-0 -rotate-90">
        <circle cx={52} cy={52} r={RADIUS} fill="none" stroke="var(--qms-surface-strong)" strokeWidth={14} />
        {slicesWithOffsets.map(({ dash, offset, ...slice }) => (
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
        ))}
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
