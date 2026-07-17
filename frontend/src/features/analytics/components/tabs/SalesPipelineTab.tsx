import { useMemo } from 'react'
import { FiFilter, FiXCircle, FiUsers, FiBriefcase } from 'react-icons/fi'
import type { Lead } from '@/types/lead.types'
import { STAGES, LOST_STAGE, LOST_CATEGORIES } from '@/types/lead.types'
import { formatINR } from '@/utils/formatters'
import AnalyticsSectionCard from '@/features/analytics/components/AnalyticsSectionCard'
import Donut from '@/features/analytics/components/charts/Donut'
import FunnelChart from '@/features/analytics/components/charts/FunnelChart'
import BarsHorizontal from '@/features/analytics/components/charts/BarsHorizontal'

const LOST_PALETTE = ['#f43f5e', '#f59e0b', 'var(--chart-3)', '#0ea5e9', '#94a3b8', '#a855f7', '#14b8a6', '#fb7185']

interface SalesPipelineTabProps {
  leads: Lead[]
}

const SalesPipelineTab = ({ leads }: SalesPipelineTabProps) => {
  const funnelRows = useMemo(() => {
    const stages = [...STAGES, LOST_STAGE]
    return stages.map((s) => {
      const stageLeads = leads.filter((l) => l.stage === s.id)
      return { label: s.name, count: stageLeads.length, value: stageLeads.reduce((sum, l) => sum + l.value, 0), color: s.color }
    })
  }, [leads])

  const totalPipelineValue = leads.reduce((sum, l) => sum + l.value, 0)

  const lostLeads = useMemo(() => leads.filter((l) => l.stage === 'lost'), [leads])
  const lostReasons = useMemo(() => {
    const counts = new Map<string, number>()
    for (const l of lostLeads) {
      const key = l.lostCategory || 'other'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return LOST_CATEGORIES.map((cat, i) => ({ label: cat, value: counts.get(cat) ?? 0, color: LOST_PALETTE[i % LOST_PALETTE.length] })).filter(
      (s) => s.value > 0
    )
  }, [lostLeads])

  const byOwner = useMemo(() => {
    const groups = new Map<string, Lead[]>()
    for (const l of leads) {
      const key = l.owner || 'Unknown'
      groups.set(key, [...(groups.get(key) ?? []), l])
    }
    return [...groups.entries()]
      .map(([owner, ls]) => ({
        owner,
        leads: ls.length,
        won: ls.filter((l) => l.stage === 'won').length,
        pipeline: ls.reduce((sum, l) => sum + l.value, 0),
      }))
      .sort((a, b) => b.won - a.won)
  }, [leads])

  const topAccounts = useMemo(() => {
    const groups = new Map<string, number>()
    for (const l of leads) groups.set(l.account, (groups.get(l.account) ?? 0) + l.value)
    return [...groups.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([account, value]) => ({ label: account, value, formattedValue: formatINR(value) }))
  }, [leads])

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
      <AnalyticsSectionCard
        icon={FiFilter}
        iconGradient="linear-gradient(135deg, var(--chart-1), var(--qms-teal))"
        title="Pipeline funnel"
        subtitle={`${leads.length} leads · ${formatINR(totalPipelineValue)}`}
      >
        <FunnelChart rows={funnelRows} />
      </AnalyticsSectionCard>

      <AnalyticsSectionCard
        icon={FiXCircle}
        iconGradient="linear-gradient(135deg, #f43f5e, #f59e0b)"
        title="Lost reasons"
        subtitle={`${lostLeads.length} lost`}
      >
        <Donut slices={lostReasons} centerLabel={String(lostLeads.length)} centerSub="lost" />
      </AnalyticsSectionCard>

      <AnalyticsSectionCard
        icon={FiUsers}
        iconGradient="linear-gradient(135deg, var(--chart-5), #10b981)"
        title="By owner"
        subtitle="Won / win rate / pipeline"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                {['Owner', 'Leads', 'Won', 'Win%', 'Pipeline'].map((h) => (
                  <th key={h} className="text-left font-bold text-[11px] uppercase tracking-wider px-3 py-2" style={{ color: 'var(--qms-text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byOwner.map((row) => (
                <tr key={row.owner} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  <td className="px-3 py-2 font-semibold" style={{ color: 'var(--qms-text)' }}>{row.owner}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.leads}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.won}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{row.leads > 0 ? Math.round((row.won / row.leads) * 100) : 0}%</td>
                  <td className="px-3 py-2 font-bold" style={{ color: 'var(--qms-text)' }}>{formatINR(row.pipeline)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnalyticsSectionCard>

      <AnalyticsSectionCard
        icon={FiBriefcase}
        iconGradient="linear-gradient(135deg, var(--chart-3), #a855f7)"
        title="Top accounts by value"
        subtitle="Top 10"
      >
        <BarsHorizontal bars={topAccounts} />
      </AnalyticsSectionCard>
    </div>
  )
}

export default SalesPipelineTab
