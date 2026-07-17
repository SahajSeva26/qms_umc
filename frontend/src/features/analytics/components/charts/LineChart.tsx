import { useState } from 'react'

export interface LineSeries {
  label: string
  color: string
  data: number[]
}

interface LineChartProps {
  series: LineSeries[]
  labels: string[]
  formatY: (value: number) => string
  height?: number
}

const WIDTH = 640
const PADDING_LEFT = 56
const PADDING_BOTTOM = 24
const PADDING_TOP = 12

// One axis only — both series share the same y-scale (dataviz skill rule:
// never a dual-axis chart). Legend + direct hover tooltip per point.
const LineChart = ({ series, labels, formatY, height = 220 }: LineChartProps) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const allValues = series.flatMap((s) => s.data)
  const maxValue = Math.max(1, ...allValues)
  const plotWidth = WIDTH - PADDING_LEFT - 12
  const plotHeight = height - PADDING_TOP - PADDING_BOTTOM
  const stepX = labels.length > 1 ? plotWidth / (labels.length - 1) : 0

  const yFor = (value: number) => PADDING_TOP + plotHeight - (value / maxValue) * plotHeight
  const xFor = (i: number) => PADDING_LEFT + i * stepX

  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const value = (maxValue / 4) * i
    return { value, y: yFor(value) }
  })

  return (
    <div>
      <svg
        width="100%"
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label={series.map((s) => s.label).join(' vs ')}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {gridLines.map((g) => (
          <g key={g.value}>
            <line x1={PADDING_LEFT} y1={g.y} x2={WIDTH - 12} y2={g.y} stroke="var(--qms-border)" strokeWidth={1} />
            <text x={PADDING_LEFT - 8} y={g.y + 4} textAnchor="end" fontSize={10} fill="var(--qms-text-muted)">
              {formatY(g.value)}
            </text>
          </g>
        ))}

        {series.map((s) => {
          const points = s.data.map((v, i) => [xFor(i), yFor(v)] as const)
          const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
          const areaPath = `${linePath} L${points[points.length - 1]?.[0] ?? 0},${PADDING_TOP + plotHeight} L${PADDING_LEFT},${PADDING_TOP + plotHeight} Z`
          return (
            <g key={s.label}>
              <path d={areaPath} fill={s.color} opacity={0.1} />
              <path d={linePath} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              {points.map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={hoverIndex === i ? 5 : 3}
                  fill={s.color}
                  stroke="var(--qms-surface-card)"
                  strokeWidth={2}
                  onMouseEnter={() => setHoverIndex(i)}
                >
                  <title>{`${s.label} · ${labels[i]}: ${formatY(s.data[i])}`}</title>
                </circle>
              ))}
            </g>
          )
        })}

        {hoverIndex !== null && (
          <line
            x1={xFor(hoverIndex)}
            y1={PADDING_TOP}
            x2={xFor(hoverIndex)}
            y2={PADDING_TOP + plotHeight}
            stroke="var(--qms-text-muted)"
            strokeWidth={1}
            strokeDasharray="3 3"
            pointerEvents="none"
          />
        )}

        {labels.map((label, i) => (
          <text
            key={label}
            x={xFor(i)}
            y={height - 6}
            textAnchor="middle"
            fontSize={9}
            fill="var(--qms-text-muted)"
            style={{ display: i % 2 === 0 ? undefined : 'none' }}
          >
            {label}
          </text>
        ))}
      </svg>

      <div className="flex items-center gap-4 mt-1">
        {series.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default LineChart
