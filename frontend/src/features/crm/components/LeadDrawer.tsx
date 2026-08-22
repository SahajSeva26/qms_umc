import { useEffect, useState } from 'react'
import { FiEdit2 } from 'react-icons/fi'
import type { LeadEntity, LeadStatus, UpdateLeadPayload } from '@/features/crm/crm.types'
import { LEAD_STATUS_LABEL, LEAD_TRANSITION_MAP } from '@/features/crm/crm.constants'
import { contactPersonLabel, divisionLabel } from '@/features/crm/crm.utils'
import SideDrawer from '@/components/ui/SideDrawer'
import StagePill from '@/features/crm/components/StagePill'
import OverviewTab from '@/features/crm/components/drawer/OverviewTab'
import FollowupsTab from '@/features/crm/components/drawer/FollowupsTab'
import AiRecommendationsTab from '@/features/crm/components/drawer/AiRecommendationsTab'
import ActivityTab from '@/features/crm/components/drawer/ActivityTab'
import LeadAdvanceModal from '@/features/crm/components/LeadAdvanceModal'
import EditLeadModal from '@/features/crm/components/EditLeadModal'
import { formatINR } from '@/utils/formatters'

const TABS = ['Overview', 'Follow-ups', 'AI Recommendations', 'Activity'] as const
type Tab = (typeof TABS)[number]

interface LeadDrawerProps {
  lead: LeadEntity | null
  onClose: () => void
  onMoveStage: (id: string, to: LeadStatus, reason: string) => void
  onUpdateLead: (id: string, payload: UpdateLeadPayload) => Promise<unknown>
  canManage: boolean
}

const LeadDrawer = ({ lead, onClose, onMoveStage, onUpdateLead, canManage }: LeadDrawerProps) => {
  const [tab, setTab] = useState<Tab>('Overview')
  const [advanceTo, setAdvanceTo] = useState<LeadStatus | null>(null)
  const [editing, setEditing] = useState(false)

  // LeadDrawer is a single persistent instance — `lead` can change to a
  // different one without unmounting, so reset transient UI state whenever
  // the lead identity changes (otherwise a stage-move/edit modal opened for
  // one lead could stay open while showing another lead's data).
  useEffect(() => {
    setTab('Overview')
    setAdvanceTo(null)
    setEditing(false)
  }, [lead?.id])

  if (!lead) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  // Same "Move to {next} →" buttons as ListView.tsx — empty once won/lost.
  const nextStatuses = canManage ? LEAD_TRANSITION_MAP[lead.status] : []

  return (
    <SideDrawer open={!!lead} title={lead.title} onClose={onClose}>
      <div className="mb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[15px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{lead.title}</div>
          {canManage && (
            <button
              onClick={() => setEditing(true)}
              aria-label="Edit lead"
              className="shrink-0 rounded-lg border p-1.5 transition-colors hover:bg-(--qms-surface-hover)"
              style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
            >
              <FiEdit2 size={13} />
            </button>
          )}
        </div>
        <div className="text-[12px] truncate mb-2" style={{ color: 'var(--qms-text-muted)' }}>
          {contactPersonLabel(lead.contactPerson)}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <StagePill status={lead.status} />
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
            {divisionLabel(lead.division)}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text)' }}>
            {formatINR(lead.estimatedValue)}
          </span>
        </div>
      </div>

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
      {tab === 'Activity' && <ActivityTab lead={lead} />}

      {nextStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-5 pt-4" style={{ borderTop: '1px dashed var(--qms-border)' }}>
          {nextStatuses.map((to) => (
            <button
              key={to}
              onClick={() => setAdvanceTo(to)}
              className={`text-[12px] font-bold px-3 py-2 rounded-lg transition-colors ${to === 'lost' ? 'bg-danger-soft text-danger' : ''}`}
              style={to === 'lost' ? undefined : { background: 'var(--qms-surface-strong)', color: 'var(--qms-text)' }}
            >
              {LEAD_STATUS_LABEL[lead.status]} → {LEAD_STATUS_LABEL[to]}
            </button>
          ))}
        </div>
      )}

      {advanceTo && (
        <LeadAdvanceModal
          leadId={lead.id}
          currentStatus={lead.status}
          toStatus={advanceTo}
          onMoveStage={onMoveStage}
          onClose={() => setAdvanceTo(null)}
        />
      )}

      {editing && (
        <EditLeadModal
          lead={lead}
          onSave={(payload) => onUpdateLead(lead.id, payload)}
          onClose={() => setEditing(false)}
        />
      )}
    </SideDrawer>
  )
}

export default LeadDrawer
