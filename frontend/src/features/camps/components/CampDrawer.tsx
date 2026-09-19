import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiEdit2 } from 'react-icons/fi'
import { useCampReal } from '@/features/camps/hooks/useCampReal'
import { useCampRefNames } from '@/features/camps/hooks/useCampRefNames'
import { campRefId, canRunScreening } from '@/features/camps/campsReal.utils'
import { usePermission } from '@/hooks/usePermission'
import SideDrawer from '@/components/ui/SideDrawer'
import CampStatusPillReal from '@/features/camps/components/CampStatusPillReal'
import CampStageMovePanel from '@/features/camps/components/CampStageMovePanel'
import CampStageHistoryList from '@/features/camps/components/CampStageHistoryList'
import { Button } from '@/components/ui/button'
import { CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'

const TABS = ['Overview', 'Stage history'] as const
type Tab = (typeof TABS)[number]

const TYPE_LABEL: Record<string, string> = {
  screening: 'Screening',
  diet: 'Diet',
  lab: 'Lab',
}

const CAMP_UPDATE_PERMISSIONS = ['camp:update', 'camp:manage', 'tenant:manage']
const CAMP_STAGE_PERMISSIONS = ['camp:manage', 'tenant:manage']
// Mirrors each backend route's own read guard exactly, so the drawer never fires a request the caller will 403 on.
const DIVISION_READ_PERMISSIONS = ['division:manage', 'tenant:admin', 'lead:manage']
const ROLE_READ_PERMISSIONS = ['tenant:admin', 'tenant:manage', 'role:search']
const PROJECT_READ_PERMISSIONS = ['project:manage', 'project:search', 'camp:book', 'tenant:manage']

interface CampDrawerProps {
  campId: string | null
  onClose: () => void
}

// Read-only — Edit navigates to a dedicated full page instead of a cramped modal-over-drawer form.
const CampDrawer = ({ campId, onClose }: CampDrawerProps) => {
  if (!campId) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  // Keyed by campId so switching camps remounts fresh instead of needing an effect.
  return <CampDrawerContent key={campId} campId={campId} onClose={onClose} />
}

interface CampDrawerContentProps {
  campId: string
  onClose: () => void
}

const CampDrawerContent = ({ campId, onClose }: CampDrawerContentProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { hasAnyPermission, session } = usePermission()
  const canUpdate = hasAnyPermission(CAMP_UPDATE_PERMISSIONS)
  const canMoveStage = hasAnyPermission(CAMP_STAGE_PERMISSIONS)
  const canManageScreening = hasAnyPermission(['screening:manage', 'system:manage'])

  const [tab, setTab] = useState<Tab>('Overview')

  const { data, isLoading, error } = useCampReal(campId)
  const camp = data?.data ?? null

  const { doctorName, divisionName, projectName, roleName } = useCampRefNames({
    doctors: true,
    divisions: hasAnyPermission(DIVISION_READ_PERMISSIONS),
    projects: hasAnyPermission(PROJECT_READ_PERMISSIONS),
    roles: hasAnyPermission(ROLE_READ_PERMISSIONS),
  })

  return (
    <SideDrawer open title={camp?.code ?? 'Camp'} onClose={onClose} widthClassName="max-w-lg">
      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading camp…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load camp. Please try again.
        </div>
      )}

      {camp && !isLoading && (
        <>
          <div className="mb-4">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[15px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{camp.code}</div>
              {canUpdate && (
                <button
                  onClick={() => {
                    // Strip `camp` so Save returns to whichever page this drawer was opened over.
                    const returnParams = new URLSearchParams(location.search)
                    returnParams.delete('camp')
                    const query = returnParams.toString()
                    const from = encodeURIComponent(`${location.pathname}${query ? `?${query}` : ''}`)
                    navigate(`/camps/${camp.id}/edit?from=${from}`, { state: { fromDrawer: true } })
                  }}
                  aria-label="Edit camp"
                  className="shrink-0 rounded-lg border p-1.5 transition-colors hover:bg-(--qms-surface-hover)"
                  style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
                >
                  <FiEdit2 size={13} />
                </button>
              )}
            </div>
            <div className="text-[12px] truncate mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              {doctorName(camp.doctor)} · {camp.location ? `${camp.location.city}, ${camp.location.state}` : 'Location unavailable'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <CampStatusPillReal status={camp.status} />
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                {new Date(camp.date).toLocaleDateString()} · {camp.timeSlot ? CAMP_TIME_SLOT_LABEL[camp.timeSlot] : '—'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 mb-4 p-1 rounded-xl" style={{ background: 'var(--qms-surface-strong)' }}>
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

          {tab === 'Overview' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {camp.status === 'live' && canRunScreening(camp, session?.role.id, session?.roleType.code, canManageScreening) && (
                  <Button variant="outline" onClick={() => navigate(`/camps/${camp.id}/screening`)}>
                    Run screening
                  </Button>
                )}
              </div>

              <CampStageMovePanel camp={camp} canWrite={canUpdate} canMoveStage={canMoveStage} />

              <div className="rounded-xl border p-4 space-y-2.5" style={{ borderColor: 'var(--qms-border)' }}>
                <OverviewRow label="Company" value={camp.tenant && typeof camp.tenant !== 'string' ? camp.tenant.name : campRefId(camp.tenant) ?? '—'} />
                <OverviewRow label="Division" value={divisionName(camp.division)} />
                <OverviewRow label="Project" value={camp.project ? projectName(camp.project) : '—'} />
                <OverviewRow label="Type" value={TYPE_LABEL[camp.type] ?? camp.type} />
                <OverviewRow label="Billing" value={camp.billingType === 'billable' ? 'Billable' : 'Void'} />
                <OverviewRow label="Patient expectation" value={String(camp.patientExpectation)} />
                <OverviewRow label="Field Officer" value={camp.fo ? roleName(camp.fo) : 'Unassigned'} />
                <OverviewRow label="MR" value={camp.mr ? roleName(camp.mr) : '—'} />
                <OverviewRow label="Devices" value={camp.devices.length > 0 ? camp.devices.map((d) => d.name).join(', ') : '—'} />
                <OverviewRow label="Notes" value={camp.notes || '—'} />
              </div>
            </div>
          )}

          {tab === 'Stage history' && <CampStageHistoryList camp={camp} />}
        </>
      )}
    </SideDrawer>
  )
}

const OverviewRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-3">
    <span className="text-[11px] font-semibold uppercase tracking-wider shrink-0" style={{ color: 'var(--qms-text-muted)' }}>{label}</span>
    <span className="text-[13px] text-right" style={{ color: 'var(--qms-text)' }}>{value}</span>
  </div>
)

export default CampDrawer
