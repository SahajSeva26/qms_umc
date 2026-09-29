import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FiMapPin, FiGlobe, FiInfo, FiCpu, FiCalendar, FiEdit2, FiAlertTriangle } from 'react-icons/fi'
import SideDrawer from '@/components/ui/SideDrawer'
import { useRole } from '@/features/access-management/role/hooks/useRole'
import { useGeoProfiles } from '@/features/geo-profile/hooks/useGeoProfiles'
import { useFoEmployee } from '@/features/fo/hooks/useFoEmployee'
import { useFoRosterCamps } from '@/features/fo/hooks/useFoRosterCamps'
import { useFoRosterDevices } from '@/features/fo/hooks/useFoRosterDevices'
import { useCampsReal } from '@/features/camps/hooks/useCampsReal'
import { usePermission } from '@/hooks/usePermission'
import { FO_ROUTES } from '@/features/fo/fo.routes'
import { foRealStatus, FO_STATUS_LABEL, FO_STATUS_BG, FO_STATUS_COLOR, initials } from '@/features/fo/utils/foRealStatus'
import { formatINR, formatDate } from '@/utils/formatters'
import type { RoleEntity } from '@/types/accessManagement.types'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

interface FoRealDrawerProps {
  roleId: string | null
  onClose: () => void
}

function displayName(role: RoleEntity): string {
  if (role.user === null || typeof role.user === 'string') return role.name
  return `${role.user.firstName}${role.user.lastName ? ` ${role.user.lastName}` : ''}`
}

const SectionHeader = ({ icon: Icon, children }: { icon: typeof FiInfo; children: ReactNode }) => (
  <div className="flex items-center gap-1.5 text-[12px] font-bold mb-2" style={{ color: 'var(--qms-text)' }}>
    <Icon size={13} /> {children}
  </div>
)

const KvRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-3 py-1 text-[12px]" style={{ borderBottom: '1px dashed var(--qms-border)' }}>
    <span style={{ color: 'var(--qms-text-muted)' }}>{label}</span>
    <span className="text-right" style={{ color: 'var(--qms-text)' }}>{value}</span>
  </div>
)

// Matches the prototype's drawer (fo-manager.js:965-1054) where a real field
// exists — TA/DA claims are dropped; Occupancy/Rating show "Coming soon".
const FoRealDrawer = ({ roleId, onClose }: FoRealDrawerProps) => {
  const { hasPermission } = usePermission()
  const canManageLocation = hasPermission('geo-profile:manage')
  const { data: roleData, isLoading: roleLoading, error: roleError } = useRole(roleId ?? undefined)
  const role = roleData?.data ?? null
  const userId = role?.user && typeof role.user !== 'string' ? role.user._id : undefined

  const { data: geoData, isLoading: geoLoading, error: geoError, refetch: refetchGeo } = useGeoProfiles({ role: roleId ?? '' }, !!roleId)
  const geoProfile = geoData?.data?.items?.[0] ?? null

  const { employee, isLoading: employeeLoading, error: employeeError, refetch: refetchEmployee } = useFoEmployee(userId)

  const campSummaries = useFoRosterCamps(roleId ? [roleId] : [])
  const campSummary = roleId ? campSummaries[roleId] : undefined

  const {
    data: upcomingData,
    isLoading: upcomingLoading,
    error: upcomingError,
    refetch: refetchUpcoming,
  } = useCampsReal(
    roleId ? { fo: roleId, dateFrom: new Date().toISOString().slice(0, 10), limit: '10' } : { limit: '0' },
  )
  const upcomingCamps = (upcomingData?.data?.items ?? EMPTY_ARRAY).filter((c) => c.status !== 'cancelled' && c.status !== 'cancelled_charged')
  // Filters cancelled camps out client-side after the 10-row cap, so this
  // compares against the raw fetched count, not upcomingCamps.length.
  const upcomingTruncated = (upcomingData?.data?.count ?? 0) > (upcomingData?.data?.items?.length ?? 0)

  const deviceEntries = useFoRosterDevices(roleId ? [roleId] : [])
  const deviceEntry = roleId ? deviceEntries[roleId] : undefined
  const assignments = deviceEntry?.assignments ?? []

  if (!roleId) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  const name = role ? displayName(role) : ''
  const status = foRealStatus(
    campSummary?.todayCamp ?? null,
    campSummary?.upcomingCount ?? 0,
    !!campSummary?.error || !campSummary || campSummary.isLoading,
  )
  const email = role?.user && typeof role.user !== 'string' ? role.user.email : undefined
  const phone = role?.user && typeof role.user !== 'string' ? role.user.phone : undefined

  return (
    <SideDrawer open={!!roleId} title={name || 'Field Officer'} onClose={onClose} widthClassName="max-w-xl">
      {roleLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>
      )}
      {roleError && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>Failed to load this field officer.</div>
      )}
      {role && (
        <div className="space-y-5">
          <div className="flex items-start gap-3.5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-extrabold text-[20px] shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
            >
              {initials(name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-[16px] truncate" style={{ color: 'var(--qms-text)' }}>{name}</div>
              <div className="text-[12px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                {email ?? '—'} {phone ? `· ${phone}` : ''}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                  style={{ background: FO_STATUS_BG[status], color: FO_STATUS_COLOR[status] }}
                >
                  {FO_STATUS_LABEL[status]}
                </span>
                {geoLoading ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                    Loading location…
                  </span>
                ) : geoError ? (
                  <button
                    onClick={() => refetchGeo()}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(244,63,94,.1)', color: '#b91c1c' }}
                  >
                    <FiAlertTriangle size={10} /> Couldn't load location · Retry
                  </button>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                      <FiMapPin size={10} /> {geoProfile?.city || '—'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                      <FiGlobe size={10} /> {geoProfile?.state || '—'}
                    </span>
                  </>
                )}
                {canManageLocation && roleId && (
                  <Link
                    to={FO_ROUTES.FIELD_OFFICER_DETAIL.replace(':id', roleId)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors hover:opacity-80"
                    style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-brand)' }}
                  >
                    <FiEdit2 size={10} /> Edit location
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-xl border p-2.5 text-center" style={{ borderColor: 'var(--qms-border)' }}>
              <div className="font-bold text-[16px]" style={{ color: campSummary?.error || campSummary?.isLoading || !campSummary ? 'var(--qms-text-muted)' : 'var(--qms-text)' }}>
                {campSummary?.isLoading || !campSummary ? '…' : campSummary?.error ? '—' : campSummary.closedCount}{campSummary?.truncated ? '+' : ''}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Closed</div>
            </div>
            <div className="rounded-xl border p-2.5 text-center" style={{ borderColor: 'var(--qms-border)' }}>
              <div className="font-bold text-[16px]" style={{ color: campSummary?.error || campSummary?.isLoading || !campSummary ? 'var(--qms-text-muted)' : 'var(--qms-text)' }}>
                {campSummary?.isLoading || !campSummary ? '…' : campSummary?.error ? '—' : campSummary.upcomingCount}{campSummary?.truncated ? '+' : ''}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Upcoming</div>
            </div>
            <div className="rounded-xl border p-2.5 text-center" style={{ borderColor: 'var(--qms-border)' }}>
              <div className="text-[11px] italic" style={{ color: 'var(--qms-brand)' }}>Soon</div>
              <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Occupancy</div>
            </div>
            <div className="rounded-xl border p-2.5 text-center" style={{ borderColor: 'var(--qms-border)' }}>
              <div className="text-[11px] italic" style={{ color: 'var(--qms-brand)' }}>Soon</div>
              <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>★ Rating</div>
            </div>
          </div>

          <div>
            <SectionHeader icon={FiInfo}>Personal &amp; HR</SectionHeader>
            {employeeLoading ? (
              <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Loading…</p>
            ) : employeeError ? (
              <button
                onClick={() => refetchEmployee()}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold"
                style={{ color: '#b91c1c' }}
              >
                <FiAlertTriangle size={11} /> Couldn't load HR data · Retry
              </button>
            ) : employee ? (
              <div>
                <KvRow label="Joined" value={formatDate(employee.doj)} />
                <KvRow label="PAN" value={employee.panNumber ?? '—'} />
                <KvRow label="Aadhaar" value={employee.aadharNumber ?? '—'} />
                <KvRow label="Salary" value={employee.salary ? `${formatINR(employee.salary)} / mo` : '—'} />
                <KvRow label="DA rule" value={employee.daRule ? `${employee.daRule.type} · ${employee.daRule.value}` : '—'} />
              </div>
            ) : (
              <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No HR record found for this field officer.</p>
            )}
          </div>

          <div>
            <SectionHeader icon={FiCpu}>Devices handed over ({deviceEntry?.error ? '—' : assignments.length})</SectionHeader>
            {deviceEntry?.isLoading ? (
              <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Loading…</p>
            ) : deviceEntry?.error ? (
              <button
                onClick={() => deviceEntry.refetch()}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold"
                style={{ color: '#b91c1c' }}
              >
                <FiAlertTriangle size={11} /> Couldn't load devices · Retry
              </button>
            ) : assignments.length === 0 ? (
              <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>None assigned.</p>
            ) : (
              <div className="space-y-1.5">
                {assignments.map((a) => (
                  <div key={a.id} className="flex justify-between text-[12px] py-1" style={{ borderBottom: '1px dashed var(--qms-border)' }}>
                    <span style={{ color: 'var(--qms-text)' }}>
                      {/* Real item name (e.g. "Glucometer") isn't in the API response yet. */}
                      {a.inventory.serialNumber ?? `Consumable · batch ${a.inventory.batch ?? '—'}`}
                    </span>
                    <span style={{ color: 'var(--qms-text-muted)' }}>Qty {a.quantity}</span>
                  </div>
                ))}
                {deviceEntry?.truncated && (
                  <p className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>More assigned than shown.</p>
                )}
              </div>
            )}
          </div>

          <div>
            <SectionHeader icon={FiCalendar}>Upcoming camps ({upcomingError ? '—' : upcomingCamps.length})</SectionHeader>
            {upcomingLoading ? (
              <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Loading…</p>
            ) : upcomingError ? (
              <button
                onClick={() => refetchUpcoming()}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold"
                style={{ color: '#b91c1c' }}
              >
                <FiAlertTriangle size={11} /> Couldn't load upcoming camps · Retry
              </button>
            ) : upcomingCamps.length === 0 ? (
              <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No upcoming camps.</p>
            ) : (
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                    <th className="text-left font-bold px-1 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>Code</th>
                    <th className="text-left font-bold px-1 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>Date</th>
                    <th className="text-left font-bold px-1 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>Type</th>
                    <th className="text-left font-bold px-1 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>City</th>
                    <th className="text-left font-bold px-1 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingCamps.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px dashed var(--qms-border)' }}>
                      <td className="px-1 py-1.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{c.code}</td>
                      <td className="px-1 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{new Date(c.date).toLocaleDateString()}</td>
                      <td className="px-1 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{c.type}</td>
                      <td className="px-1 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{c.location?.city ?? '—'}</td>
                      <td className="px-1 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {upcomingTruncated && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>More camp records than shown.</p>
            )}
          </div>
        </div>
      )}
    </SideDrawer>
  )
}

export default FoRealDrawer
