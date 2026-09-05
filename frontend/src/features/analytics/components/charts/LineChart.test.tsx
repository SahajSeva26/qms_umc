import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LineChart from './LineChart'

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
