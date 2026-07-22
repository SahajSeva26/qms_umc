import { useState } from 'react'
import { FiZap } from 'react-icons/fi'
import type { LeadEntity } from '@/types/crm.types'
import { formatINR } from '@/utils/formatters'
import UserAvatar from '@/components/ui/UserAvatar'
import RecordsDrawer from '@/features/crm/components/RecordsDrawer'

interface BottomInsightsRowProps {
  leads: LeadEntity[]
}

type Drill = { title: string; exportSlug: string; leads: LeadEntity[] } | null

// Matches the violet "AI" accent used elsewhere in this module (AiRecommendationsTab, PerformanceTab's EFFORT_GRADIENT).
const AI_ACCENT = '#8b5cf6'

function daysSince(date: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000))
}

// Grouped by salesPerson.id (real Role field), not a fabricated roster —
// no separate "owners" mock list needed since LeadEntity.salesPerson is the
// real, fully-populated Role document.
function topRepsByWon(leads: LeadEntity[]) {
  const won = leads.filter((l) => l.status === 'won')
  const byRep = new Map<string, { id: string; name: string; leads: LeadEntity[]; total: number }>()

  for (const lead of won) {
    if (typeof lead.salesPerson === 'string') continue
    const rep = lead.salesPerson
    const existing = byRep.get(rep._id ?? rep.code)
    if (existing) {
      existing.leads.push(lead)
      existing.total += lead.estimatedValue
    } else {
      byRep.set(rep._id ?? rep.code, { id: rep._id ?? rep.code, name: rep.name, leads: [lead], total: lead.estimatedValue })
    }
  }

  return [...byRep.values()].sort((a, b) => b.total - a.total).slice(0, 5)
}

const BottomInsightsRow = ({ leads }: BottomInsightsRowProps) => {
  const [drill, setDrill] = useState<Drill>(null)

  const dormant = leads.filter((l) => l.status !== 'won' && l.status !== 'lost' && daysSince(l.updatedAt) > 20)
  const reps = topRepsByWon(leads)

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      <div className="rounded-2xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <h3 className="text-[13px] font-bold mb-3 flex items-center gap-1.5" style={{ color: 'var(--qms-text)' }}>
          <FiZap size={13} style={{ color: AI_ACCENT }} /> Insights &amp; Suggested Actions
        </h3>
        <div className="space-y-2 text-[12px]">
          {dormant.length > 0 && (
            <button
              onClick={() => setDrill({ title: 'Dormant leads (20+ days without an update)', exportSlug: 'insight-dormant', leads: dormant })}
              className="w-full text-left rounded-lg p-2.5 transition-colors hover:bg-(--qms-surface-hover)"
              style={{ background: 'var(--qms-surface-strong)' }}
            >
              {dormant.length} lead{dormant.length === 1 ? '' : 's'} untouched for 20+ days — consider re-engagement outreach.
            </button>
          )}
          {dormant.length === 0 && (
            <p style={{ color: 'var(--qms-text-muted)' }}>No urgent flags right now.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <h3 className="text-[13px] font-bold mb-3" style={{ color: 'var(--qms-text)' }}>Top Reps · Won value</h3>
        <div className="space-y-2">
          {reps.map((rep) => (
            <button
              key={rep.id}
              onClick={() => setDrill({ title: `${rep.name} — Won leads`, exportSlug: `rep-${rep.id}`, leads: rep.leads })}
              className="w-full flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-(--qms-surface-hover)"
            >
              <UserAvatar firstName={rep.name} size="sm" />
              <span className="text-[12px] flex-1 truncate text-left" style={{ color: 'var(--qms-text)' }}>{rep.name}</span>
              <span className="text-[12px] font-bold" style={{ color: 'var(--qms-text)' }}>{formatINR(rep.total)}</span>
            </button>
          ))}
          {reps.length === 0 && (
            <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No won leads yet.</p>
          )}
        </div>
      </div>

      {drill && (
        <RecordsDrawer title={drill.title} exportSlug={drill.exportSlug} leads={drill.leads} onClose={() => setDrill(null)} />
      )}
    </div>
  )
}

export default BottomInsightsRow
