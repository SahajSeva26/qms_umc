import { useState } from 'react'
import type { Lead } from '@/types/lead.types'
import SideDrawer from '@/components/ui/SideDrawer'
import ScoreDonut from '@/features/crm/components/ScoreDonut'
import StagePill from '@/features/crm/components/StagePill'
import OverviewTab from '@/features/crm/components/drawer/OverviewTab'
import FollowupsTab from '@/features/crm/components/drawer/FollowupsTab'
import AiRecommendationsTab from '@/features/crm/components/drawer/AiRecommendationsTab'
import ActivityTab from '@/features/crm/components/drawer/ActivityTab'
import MarkLostModal from '@/features/crm/components/MarkLostModal'
import { formatINR } from '@/utils/formatters'

const TABS = ['Overview', 'Follow-ups', 'AI Recommendations', 'Activity'] as const
type Tab = (typeof TABS)[number]

interface LeadDrawerProps {
  lead: Lead | null
  onClose: () => void
  onMarkLost: (id: string, category: string, reason: string) => void
  onReopen: (id: string) => void
}

const LeadDrawer = ({ lead, onClose, onMarkLost, onReopen }: LeadDrawerProps) => {
  const [tab, setTab] = useState<Tab>('Overview')
  const [markingLost, setMarkingLost] = useState(false)

  if (!lead) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  return (
    <SideDrawer open={!!lead} title={lead.account} onClose={onClose}>
      <div className="flex items-center gap-4 mb-4">
        <ScoreDonut score={lead.score} />
        <div className="min-w-0">
          <div className="text-[15px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{lead.account}</div>
          <div className="text-[12px] truncate mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            {lead.contact} · {lead.contactRole}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <StagePill stage={lead.stage} />
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
              {lead.division}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
              {lead.geography}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text)' }}>
              {formatINR(lead.value)}
            </span>
          </div>
        </div>
      </div>

      {lead.stage === 'lost' && lead.lostReason && (
        <div className="rounded-xl p-3 mb-4 bg-danger-soft text-danger text-[12px]">
          <span className="font-bold">Lost — {lead.lostCategory}:</span> {lead.lostReason}
        </div>
      )}

      <div className="grid grid-cols-4 gap-1 mb-4 p-1 rounded-xl" style={{ background: 'var(--qms-surface-strong)' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="text-[11px] font-semibold py-1.5 rounded-lg transition-all"
            style={
              tab === t
                ? { background: 'var(--qms-surface-card)', color: 'var(--qms-text)', boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,.06))' }
                : { color: 'var(--qms-text-muted)' }
            }
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab lead={lead} />}
      {tab === 'Follow-ups' && <FollowupsTab lead={lead} />}
      {tab === 'AI Recommendations' && <AiRecommendationsTab />}
      {tab === 'Activity' && <ActivityTab />}

      <div className="flex gap-2 mt-5 pt-4" style={{ borderTop: '1px dashed var(--qms-border)' }}>
        {lead.stage === 'lost' ? (
          <button
            onClick={() => onReopen(lead.id)}
            className="flex-1 text-[12px] font-bold py-2 rounded-lg text-white"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            Reopen lead
          </button>
        ) : lead.stage !== 'won' ? (
          <button onClick={() => setMarkingLost(true)} className="flex-1 text-[12px] font-bold py-2 rounded-lg bg-danger-soft text-danger">
            Mark as Lost
          </button>
        ) : null}
      </div>

      {markingLost && (
        <MarkLostModal
          onConfirm={(category, reason) => {
            onMarkLost(lead.id, category, reason)
            setMarkingLost(false)
          }}
          onCancel={() => setMarkingLost(false)}
        />
      )}
    </SideDrawer>
  )
}

export default LeadDrawer
