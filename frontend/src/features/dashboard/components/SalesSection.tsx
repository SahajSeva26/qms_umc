import { useState } from 'react'
import { FiUsers, FiExternalLink } from 'react-icons/fi'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import { formatINR, formatPercent } from '@/utils/formatters'
import SectionCard from '@/features/dashboard/components/SectionCard'
import MiniKpiCard from '@/features/dashboard/components/MiniKpiCard'
import FilterChips from '@/features/dashboard/components/FilterChips'

const REP_FILTERS = ['All reps', 'Top performers', 'At risk']

function convClass(conv: number): string {
  if (conv >= 35) return 'bg-success-soft text-success'
  if (conv >= 25) return 'bg-warning-soft text-warning'
  return 'bg-danger-soft text-danger'
}

interface SalesSectionProps {
  onDrill: (title: string, content: string) => void
}

const SalesSection = ({ onDrill }: SalesSectionProps) => {
  const [repFilter, setRepFilter] = useState('All reps')
  const { data } = useDashboardData()

  if (!data) return null
  const { sales } = data

  const rows = sales.repBreakdown.filter((r) => {
    if (repFilter === 'All reps') return true
    const ratio = r.achieved / r.target
    if (repFilter === 'Top performers') return ratio >= 1
    return ratio < 0.7 // At risk
  })

  return (
    <SectionCard
      icon={FiUsers}
      iconGradient="linear-gradient(135deg, var(--qms-role-logistics), #ec4899)"
      title="Sales team"
      subtitle={`${rows.length} rep(s) · click any row for individual dashboard`}
      headerAction={
        <button
          onClick={() => onDrill('Sales', 'Dedicated Sales module ships next.')}
          className="flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-lg border transition-all hover:bg-(--qms-surface-hover)"
          style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
        >
          <FiExternalLink size={13} /> Open Sales
        </button>
      }
    >
      <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        <MiniKpiCard label="No. of Projects" data={sales.totalProjects} />
        <MiniKpiCard label="Total Billing" data={sales.totalBilling} />
        <MiniKpiCard label="Outstanding" data={sales.outstanding} />
        <MiniKpiCard label="Total Leads" data={sales.totalLeads} />
        <MiniKpiCard label="Follow-ups" data={sales.followUps} />
        <MiniKpiCard label="Lead → PO Conv." data={sales.leadToPo} />
      </div>

      <FilterChips options={REP_FILTERS} active={repFilter} onChange={setRepFilter} />

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
              {['Rep', 'Target', 'Achieved', 'Progress', 'Leads', 'Conv.', 'Projects'].map((h) => (
                <th
                  key={h}
                  className="text-left font-bold text-[11px] uppercase tracking-wider px-3 py-2"
                  style={{ color: 'var(--qms-text-muted)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((rep) => {
              const progress = Math.min(100, Math.round((rep.achieved / rep.target) * 100))
              return (
                <tr
                  key={rep.rep}
                  onClick={() => onDrill(rep.rep, `Target ${formatINR(rep.target)} · Achieved ${formatINR(rep.achieved)} · ${rep.leads} leads · ${rep.projects} projects`)}
                  className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                  style={{ borderBottom: '1px solid var(--qms-border)' }}
                >
                  <td className="px-3 py-2 font-semibold" style={{ color: 'var(--qms-text)' }}>{rep.rep}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--qms-text-muted)' }}>{formatINR(rep.target)}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--qms-text)' }}>{formatINR(rep.achieved)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--qms-surface-strong)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--qms-brand), var(--qms-teal))' }}
                        />
                      </div>
                      <span className="text-[11px] tabular-nums" style={{ color: 'var(--qms-text-muted)' }}>{progress}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--qms-text-muted)' }}>{rep.leads}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${convClass(rep.conv)}`}>
                      {formatPercent(rep.conv, 0)}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--qms-text-muted)' }}>{rep.projects}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}

export default SalesSection
