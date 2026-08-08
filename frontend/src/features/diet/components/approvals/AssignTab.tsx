import { useMemo, useState } from 'react'
import { FiCheckCircle, FiSend, FiUserPlus } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import { clientName } from '@/features/diet/services/dietScope.service'
import { useDietitianCandidatesByCamp } from '@/features/diet/hooks/useDietitianCandidates'
import { useCampInviteSummaries } from '@/features/diet/hooks/useDietitianInvites'
import { fmtDate, stringToColor, initials } from './helpers'
import AssignDietitianModal from './AssignDietitianModal'
import InviteDietitianModal from './InviteDietitianModal'

interface AssignTabProps {
  camps: Camp[]
  allCamps: Camp[]
  userName: string
}

function reasonTone(r: string): string {
  if (/positive/i.test(r)) return '#047857'
  if (/below/i.test(r)) return '#92400e'
  if (/nearest|same city/i.test(r)) return '#1d4ed8'
  return '#475569'
}

const AssignTab = ({ camps, allCamps, userName }: AssignTabProps) => {
  const [assignCampId, setAssignCampId] = useState<string | null>(null)
  const [inviteCampId, setInviteCampId] = useState<string | null>(null)

  const unassigned = useMemo(
    () => camps
      .filter((c) => !c.dietitianId && c.status !== 'CANCELLED' && c.status !== 'CANCELLED_CHARGED' && c.status !== 'CLOSED')
      .sort((a, b) => a.date.localeCompare(b.date)),
    [camps],
  )

  // One shortlist per card, all built from a SINGLE index read. Ranking each
  // card independently re-parsed the roster + every dietitian store once per
  // camp, so a coordinator with 40 unassigned camps paid that cost 40 times
  // on every render.
  //
  // topByScore: 8 preserves this card's existing rule exactly — the AI
  // suggestion is the BCA-best of the 8 highest-SCORING dietitians, not the
  // BCA-best of the whole roster (which could surface a distant match).
  const shortlists = useDietitianCandidatesByCamp(unassigned, allCamps, 8)

  // Invite counters come from the same cached invite queries the invite modal
  // writes through, so its mutations refresh these cards on their own. This
  // replaces a synchronous inviteSummary() read plus a whole-subtree
  // invalidation fired on modal close purely to force a re-render.
  const inviteSummaries = useCampInviteSummaries(unassigned.map((c) => c.id))

  return (
    <div>
      <div className="rounded-lg px-3.5 py-2.5 mb-4" style={{ background: 'rgba(13,148,136,.08)', borderLeft: '3px solid #0d9488' }}>
        <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>Assign dietitians to your diet camps ({unassigned.length})</div>
        <div className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
          System ranks dietitians by same-city match first, then positive last camp feedback. Click "Assign suggested" to accept the AI pick, or "Pick another" to override.
        </div>
      </div>

      {unassigned.length === 0 ? (
        <div className="rounded-xl border p-8 text-center" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <FiCheckCircle size={22} color="#10b981" className="mx-auto mb-2" />
          <div className="font-bold text-[13.5px]" style={{ color: 'var(--qms-text)' }}>All diet camps have a dietitian</div>
          <div className="text-[12px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>When OM · Diet opens new diet camps in your projects, they'll appear here.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {unassigned.map((camp) => {
            const shortlist = shortlists.get(camp.id)
            const top = shortlist?.candidates[0]
            const requiresBca = shortlist?.requiresBca ?? false
            const invs = inviteSummaries.get(camp.id) ?? { total: 0, accepted: 0, pending: 0, declined: 0 }

            if (!top) {
              return (
                <div key={camp.id} className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
                  <div className="font-bold text-[13px]" style={{ color: 'var(--qms-text)' }}>{camp.id} · {clientName(camp.clientId)}</div>
                  <div className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>{camp.city} · {fmtDate(camp.date)}</div>
                  <div className="text-[12px] font-bold mt-1.5" style={{ color: '#b91c1c' }}>No dietitians available — ask Admin to enrol one.</div>
                </div>
              )
            }

            return (
              <div key={camp.id} className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-[13.5px]" style={{ color: 'var(--qms-text)' }}>{camp.id} · {clientName(camp.clientId)}</div>
                    <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
                      {camp.city}{camp.state ? `, ${camp.state}` : ''} · {fmtDate(camp.date)}{camp.slot ? ` · ${camp.slot}` : ''}
                    </div>
                  </div>
                  <div className="text-[11.5px] shrink-0" style={{ color: 'var(--qms-text-muted)' }}>Expected patients: <b style={{ color: 'var(--qms-text)' }}>{camp.patientsExpected || 0}</b></div>
                </div>

                <div className="rounded-lg mt-3 p-2.5 flex items-start gap-2.5" style={{ background: 'rgba(59,109,255,.06)', border: '1px dashed rgba(59,109,255,.3)' }}>
                  <div
                    className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white font-bold text-[12px] shrink-0"
                    style={{ background: stringToColor(top.dietitian.name) }}
                  >
                    {initials(top.dietitian.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-bold" style={{ color: 'var(--qms-text)' }}>AI suggestion: {top.dietitian.name}</div>
                    <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{top.dietitian.hq || '—'}{top.dietitian.specialty ? ` · ${top.dietitian.specialty}` : ''}</div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {top.reasons.map((r, i) => {
                        const tone = reasonTone(r)
                        return <span key={i} className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: tone + '20', color: tone }}>{r}</span>
                      })}
                    </div>
                  </div>
                </div>

                {requiresBca && (
                  <div className="rounded-lg mt-2 p-2.5" style={{ background: 'rgba(249,115,22,.08)', border: '1px solid #f97316' }}>
                    <span className="text-[11.5px] font-bold" style={{ color: '#c2410c' }}>
                      BCA required · only verified-BCA dietitians satisfy GREEN. Non-BCA picks flip the camp ORANGE.
                    </span>
                  </div>
                )}

                <div className="mt-2">
                  {invs.total > 0 ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,109,255,.08)', color: '#1d4ed8' }}>
                      📨 {invs.total} invited · {invs.accepted} accepted · {invs.pending} pending{invs.declined > 0 ? ` · ${invs.declined} declined` : ''}
                    </span>
                  ) : (
                    <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>No invites sent yet</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button
                    onClick={() => setInviteCampId(camp.id)}
                    className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}
                  >
                    <FiSend size={12} /> Invite (WhatsApp)
                  </button>
                  <div>
                    <button
                      onClick={() => setAssignCampId(camp.id)}
                      className="flex items-center gap-1.5 text-[12.5px] font-bold px-3.5 py-1.5 rounded-lg text-white"
                      style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
                    >
                      <FiUserPlus size={13} /> Assign dietitian
                    </button>
                    <div className="text-[10.5px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>Opens the dietitian list — doctor-preferred on top — then the rate sheet.</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* No cache bumps here any more: the assignment mutation invalidates
          ['camps'] + the dietitian's profile, and the invite mutations
          invalidate their own camp's invite key, which these cards observe. */}
      <AssignDietitianModal
        open={!!assignCampId}
        onClose={() => setAssignCampId(null)}
        campId={assignCampId}
        userName={userName}
      />
      <InviteDietitianModal
        open={!!inviteCampId}
        onClose={() => setInviteCampId(null)}
        campId={inviteCampId}
        userName={userName}
      />
    </div>
  )
}

export default AssignTab
