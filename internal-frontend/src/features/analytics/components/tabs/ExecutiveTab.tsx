import { useMemo } from 'react'
import { FiTrendingUp, FiPieChart, FiCalendar } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import type { Client } from '@/types/client.types'
import type { PnlTrend } from '@/types/analytics.types'
import { formatINR } from '@/utils/formatters'
import AnalyticsSectionCard from '@/features/analytics/components/AnalyticsSectionCard'
import Donut from '@/features/analytics/components/charts/Donut'
import LineChart from '@/features/analytics/components/charts/LineChart'

const CHART_PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', '#0ea5e9', '#f43f5e', '#a855f7']

interface ExecutiveTabProps {
  camps: Camp[]
  clients: Client[]
  pnlTrend: PnlTrend
}

const ExecutiveTab = ({ camps, clients, pnlTrend }: ExecutiveTabProps) => {
  const closed = useMemo(() => camps.filter((c) => c.status === 'CLOSED'), [camps])

  const clientMix = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of closed) counts.set(c.clientId, (counts.get(c.clientId) ?? 0) + 1)
    return [...counts.entries()]
      .map(([clientId, value], i) => {
        const client = clients.find((cl) => cl.id === clientId)
        return { label: client?.name ?? clientId, value, color: client?.color || CHART_PALETTE[i % CHART_PALETTE.length] }
      })
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [closed, clients])

  const monthlyOutcomes = useMemo(() => {
    const byMonth = new Map<string, { camps: number; patients: number; rx: number }>()
    for (const c of closed) {
      const month = c.date.slice(0, 7)
      const entry = byMonth.get(month) ?? { camps: 0, patients: 0, rx: 0 }
      entry.camps += 1
      entry.patients += c.patientsDone || 0
      entry.rx += c.rxCount || 0
      byMonth.set(month, entry)
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 6)
      .map(([month, v]) => ({
        month,
        ...v,
        rxRate: v.patients > 0 ? Math.round((v.rx / v.patients) * 100) : 0,
      }))
  }, [closed])

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
      <AnalyticsSectionCard
        icon={FiTrendingUp}
        iconGradient="linear-gradient(135deg, var(--chart-1), var(--chart-2))"
        title="Revenue vs Expense"
        subtitle="12-week trend"
      >
        <LineChart
          series={[
            { label: 'Revenue', color: '#10b981', data: pnlTrend.revenue.map((p) => p.amount) },
            { label: 'Expense', color: '#f43f5e', data: pnlTrend.expense.map((p) => p.amount) },
          ]}
          labels={pnlTrend.revenue.map((p) => p.week)}
          formatY={formatINR}
        />
      </AnalyticsSectionCard>

      <AnalyticsSectionCard
        icon={FiPieChart}
        iconGradient="linear-gradient(135deg, var(--chart-3), #a855f7)"
        title="Client mix (closed camps)"
        subtitle="Current filters"
      >
        <Donut slices={clientMix} centerLabel={String(closed.length)} centerSub="camps" />
      </AnalyticsSectionCard>

      <div className="md:col-span-2">
        <AnalyticsSectionCard
          icon={FiCalendar}
          iconGradient="linear-gradient(135deg, var(--chart-2), var(--qms-brand))"
          title="Monthly outcomes"
          subtitle="Last 6 months"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  {['Month', 'Camps', 'Patients', 'Rx', 'Rx conversion'].map((h) => (
                    <th key={h} className="text-left font-bold text-[11px] uppercase tracking-wider px-3 py-2" style={{ color: 'var(--qms-text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyOutcomes.map((row) => (
                  <tr key={row.month} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                    <td className="px-3 py-2 font-semibold" style={{ color: 'var(--qms-text)' }}>{row.month}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.camps}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.patients}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.rx}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.rxRate}%</td>
                  </tr>
                ))}
                {monthlyOutcomes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                      No closed camps in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AnalyticsSectionCard>
      </div>
    </div>
  )
}

export default ExecutiveTab
