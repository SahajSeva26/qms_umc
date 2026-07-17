import { FiUser, FiVideo, FiPhone } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import type { Dietitian } from '@/features/diet/diet.types'
import { dietStage } from '@/features/diet/diet.utils'
import { clientName } from '@/types/campref.types'
import { formatDate } from '@/utils/formatters'
import DietStatusPill from '@/features/diet/components/DietStatusPill'

interface DietCampCardProps {
  camp: Camp
  dietitians: Dietitian[]
  viewOnly: boolean
  onOpen: (id: string) => void
  onInvite: (id: string) => void
  onAssign: (id: string) => void
  onOpenAssessments: (id: string) => void
}

const DietCampCard = ({ camp, dietitians, viewOnly, onOpen, onInvite, onAssign, onOpenAssessments }: DietCampCardProps) => {
  const stage = dietStage(camp)
  const dietitian = dietitians.find((d) => d.id === camp.dietitianId)
  const assessmentCount = 0 // populated by parent via a running count if needed later

  return (
    <div
      className="rounded-2xl border p-4 cursor-pointer transition-all hover:-translate-y-0.5"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
      onClick={() => onOpen(camp.id)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-[13px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{camp.id}</div>
          <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
            {clientName(camp.clientId)} · {camp.city} · {formatDate(camp.date)}
          </div>
        </div>
        <DietStatusPill stage={stage} />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {viewOnly && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
            View-only
          </span>
        )}
        {camp.teleConsult && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(139,92,246,.12)', color: '#8b5cf6' }}>
            {camp.teleChannel === 'IVR' ? <FiPhone size={10} /> : <FiVideo size={10} />} Tele
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 rounded-xl p-2.5" style={{ background: 'var(--qms-surface-strong)' }}>
        <div className="text-center">
          <div className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--qms-text)' }}>{camp.patientsDone}/{camp.patientsExpected}</div>
          <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>Patients</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--qms-text)' }}>{camp.rxCount}</div>
          <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>Rx</div>
        </div>
      </div>

      {dietitian ? (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-3" style={{ color: 'var(--qms-text-soft)' }}>
          <FiUser size={11} /> {dietitian.name}
        </div>
      ) : !viewOnly ? (
        <div className="text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit mb-3" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
          Missing Dietitian
        </div>
      ) : null}

      {!viewOnly && (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {!dietitian ? (
            <>
              <button
                onClick={() => onInvite(camp.id)}
                className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg text-white"
                style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
              >
                Invite
              </button>
              <button
                onClick={() => onAssign(camp.id)}
                className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg border"
                style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
              >
                Assign
              </button>
            </>
          ) : camp.teleConsult ? (
            <button
              onClick={() => onOpenAssessments(camp.id)}
              className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg border"
              style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
            >
              Online assessments ({assessmentCount})
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default DietCampCard
