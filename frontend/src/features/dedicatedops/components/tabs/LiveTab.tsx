import { FiUserX } from 'react-icons/fi'
import type { Doctor } from '@/features/camps/camp.types'
import type { Assignment, Attendance, ComplianceResult } from '@/features/dedicatedops/dedicatedops.types'
import DoPill from '@/features/dedicatedops/components/DoPill'
import DoBar from '@/components/ui/DoBar'

interface LiveTabProps {
  assignments: Record<string, Assignment>
  /** Same value passed to useDedicatedOpsCompliance in the page — the Map keys below only align if this matches. */
  today: string
  /** Built once in useDedicatedOpsCompliance (Phase 2) — do not rebuild this here. */
  attendanceByFoAndDate: Map<string, Attendance>
  /** Built once in useDedicatedOpsCompliance (Phase 2) — do not rebuild this here. */
  screeningsCountByFoAndDate: Map<string, number>
  /** Built once in useDedicatedOpsCompliance (Phase 2) — do not rebuild this here. */
  complianceByFoId: Map<string, ComplianceResult>
  /** Built once in the page (Phase 2) — do not rebuild this here. */
  doctorsById: Map<string, Doctor>
  /** Shared with ProjectDetailDrawer — owned by the page, not this tab. */
  onUnassign: (foId: string) => void
}

// Today's live-attendance table. Pure render — every per-row lookup below is
// an O(1) Map.get() against indexes Phase 2 built once; this component does
// no attendance/screenings scanning of its own.
const LiveTab = ({
  assignments, today, attendanceByFoAndDate, screeningsCountByFoAndDate,
  complianceByFoId, doctorsById, onUnassign,
}: LiveTabProps) => {
  return (
    <div className="rounded-xl border overflow-x-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', backdropFilter: 'blur(20px)' }}>
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ background: 'var(--qms-surface-strong)' }}>
            {['Field Officer', 'Project · Doctor', 'Today', 'Geo', 'Screenings', 'SOP', 'Status'].map((h) => (
              <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.values(assignments).map((a) => {
            const key = `${a.foId}|${today}`
            const att = attendanceByFoAndDate.get(key)
            const compliance = complianceByFoId.get(a.foId)
            const doctor = doctorsById.get(a.doctorId)
            const scrCount = screeningsCountByFoAndDate.get(key) ?? 0
            return (
              <tr key={a.foId} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{a.foName}</td>
                <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{a.projectId} · {doctor?.name ?? a.clinicLabel}</td>
                <td className="px-3 py-2.5 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                  {att?.checkInAt ? new Date(att.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  {' → '}
                  {att?.checkOutAt ? new Date(att.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
                <td className="px-3 py-2.5 text-[11px] tabular-nums" style={{ color: 'var(--qms-text-muted)' }}>
                  {att?.geoLat && att?.geoLng ? `${att.geoLat.toFixed(3)}, ${att.geoLng.toFixed(3)}` : '—'}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums" style={{ color: 'var(--qms-text)' }}>{scrCount}</td>
                <td className="px-3 py-2.5 w-32">
                  {compliance && (
                    <>
                      <div className="text-[11px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>{compliance.done}/{compliance.total}</div>
                      <DoBar pct={compliance.pct} color={compliance.ok ? '#10b981' : compliance.overdue ? '#ef4444' : '#f59e0b'} />
                    </>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <DoPill tone={compliance?.ok ? 'ok' : compliance?.overdue ? 'bad' : 'warn'}>
                      {compliance?.ok ? 'Compliant' : compliance?.overdue ? 'Overdue' : 'In progress'}
                    </DoPill>
                    <button onClick={() => onUnassign(a.foId)} aria-label="Unassign" style={{ color: 'var(--qms-text-muted)' }}>
                      <FiUserX size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
          {Object.keys(assignments).length === 0 && (
            <tr><td colSpan={7} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No FOs currently deployed.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default LiveTab
