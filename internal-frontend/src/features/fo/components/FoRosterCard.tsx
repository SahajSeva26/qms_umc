import { FiSun, FiMoon, FiAlertTriangle } from 'react-icons/fi'
import type { RoleEntity } from '@/types/accessManagement.types'
import type { GeoProfileEntity } from '@/types/geoProfile.types'
import type { FoRosterCampSummary } from '@/features/fo/hooks/useFoRosterCamps'
import { foRealStatus, FO_STATUS_LABEL, FO_STATUS_BG, FO_STATUS_COLOR, initials } from '@/features/fo/utils/foRealStatus'

interface FoRosterCardProps {
  role: RoleEntity
  geoProfile?: GeoProfileEntity
  campSummary?: FoRosterCampSummary
  onOpen: (roleId: string) => void
}

function displayName(role: RoleEntity): string {
  if (role.user === null || typeof role.user === 'string') return role.name
  return `${role.user.firstName}${role.user.lastName ? ` ${role.user.lastName}` : ''}`
}

// Matches the prototype's .fo-card CSS (fo-manager.js:18-60). Container is a
// <div>, not a <button>, so Retry below can be its own real <button>.
const FoRosterCard = ({ role, geoProfile, campSummary, onOpen }: FoRosterCardProps) => {
  const name = displayName(role)
  const location = [geoProfile?.city, geoProfile?.state].filter(Boolean).join(', ') || '—'
  // A failed camp fetch must never render as "no camp today / 0 closed / 0
  // upcoming" — that's indistinguishable from a real empty roster row.
  const campDataFailed = !!campSummary?.error
  const status = foRealStatus(campSummary?.todayCamp ?? null, campSummary?.upcomingCount ?? 0, campDataFailed || !campSummary || campSummary.isLoading)

  return (
    <div
      className="rounded-2xl border p-3.5 flex flex-col gap-2.5 transition-transform hover:-translate-y-0.5"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <button onClick={() => onOpen(role.id)} className="flex items-center gap-2.5 text-left">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-[16px] shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[14px] leading-tight truncate" style={{ color: 'var(--qms-text)' }}>{name}</div>
          <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{location}</div>
        </div>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0"
          style={{ background: FO_STATUS_BG[status], color: FO_STATUS_COLOR[status] }}
        >
          {FO_STATUS_LABEL[status]}
        </span>
      </button>

      {campDataFailed ? (
        <button
          onClick={() => campSummary?.refetch()}
          className="flex items-center gap-1.5 text-[12px] font-semibold rounded-lg px-2.5 py-2 text-left"
          style={{ background: 'rgba(244,63,94,.07)', border: '1px solid rgba(244,63,94,.2)', color: '#b91c1c' }}
        >
          <FiAlertTriangle size={12} /> Couldn't load camp data · Retry
        </button>
      ) : campSummary?.isLoading || !campSummary ? (
        <div
          className="flex items-center gap-1.5 text-[12px] font-semibold rounded-lg px-2.5 py-2"
          style={{ background: 'rgba(0,0,0,.03)', border: '1px solid var(--qms-border)', color: 'var(--qms-text-muted)', fontWeight: 500 }}
        >
          Loading camp data…
        </div>
      ) : (
        <div
          className="flex items-center gap-1.5 text-[12px] font-semibold rounded-lg px-2.5 py-2"
          style={campSummary?.todayCamp
            ? { background: 'rgba(16,185,129,.07)', border: '1px solid rgba(16,185,129,.2)', color: '#059669' }
            : { background: 'rgba(0,0,0,.03)', border: '1px solid var(--qms-border)', color: 'var(--qms-text-muted)', fontWeight: 500 }}
        >
          {campSummary?.todayCamp ? (
            <>
              <FiSun size={12} /> Today: <b>{campSummary.todayCamp.code}</b>
              {campSummary.todayCamp.location?.city ? ` · ${campSummary.todayCamp.location.city}` : ''}
            </>
          ) : (
            <><FiMoon size={12} /> No camp today</>
          )}
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-lg text-center py-1.5" style={{ background: 'rgba(59,109,255,.05)' }}>
          <div className="font-extrabold text-[14px]" style={{ color: campDataFailed ? 'var(--qms-text-muted)' : 'var(--qms-brand)' }}>
            {campDataFailed ? '—' : campSummary?.isLoading ? '…' : campSummary?.closedCount ?? 0}
          </div>
          <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Closed</div>
        </div>
        <div className="rounded-lg text-center py-1.5" style={{ background: 'rgba(59,109,255,.05)' }}>
          <div className="font-extrabold text-[14px]" style={{ color: campDataFailed ? 'var(--qms-text-muted)' : 'var(--qms-brand)' }}>
            {campDataFailed ? '—' : campSummary?.isLoading ? '…' : campSummary?.upcomingCount ?? 0}
          </div>
          <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Upcoming</div>
        </div>
        <div className="rounded-lg text-center py-1.5" style={{ background: 'rgba(59,109,255,.05)' }}>
          <div className="text-[12px] italic font-semibold" style={{ color: 'var(--qms-brand)' }}>Soon</div>
          <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Occupancy</div>
        </div>
        <div className="rounded-lg text-center py-1.5" style={{ background: 'rgba(59,109,255,.05)' }}>
          <div className="text-[12px] italic font-semibold" style={{ color: 'var(--qms-brand)' }}>Soon</div>
          <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>★ Rating</div>
        </div>
      </div>
    </div>
  )
}

export default FoRosterCard
