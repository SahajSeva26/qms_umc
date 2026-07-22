import { useMemo } from 'react'
import { FiFilter, FiXCircle, FiUsers, FiBriefcase } from 'react-icons/fi'
import type { LeadEntity, LeadStatus } from '@/types/crm.types'
import { LEAD_STATUS_LABEL, LEAD_STATUS_COLOR } from '@/types/crm.types'
import { roleLabel, tenantLabel } from '@/features/crm/crm.utils'
import { formatINR } from '@/utils/formatters'
import AnalyticsSectionCard from '@/features/analytics/components/AnalyticsSectionCard'
import Donut from '@/features/analytics/components/charts/Donut'
import FunnelChart from '@/features/analytics/components/charts/FunnelChart'
import BarsHorizontal from '@/features/analytics/components/charts/BarsHorizontal'

// All 7 real statuses (LeadEntity.status), replacing the old mock model's
// 4-column STAGES + spliced-out LOST_STAGE — the real backend has no
// "quotation" stage and no separate lost-category taxonomy (see
// LEAD_TRANSITION_MAP/LEAD_STATUS_LABEL in crm.types.ts), so every status
// gets one funnel row and nothing is collapsed/invented.
const FUNNEL_STATUSES: LeadStatus[] = ['new', 'qualified', 'proposal', 'pilot', 'negotiation', 'won', 'lost']

interface SalesPipelineTabProps {
  leads: LeadEntity[]
}

const SalesPipelineTab = ({ leads }: SalesPipelineTabProps) => {
  const funnelRows = useMemo(() => {
    return FUNNEL_STATUSES.map((status) => {
      const statusLeads = leads.filter((l) => l.status === status)
      return {
        label: LEAD_STATUS_LABEL[status],
        count: statusLeads.length,
        value: statusLeads.reduce((sum, l) => sum + l.estimatedValue, 0),
        color: LEAD_STATUS_COLOR[status],
      }
    })
  }, [leads])

  const totalPipelineValue = leads.reduce((sum, l) => sum + l.estimatedValue, 0)

  const wonLeads = useMemo(() => leads.filter((l) => l.status === 'won'), [leads])
  const lostLeads = useMemo(() => leads.filter((l) => l.status === 'lost'), [leads])

  // No lost-category taxonomy exists server-side (LeadStageHistoryEntry only
  // carries a free-text `reason`, not a fixed enum) — a won/lost value split
  // is real data instead of an invented category breakdown; the actual
  // reasons are listed as text below it.
  const wonLostSplit = useMemo(
    () => [
      { label: 'Won', value: wonLeads.reduce((sum, l) => sum + l.estimatedValue, 0), color: LEAD_STATUS_COLOR.won },
      { label: 'Lost', value: lostLeads.reduce((sum, l) => sum + l.estimatedValue, 0), color: LEAD_STATUS_COLOR.lost },
    ],
    [wonLeads, lostLeads]
  )

  const lostReasons = useMemo(
    () =>
      lostLeads
        .map((l) => l.stageHistory.filter((h) => h.to === 'lost').slice(-1)[0]?.reason)
        .filter((reason): reason is string => !!reason),
    [lostLeads]
  )

  const bySalesPerson = useMemo(() => {
    const groups = new Map<string, LeadEntity[]>()
    for (const l of leads) {
      const key = roleLabel(l.salesPerson)
      groups.set(key, [...(groups.get(key) ?? []), l])
    }
    return [...groups.entries()]
      .map(([salesPerson, ls]) => ({
        salesPerson,
        leads: ls.length,
        won: ls.filter((l) => l.status === 'won').length,
        pipeline: ls.reduce((sum, l) => sum + l.estimatedValue, 0),
      }))
      .sort((a, b) => b.won - a.won)
  }, [leads])

  const topAccounts = useMemo(() => {
    const groups = new Map<string, number>()
    for (const l of leads) {
      const key = tenantLabel(l.tenant)
      groups.set(key, (groups.get(key) ?? 0) + l.estimatedValue)
    }
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
        title="Won vs lost value"
        subtitle={`${lostLeads.length} lost`}
      >
        <Donut slices={wonLostSplit} centerLabel={String(wonLeads.length + lostLeads.length)} centerSub="closed" />
        {lostReasons.length > 0 && (
          <ul className="mt-3 space-y-1 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
            {lostReasons.slice(0, 5).map((reason, i) => (
              <li key={i} className="truncate">· {reason}</li>
            ))}
          </ul>
        )}
      </AnalyticsSectionCard>

      <AnalyticsSectionCard
        icon={FiUsers}
        iconGradient="linear-gradient(135deg, var(--chart-5), #10b981)"
        title="By sales person"
        subtitle="Won / win rate / pipeline"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                {['Sales person', 'Leads', 'Won', 'Win%', 'Pipeline'].map((h) => (
                  <th key={h} className="text-left font-bold text-[11px] uppercase tracking-wider px-3 py-2" style={{ color: 'var(--qms-text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bySalesPerson.map((row) => (
                <tr key={row.salesPerson} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  <td className="px-3 py-2 font-semibold" style={{ color: 'var(--qms-text)' }}>{row.salesPerson}</td>
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
