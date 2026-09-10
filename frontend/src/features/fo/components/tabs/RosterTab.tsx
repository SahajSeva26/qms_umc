import { FiAlertTriangle, FiMapPin, FiMail, FiPhone } from 'react-icons/fi'
import { useFoRoster } from '@/features/fo/hooks/useFoRoster'
import { usePagination } from '@/hooks/usePagination'
import PaginationControls from '@/components/ui/PaginationControls'
import { Button } from '@/components/ui/button'
import type { RolePopulatedUser } from '@/types/accessManagement.types'

const PAGE_SIZE = 10

function displayName(role: { name: string; user: RolePopulatedUser | string }): string {
  if (typeof role.user === 'string') return role.name
  return `${role.user.firstName}${role.user.lastName ? ` ${role.user.lastName}` : ''}`
}

// Real Role + GeoProfile data only — no occupancy/feedback/salary/device/camp
// fields, since none of those have a real source yet. Assignments/Performance/
// Devices/Training/Expenses still read the separate mock roster (usePeopleData).
const RosterTab = () => {
  const { page, setPage, totalPages } = usePagination(PAGE_SIZE)
  const { fos, count, isLoading, error, typeResolvedButMissing, geoTruncated, refetch } = useFoRoster({
    page: String(page),
    limit: String(PAGE_SIZE),
  })

  if (isLoading) {
    return (
      <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
        Loading field officers…
      </div>
    )
  }

  if (error || typeResolvedButMissing) {
    return (
      <div className="rounded-xl border px-4 py-6 text-center" style={{ borderColor: 'var(--qms-border)' }}>
        <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          {typeResolvedButMissing
            ? "Couldn't find the Field Officer role type — this looks like a setup issue, not a real empty roster."
            : 'Failed to load field officers. Please try again.'}
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={refetch}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div>
      {geoTruncated && (
        <div className="flex items-center gap-2 text-[12px] rounded-lg px-3 py-2 mb-3" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
          <FiAlertTriangle size={13} className="shrink-0" />
          Some field officers' locations may not be shown — more exist than this view can currently check.
        </div>
      )}

      {fos.length === 0 && (
        <div className="text-[13px] py-10 text-center rounded-xl border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          No field officers found.
        </div>
      )}

      {fos.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  {['Name', 'Contact', 'Status', 'Location'].map((h) => (
                    <th key={h} className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fos.map(({ role, geoProfile }) => {
                  const user = typeof role.user === 'string' ? null : role.user
                  return (
                    <tr key={role.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{displayName(role)}</div>
                        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{role.code}</div>
                      </td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                        {user?.email && (
                          <div className="flex items-center gap-1.5"><FiMail size={11} /> {user.email}</div>
                        )}
                        {user?.phone && (
                          <div className="flex items-center gap-1.5 mt-0.5"><FiPhone size={11} /> {user.phone}</div>
                        )}
                        {!user?.email && !user?.phone && '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                          style={{
                            background: role.status === 'active' ? 'color-mix(in oklch, var(--success), transparent 85%)' : 'var(--qms-surface-strong)',
                            color: role.status === 'active' ? 'var(--success)' : 'var(--qms-text-muted)',
                          }}
                        >
                          {role.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                        {geoProfile ? (
                          <div className="flex items-center gap-1.5">
                            <FiMapPin size={11} className="shrink-0" />
                            {[geoProfile.city, geoProfile.state].filter(Boolean).join(', ') || '—'}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PaginationControls page={page} totalPages={totalPages(count)} onPageChange={setPage} />
    </div>
  )
}

export default RosterTab
