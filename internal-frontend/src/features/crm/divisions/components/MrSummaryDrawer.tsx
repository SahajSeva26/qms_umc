import SideDrawer from '@/components/ui/SideDrawer'
import { useMrSummary } from '@/features/crm/divisions/hooks/useMrSummary'
import type { RoleEntity, RolePopulatedRoleType, RolePopulatedSupervisor, RolePopulatedSupervisorUser } from '@/types/accessManagement.types'

interface MrSummaryDrawerProps {
  mr: RoleEntity | null
  divisionId: string | undefined
  onClose: () => void
}

function designation(type: RoleEntity['type']): string {
  if (!type || typeof type === 'string') return 'MR'
  return (type as RolePopulatedRoleType).name || 'MR'
}

function supervisorName(supervisor: RoleEntity['supervisor']): string | null {
  if (!supervisor || typeof supervisor === 'string') return null
  const sup = supervisor as RolePopulatedSupervisor
  if (!sup.user || typeof sup.user === 'string') return null
  const user = sup.user as RolePopulatedSupervisorUser
  if (!user.firstName) return null
  return `${user.firstName} ${user.lastName ?? ''}`.trim()
}

function mrName(mr: RoleEntity): string {
  if (!mr.user || typeof mr.user === 'string') return mr.code
  return `${mr.user.firstName} ${mr.user.lastName ?? ''}`.trim() || mr.code
}

const SummaryRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between py-2 text-[13px]" style={{ borderBottom: '1px solid var(--qms-border)' }}>
    <span style={{ color: 'var(--qms-text-muted)' }}>{label}</span>
    <span className="font-semibold text-right" style={{ color: 'var(--qms-text)' }}>{children}</span>
  </div>
)

// Count cell: shows the real value once loaded, a muted placeholder while loading, and an honest
// "—" (not 0) on error, so a failed fetch never reads as "zero of this thing exists."
const CountValue = ({ count, loading, error }: { count: number | undefined; loading: boolean; error: boolean }) => {
  if (loading) return <span style={{ color: 'var(--qms-text-muted)' }}>…</span>
  if (error) return <span style={{ color: 'var(--danger)' }}>—</span>
  return <>{count ?? 0}</>
}

// Only fields the real backend can back — HQ/Region/QMS serviceability are omitted entirely,
// no backend concept exists for them (not faked per CLAUDE.md "don't invent API shapes").
const MrSummaryDrawer = ({ mr, divisionId, onClose }: MrSummaryDrawerProps) => {
  const summary = useMrSummary(mr?.id ?? '', divisionId)
  const manager = mr ? supervisorName(mr.supervisor) : null

  return (
    <SideDrawer open={!!mr} title={mr ? `${mrName(mr)} — summary` : ''} onClose={onClose}>
      {mr && (
        <div>
          <SummaryRow label="Designation">{designation(mr.type)}</SummaryRow>
          <SummaryRow label="Manager">{manager ?? '—'}</SummaryRow>
          <SummaryRow label="Camps booked">
            <CountValue count={summary.campsBookedCount} loading={summary.campsBookedLoading} error={summary.campsBookedError} />
          </SummaryRow>
          <SummaryRow label="Camps executed (closed)">
            <CountValue count={summary.campsExecutedCount} loading={summary.campsExecutedLoading} error={summary.campsExecutedError} />
          </SummaryRow>
          <SummaryRow label="Doctors mapped (division)">
            <CountValue count={summary.doctorsMappedCount} loading={summary.doctorsMappedLoading} error={summary.doctorsMappedError} />
          </SummaryRow>
        </div>
      )}
    </SideDrawer>
  )
}

export default MrSummaryDrawer
