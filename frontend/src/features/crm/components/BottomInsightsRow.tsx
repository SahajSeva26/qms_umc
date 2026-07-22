import { useState } from 'react'
import { FiZap } from 'react-icons/fi'
import type { Lead } from '@/types/lead.types'
import { OWNERS } from '@/features/crm/crm.mock'
import { formatINR } from '@/utils/formatters'
import UserAvatar from '@/components/ui/UserAvatar'
import { ACTIVITY_TIMELINE } from '@/features/crm/crm.insights'
import RecordsDrawer from '@/features/crm/components/RecordsDrawer'

interface BottomInsightsRowProps {
  leads: Lead[]
}

type Drill = { title: string; exportSlug: string; leads: Lead[] } | null

// Matches the violet "AI" accent used elsewhere in this module (AiRecommendationsTab, PerformanceTab's EFFORT_GRADIENT).
const AI_ACCENT = '#8b5cf6'

const BottomInsightsRow = ({ leads }: BottomInsightsRowProps) => {
  const [drill, setDrill] = useState<Drill>(null)

  const dormant = leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost' && l.age > 20)
  const atRisk = leads.filter((l) => l.stage === 'negotiation' && l.score < 65)

  const repTotals = OWNERS.map((owner) => ({
    ...owner,
    wonLeads: leads.filter((l) => l.owner === owner.name && l.stage === 'won'),
  }))
    .map((rep) => ({ ...rep, won: rep.wonLeads.reduce((s, l) => s + l.value, 0) }))
    .sort((a, b) => b.won - a.won)
    .slice(0, 5)

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      <div className="rounded-2xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <h3 className="text-[13px] font-bold mb-3 flex items-center gap-1.5" style={{ color: 'var(--qms-text)' }}>
          <FiZap size={13} style={{ color: AI_ACCENT }} /> AI Insights &amp; Suggested Actions
        </h3>
        <div className="space-y-2 text-[12px]">
          {dormant.length > 0 && (
            <button
              onClick={() => setDrill({ title: 'Dormant leads (20+ days idle)', exportSlug: 'insight-dormant', leads: dormant })}
              className="w-full text-left rounded-lg p-2.5 transition-colors hover:bg-(--qms-surface-hover)"
              style={{ background: 'var(--qms-surface-strong)' }}
            >
              {dormant.length} lead{dormant.length === 1 ? '' : 's'} idle 20+ days — consider re-engagement outreach.
            </button>
          )}
          {atRisk.length > 0 && (
            <button
              onClick={() => setDrill({ title: 'At-risk negotiations (below-average score)', exportSlug: 'insight-at-risk', leads: atRisk })}
              className="w-full text-left rounded-lg p-2.5 transition-colors hover:bg-(--qms-surface-hover)"
              style={{ background: 'var(--qms-surface-strong)' }}
            >
              {atRisk.length} negotiation-stage lead{atRisk.length === 1 ? '' : 's'} with below-average AI score — flag for manager review.
            </button>
          )}
          {dormant.length === 0 && atRisk.length === 0 && (
            <p style={{ color: 'var(--qms-text-muted)' }}>No urgent flags right now.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--qms-text)' }}>Recent Activity</h3>
        <div className="space-y-2">
          {ACTIVITY_TIMELINE.slice(0, 4).map((entry, i) => (
            <div key={i} className="text-[12px]">
              <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{entry.actor}</span>{' '}
              <span style={{ color: 'var(--qms-text-muted)' }}>{entry.action} · {entry.at}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--qms-text)' }}>Top Reps · MTD</h3>
        <div className="space-y-2">
          {repTotals.map((rep) => (
            <button
              key={rep.name}
              onClick={() => setDrill({ title: `${rep.name} — Won this month`, exportSlug: `rep-${rep.name.toLowerCase().replace(/\s+/g, '-')}`, leads: rep.wonLeads })}
              className="w-full flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-(--qms-surface-hover)"
              disabled={rep.wonLeads.length === 0}
            >
              <UserAvatar firstName={rep.name.split(' ')[0]} lastName={rep.name.split(' ')[1]} tone={rep.tone} size="sm" />
              <span className="text-[12px] flex-1 truncate text-left" style={{ color: 'var(--qms-text)' }}>{rep.name}</span>
              <span className="text-[12px] font-bold" style={{ color: 'var(--qms-text)' }}>{formatINR(rep.won)}</span>
            </button>
          ))}
        </div>
      </div>

      {drill && (
        <RecordsDrawer title={drill.title} exportSlug={drill.exportSlug} leads={drill.leads} onClose={() => setDrill(null)} />
      )}
    </div>
  )
}

export default BottomInsightsRow
