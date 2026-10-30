import { FiAlertTriangle, FiStar } from 'react-icons/fi'
import type { RoleEntity } from '@/types/accessManagement.types'
import type { GeoProfileEntity } from '@/types/geoProfile.types'
import type { FoRosterCampSummary } from '@/features/fo/hooks/useFoRosterCamps'
import type { FoRosterRatingSummary } from '@/features/fo/hooks/useFoRosterRatings'

interface FoPerformanceGridProps {
  roles: RoleEntity[]
  geoByRole: Map<string, GeoProfileEntity>
  campSummaries: Record<string, FoRosterCampSummary>
  ratingsByRole: Record<string, FoRosterRatingSummary>
  onOpen: (roleId: string) => void
}

function displayName(role: RoleEntity): string {
  if (role.user === null || typeof role.user === 'string') return role.name
  return `${role.user.firstName}${role.user.lastName ? ` ${role.user.lastName}` : ''}`
}

function metric(value: number | null | undefined): string {
  return value == null ? '—' : value.toFixed(1)
}

// Mirrors the prototype's compact performance-card proportions (12px padding,
// 10px radius, 4-column metric row and 6px progress track), while deliberately
// omitting its mock occupancy/efficiency composite score. Every value here is
// backed by GET /ratings or the existing scoped camp query.
const FoPerformanceGrid = ({ roles, geoByRole, campSummaries, ratingsByRole, onOpen }: FoPerformanceGridProps) => {
  if (roles.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-[13px] rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
        No field officers match the current filters.
      </div>
    )
  }

  const sortedRoles = [...roles].sort((left, right) => {
    const leftRating = ratingsByRole[left.id]?.average ?? -1
    const rightRating = ratingsByRole[right.id]?.average ?? -1
    return rightRating - leftRating
  })

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
      {sortedRoles.map((role) => {
        const name = displayName(role)
        const geo = geoByRole.get(role.id)
        const location = [geo?.city, geo?.state].filter(Boolean).join(' · ') || '—'
        const rating = ratingsByRole[role.id]
        const camps = campSummaries[role.id]
        const ratingFailed = !!rating?.error
        const campsFailed = !!camps?.error
        const progress = rating?.average == null ? 0 : Math.min(100, Math.max(0, rating.average * 20))

        return (
          <article
            key={role.id}
            className="rounded-[10px] border p-3 transition-transform hover:-translate-y-0.5"
            style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0" style={{ background: 'color-mix(in oklab, var(--qms-brand) 10%, transparent)', color: 'var(--qms-brand)' }}>
                <FiStar size={14} />
              </div>
              <button type="button" onClick={() => onOpen(role.id)} className="flex-1 min-w-0 text-left rounded focus-visible:outline-2 focus-visible:outline-offset-2" style={{ outlineColor: 'var(--qms-brand)' }}>
                <div className="font-bold text-[14px] truncate" style={{ color: 'var(--qms-text)' }}>{name}</div>
                <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{location}</div>
              </button>
              <div className="text-right shrink-0">
                <div className="text-xl font-extrabold leading-none" style={{ color: ratingFailed ? 'var(--qms-text-muted)' : 'var(--qms-brand)' }}>
                  {rating?.isLoading || !rating ? '…' : ratingFailed ? '—' : metric(rating.average)}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>Rating / 5</div>
              </div>
            </div>

            {ratingFailed ? (
              <button
                type="button"
                onClick={rating.refetch}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12px] font-semibold"
                style={{ background: 'rgba(244,63,94,.07)', border: '1px solid rgba(244,63,94,.2)', color: 'var(--qms-danger, #b91c1c)' }}
              >
                <FiAlertTriangle size={12} /> Ratings unavailable · Retry
              </button>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <PerformanceMetric value={rating?.isLoading || !rating ? '…' : String(rating.count)} label="Rated" />
                  <PerformanceMetric value={camps?.isLoading || !camps ? '…' : campsFailed ? '—' : String(camps.closedCount)} label="Closed" />
                  <PerformanceMetric value={rating?.isLoading || !rating ? '…' : metric(rating.onTimeAverage)} label="On-time" />
                  <PerformanceMetric value={rating?.isLoading || !rating ? '…' : metric(rating.communicationAverage)} label="Comms" />
                </div>
                <div className="h-1.5 rounded-full overflow-hidden mt-1.5" style={{ background: 'color-mix(in oklab, var(--qms-text) 6%, transparent)' }} aria-label={`${name} rating ${rating?.average == null ? 'unavailable' : `${rating.average} out of 5`}`}>
                  <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #14b8a6, #10b981)' }} />
                </div>
                <div className="flex justify-between mt-1 text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>
                  <span>Attire {rating?.isLoading || !rating ? '…' : metric(rating.attireAverage)}</span>
                  {camps?.truncated && !campsFailed ? <span>Closed count is a minimum</span> : null}
                </div>
              </>
            )}
          </article>
        )
      })}
    </div>
  )
}

const PerformanceMetric = ({ value, label }: { value: string; label: string }) => (
  <div>
    <strong className="block text-[14px]" style={{ color: 'var(--qms-text)' }}>{value}</strong>
    <span className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>{label}</span>
  </div>
)

export default FoPerformanceGrid
