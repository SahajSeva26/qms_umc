import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LineChart from './LineChart'

function dailyLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`)
}

describe('LineChart — x-axis label sampling', () => {
  it('samples a long daily series down to roughly 6-8 ticks instead of rendering every point', () => {
    const labels = dailyLabels(30)
    render(
      <LineChart
        series={[{ label: 'Series', color: '#000', data: labels.map(() => 1) }]}
        labels={labels}
        formatY={(v) => String(v)}
      />,
    )
    const rendered = labels.filter((l) => screen.queryByText(l) !== null)
    expect(rendered.length).toBeGreaterThanOrEqual(6)
    expect(rendered.length).toBeLessThanOrEqual(8)
  })

  it('always keeps the first and last label, even for a 365-point series', () => {
    const labels = Array.from({ length: 365 }, (_, i) => `day-${i}`)
    render(
      <LineChart
        series={[{ label: 'Series', color: '#000', data: labels.map(() => 1) }]}
        labels={labels}
        formatY={(v) => String(v)}
      />,
    )
    expect(screen.getByText(labels[0])).toBeInTheDocument()
    expect(screen.getByText(labels[labels.length - 1])).toBeInTheDocument()
    const rendered = labels.filter((l) => screen.queryByText(l) !== null)
    expect(rendered.length).toBeLessThanOrEqual(8)
  })

  it('still samples down a 12-week series to a handful of ticks, always keeping the first and last', () => {
    const labels = Array.from({ length: 12 }, (_, i) => `W${i + 1}`)
    render(
      <LineChart
        series={[{ label: 'Series', color: '#000', data: labels.map(() => 1) }]}
        labels={labels}
        formatY={(v) => String(v)}
      />,
    )
    expect(screen.getByText('W1')).toBeInTheDocument()
    expect(screen.getByText('W12')).toBeInTheDocument()
    const rendered = labels.filter((l) => screen.queryByText(l) !== null)
    expect(rendered.length).toBeLessThanOrEqual(8)
  })

  it('renders every label on a series at or below the tick target (e.g. 6 points)', () => {
    const labels = Array.from({ length: 6 }, (_, i) => `W${i + 1}`)
    render(
      <LineChart
        series={[{ label: 'Series', color: '#000', data: labels.map(() => 1) }]}
        labels={labels}
        formatY={(v) => String(v)}
      />,
    )
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })
})

describe('LineChart — formatLabel', () => {
  it('renders raw labels unchanged when formatLabel is omitted (existing-caller regression guard)', () => {
    render(
      <LineChart
        series={[{ label: 'Series', color: '#000', data: [1, 2] }]}
        labels={['2026-09-01', '2026-09-02']}
        formatY={(v) => String(v)}
      />,
    )
    expect(screen.getByText('2026-09-01')).toBeInTheDocument()
  })

  it('applies formatLabel to transform each rendered axis label', () => {
    render(
      <LineChart
        series={[{ label: 'Series', color: '#000', data: [1, 2] }]}
        labels={['2026-09-01', '2026-09-02']}
        formatY={(v) => String(v)}
        formatLabel={(period) => (period.length === 10 ? period.slice(5) : period)}
      />,
    )
    expect(screen.getByText('09-01')).toBeInTheDocument()
    expect(screen.queryByText('2026-09-01')).not.toBeInTheDocument()
  })
})
