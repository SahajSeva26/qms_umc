import { useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiEdit2, FiUser, FiTruck, FiCpu, FiFileText } from 'react-icons/fi'
import { useCampReal } from '@/features/camps/hooks/useCampReal'
import { useCampsReal } from '@/features/camps/hooks/useCampsReal'
import { useCampRefNames } from '@/features/camps/hooks/useCampRefNames'
import { campRefId, canRunScreening } from '@/features/camps/campsReal.utils'
import { usePermission } from '@/hooks/usePermission'
import SideDrawer from '@/components/ui/SideDrawer'
import CampStatusPillReal from '@/components/widgets/camp/CampStatusPillReal'
import CampStageActionRow from '@/features/camps/components/CampStageActionRow'
import CampDrawerKpiRow from '@/features/camps/components/CampDrawerKpiRow'
import CampStageHistoryList from '@/features/camps/components/CampStageHistoryList'
import { Button } from '@/components/ui/button'
import { useAllocateFo } from '@/features/camps/hooks/useAllocateFo'
import type { CampType } from '@/types/campReal.types'
import { CAMP_TYPE_LABEL } from '@/types/campReal.types'
import { CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'

const TABS = ['Overview', 'Stage history'] as const
type Tab = (typeof TABS)[number]

// Same 3 type colors already used app-wide for camp type pills/cards.
const TYPE_COLOR: Record<CampType, string> = {
  screening: '#3b6dff',
  diet: '#10b981',
  lab: '#8b5cf6',
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

const SectionHeader = ({ icon: Icon, children }: { icon: typeof FiUser; children: ReactNode }) => (
  <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[.06em] mt-4 mb-2" style={{ color: 'var(--qms-text-muted)' }}>
    <Icon size={13} />
    {children}
  </div>
)

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
  const allocateFo = useAllocateFo(campId)

  // GET /camps/:id has no `stats` — only search does, and there's no exact-id filter (only a `code`
  // regex), so this searches by code with report=true and matches the exact id within the results.
  const statsQuery = useCampsReal({ code: camp?.code, report: 'true', limit: '50' }, !!camp?.code)
  const campStats = statsQuery.data?.data?.items?.find((item) => item.id === campId)?.stats
  const isStatsNotFound = !statsQuery.isLoading && !statsQuery.error && !!camp?.code && !campStats

  const { doctorName, divisionName, projectName, roleName } = useCampRefNames({
    doctors: true,
    divisions: hasAnyPermission(DIVISION_READ_PERMISSIONS),
    projects: hasAnyPermission(PROJECT_READ_PERMISSIONS),
    roles: hasAnyPermission(ROLE_READ_PERMISSIONS),
  })

  const doctor = camp?.doctor && typeof camp.doctor !== 'string' ? camp.doctor : null
  const isDiet = camp?.type === 'diet'
  const fo = camp?.fo && typeof camp.fo !== 'string' ? camp.fo : null
  const dietitian = camp?.dietitian && typeof camp.dietitian !== 'string' ? camp.dietitian : null
  const worker = isDiet ? dietitian : fo

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
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0"
              style={{ background: `linear-gradient(135deg, ${TYPE_COLOR[camp.type]}, #14b8a6)` }}
            >
              <span className="text-[18px] font-extrabold">{CAMP_TYPE_LABEL[camp.type][0]}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-[15px] truncate" style={{ color: 'var(--qms-text)' }}>
                  {camp.code} · {CAMP_TYPE_LABEL[camp.type]} Camp
                </div>
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
              <div className="text-[12px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                {camp.location ? `${camp.location.city}, ${camp.location.state}` : 'Location unavailable'} · {new Date(camp.date).toLocaleDateString()} · {camp.timeSlot ? CAMP_TIME_SLOT_LABEL[camp.timeSlot] : '—'}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <CampStatusPillReal status={camp.status} />
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
                  {camp.tenant && typeof camp.tenant !== 'string' ? camp.tenant.name : campRefId(camp.tenant) ?? '—'}
                </span>
                {camp.division && typeof camp.division !== 'string' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
                    {divisionName(camp.division)}
                  </span>
                )}
                {camp.project && typeof camp.project !== 'string' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
                    {projectName(camp.project)}
                  </span>
                )}
              </div>
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
            <div>
              <CampDrawerKpiRow
                stats={campStats}
                notFound={isStatsNotFound}
                error={statsQuery.error}
                onRetry={() => void statsQuery.refetch()}
                patientExpectation={camp.patientExpectation}
              />

              <SectionHeader icon={FiUser}>Doctor</SectionHeader>
              <div className="rounded-[14px] border p-3 space-y-1.5" style={{ borderColor: 'var(--qms-border)' }}>
                <OverviewRow label="Name" value={doctorName(camp.doctor)} />
                <OverviewRow label="Pharma code" value={doctor?.pharmaCode || '—'} />
                <OverviewRow label="Specialization" value={doctor?.specialization || '—'} />
              </div>

              <SectionHeader icon={FiTruck}>{isDiet ? 'Dietitian' : 'Field Officer'}</SectionHeader>
              <div className="rounded-[14px] border p-3" style={{ borderColor: 'var(--qms-border)' }}>
                {worker ? (
                  <OverviewRow label={isDiet ? 'Dietitian' : 'FO'} value={roleName(isDiet ? camp.dietitian : camp.fo)} />
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-danger">Unassigned</span>
                    {canUpdate && (
                      <Button variant="outline" size="sm" onClick={() => allocateFo.mutate()} disabled={allocateFo.isPending}>
                        {allocateFo.isPending ? 'Allocating…' : isDiet ? 'Assign dietitian' : 'Assign FO'}
                      </Button>
                    )}
                  </div>
                )}
                {allocateFo.isError && (
                  <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-2">
                    {(allocateFo.error as { response?: { data?: { message?: string } } })?.response?.data?.message || `Could not allocate a${isDiet ? ' dietitian' : 'n FO'}.`}
                  </div>
                )}
                <OverviewRow label="MR" value={camp.mr ? roleName(camp.mr) : '—'} />
              </div>

              <SectionHeader icon={FiCpu}>Devices allocated ({camp.devices.length})</SectionHeader>
              <div className="rounded-[14px] border p-3" style={{ borderColor: 'var(--qms-border)' }}>
                {camp.devices.length > 0 ? (
                  <div className="space-y-1.5">
                    {camp.devices.map((d) => (
                      <div key={d._id} className="flex items-center justify-between text-[13px] pb-1.5" style={{ borderBottom: '1px dashed var(--qms-border)' }}>
                        <div>
                          <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{d.type}</div>
                          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{d.name} · {d.code}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No devices allocated yet</span>
                )}
              </div>

              <SectionHeader icon={FiFileText}>Notes</SectionHeader>
              <div className="rounded-[14px] border p-3 space-y-2" style={{ borderColor: 'var(--qms-border)' }}>
                <OverviewRow label="Company" value={camp.tenant && typeof camp.tenant !== 'string' ? camp.tenant.name : campRefId(camp.tenant) ?? '—'} />
                <OverviewRow label="Billing" value={camp.billingType === 'billable' ? 'Billable' : 'Void'} />
                <OverviewRow label="Patient expectation" value={String(camp.patientExpectation)} />
                <OverviewRow label="Notes" value={camp.notes || '—'} />
              </div>

              <div className="mt-4">
                <CampStageActionRow
                  camp={camp}
                  canMoveStage={canMoveStage}
                  extraAction={
                    camp.status === 'live' && canRunScreening(camp, session?.role.id, session?.roleType.code, canManageScreening)
                      ? (
                        <Button variant="outline" onClick={() => navigate(`/camps/${camp.id}/screening`)}>
                          Run screening
                        </Button>
                      )
                      : null
                  }
                />
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
