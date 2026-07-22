import { useEffect, useState } from 'react'
import { FiEdit2 } from 'react-icons/fi'
import type { LeadEntity, LeadStatus, UpdateLeadPayload } from '@/types/crm.types'
import { LEAD_TRANSITION_MAP } from '@/types/crm.types'
import { roleLabel, divisionLabel } from '@/features/crm/crm.utils'
import SideDrawer from '@/components/ui/SideDrawer'
import StagePill from '@/features/crm/components/StagePill'
import OverviewTab from '@/features/crm/components/drawer/OverviewTab'
import FollowupsTab from '@/features/crm/components/drawer/FollowupsTab'
import AiRecommendationsTab from '@/features/crm/components/drawer/AiRecommendationsTab'
import ActivityTab from '@/features/crm/components/drawer/ActivityTab'
import StageMoveModal from '@/features/crm/components/StageMoveModal'
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
  const [markingLost, setMarkingLost] = useState(false)
  const [editing, setEditing] = useState(false)

  // LeadDrawer is a single persistent instance (CrmPage.tsx mounts it once,
  // not keyed per lead id) — `lead` can change to a DIFFERENT lead without
  // this component ever unmounting, via StageDrawer's onOpenLead callback
  // (CrmPage.tsx sets openLeadId directly, bypassing this drawer's own
  // onClose entirely). Without this reset, opening Edit or Mark-as-Lost for
  // one lead and then switching to another via that path would leave the
  // modal open and re-render it against the NEW lead's data — never
  // requested for that lead. Reset every per-lead transient UI state
  // whenever the underlying lead identity changes.
  useEffect(() => {
    setTab('Overview')
    setMarkingLost(false)
    setEditing(false)
  }, [lead?.id])

  if (!lead) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  // Lost/reopen is a status transition like any other — no separate backend
  // endpoint exists. There is no reopen path at all: won/lost are both
  // terminal in LEAD_TRANSITION_MAP, so no button is shown for either.
  const canMarkLost = canManage && LEAD_TRANSITION_MAP[lead.status].includes('lost')

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
          {roleLabel(lead.contactPerson)}
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
      {tab === 'Activity' && <ActivityTab />}

      {canMarkLost && (
        <div className="flex gap-2 mt-5 pt-4" style={{ borderTop: '1px dashed var(--qms-border)' }}>
          <button onClick={() => setMarkingLost(true)} className="flex-1 text-[12px] font-bold py-2 rounded-lg bg-danger-soft text-danger">
            Mark as Lost
          </button>
        </div>
      )}

      {markingLost && (
        <StageMoveModal
          fromStatus={lead.status}
          toStatus="lost"
          requireReason
          onConfirm={(reason) => {
            onMoveStage(lead.id, 'lost', reason)
            setMarkingLost(false)
          }}
          onCancel={() => setMarkingLost(false)}
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
