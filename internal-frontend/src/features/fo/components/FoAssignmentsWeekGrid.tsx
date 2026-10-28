import { useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiMapPin, FiAlertTriangle } from 'react-icons/fi'
import type { RoleEntity } from '@/types/accessManagement.types'
import type { GeoProfileEntity } from '@/types/geoProfile.types'
import { CAMP_TYPE_LABEL } from '@/types/campReal.types'
import { useFoWeekCamps } from '@/features/fo/hooks/useFoWeekCamps'
import { initials } from '@/features/fo/utils/foRealStatus'

function displayName(role: RoleEntity): string {
  if (role.user === null || typeof role.user === 'string') return role.name
  return `${role.user.firstName}${role.user.lastName ? ` ${role.user.lastName}` : ''}`
}

// Local calendar date, not toISOString() — that converts to UTC first, so in India (UTC+5:30)
// local Monday midnight becomes Sunday in UTC, shifting every query/label off by a day.
const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Monday of the week containing `anchor` — matches the prototype's own Mon-Sun week math exactly.
function mondayOf(anchor: Date): Date {
  const d = new Date(anchor)
  const dow = d.getDay()
  d.setDate(d.getDate() - ((dow + 6) % 7))
  return d
}

interface FoAssignmentsWeekGridProps {
  roles: RoleEntity[]
  geoByRole: Map<string, GeoProfileEntity>
  onOpen: (roleId: string) => void
}

// Matches the prototype's .fo-week-grid exactly (fo-manager.js:102-123, tabAssignments) — a
// 200px/7-col CSS grid of camps per FO per day, derived from real camp.fo + camp.date (no new
// backend needed). Clicking a camp calls onOpen(role.id), opening that FO's drawer — not a
// navigation to Camp Management.
const FoAssignmentsWeekGrid = ({ roles, geoByRole, onOpen }: FoAssignmentsWeekGridProps) => {
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const monday = mondayOf(weekAnchor)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
  const today = toIso(new Date())
  const dateFrom = toIso(days[0])
  const dateTo = toIso(days[6])

  const roleIds = roles.map((r) => r.id)
  const weekCamps = useFoWeekCamps(roleIds, dateFrom, dateTo)

  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <button
          onClick={() => setWeekAnchor((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
          className="p-1.5 rounded-lg border transition-colors hover:bg-(--qms-surface-hover)"
          style={{ borderColor: 'var(--qms-border)' }}
        >
          <FiChevronLeft size={13} />
        </button>
        <span className="text-[12px] font-bold" style={{ color: 'var(--qms-text)' }}>
          {days[0].toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} → {days[6].toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </span>
        <button
          onClick={() => setWeekAnchor((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
          className="p-1.5 rounded-lg border transition-colors hover:bg-(--qms-surface-hover)"
          style={{ borderColor: 'var(--qms-border)' }}
        >
          <FiChevronRight size={13} />
        </button>
        <button
          onClick={() => setWeekAnchor(new Date())}
          className="ml-auto flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-(--qms-surface-hover)"
          style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
        >
          <FiMapPin size={12} /> This week
        </button>
      </div>

      {roles.length === 0 ? (
        <div className="px-4 py-10 text-center text-[13px] rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
          No FOs match these filters.
        </div>
      ) : (
        <div className="grid gap-1" style={{ gridTemplateColumns: `200px repeat(7, 1fr)` }}>
          <div
            className="rounded-lg font-bold text-center uppercase tracking-wide px-1 py-2"
            style={{ background: 'rgba(0,0,0,.03)', fontSize: 10, color: 'var(--qms-text-muted)' }}
          >
            FO
          </div>
          {days.map((d) => (
            <div
              key={toIso(d)}
              className="rounded-lg font-bold text-center uppercase tracking-wide px-1 py-2"
              style={{
                background: 'rgba(0,0,0,.03)', fontSize: 10, color: 'var(--qms-text-muted)',
                boxShadow: toIso(d) === today ? 'inset 0 0 0 2px var(--qms-brand)' : undefined,
              }}
            >
              {d.toLocaleDateString('en-IN', { weekday: 'short' })}<br />{d.getDate()}
            </div>
          ))}

          {roles.map((role) => {
            const entry = weekCamps[role.id]
            const city = geoByRole.get(role.id)?.city
            return (
              <div key={role.id} className="contents">
                <button
                  onClick={() => onOpen(role.id)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left"
                  style={{ background: 'color-mix(in srgb, var(--qms-brand) 5%, transparent)', minHeight: 60, border: '1px solid var(--qms-border)' }}
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-extrabold shrink-0"
                    style={{ background: 'var(--qms-brand)' }}
                  >
                    {initials(displayName(role))}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>
                      {displayName(role)}
                      {entry?.truncated && (
                        <span title="More camps exist this week than shown — the week may be incomplete." style={{ color: '#d97706' }}> ⚠</span>
                      )}
                    </div>
                    <div className="text-[10px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{city ?? '—'}</div>
                  </div>
                </button>
                {entry?.error ? (
                  <button
                    onClick={() => entry.refetch()}
                    className="flex items-center justify-center gap-1.5 rounded-lg border text-[11px] font-semibold"
                    style={{ gridColumn: 'span 7', minHeight: 60, background: 'rgba(244,63,94,.07)', borderColor: 'rgba(244,63,94,.2)', color: '#b91c1c' }}
                  >
                    <FiAlertTriangle size={12} /> Couldn't load this week's camps · Retry
                  </button>
                ) : days.map((d) => {
                  const iso = toIso(d)
                  const campsOnDay = (entry?.camps ?? []).filter((c) => c.date?.slice(0, 10) === iso)
                  return (
                    <div
                      key={iso}
                      className="rounded-lg px-1.5 py-1.5 border"
                      style={{
                        minHeight: 60, fontSize: 11, borderColor: 'var(--qms-border)',
                        boxShadow: iso === today ? 'inset 0 0 0 2px var(--qms-brand)' : undefined,
                      }}
                    >
                      {entry?.isLoading ? (
                        <span style={{ color: 'var(--qms-text-muted)' }}>…</span>
                      ) : campsOnDay.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          title={`${c.code} · ${c.location?.city ?? ''} · ${c.status}`}
                          aria-label={`Open ${displayName(role)} — camp ${c.code}, ${CAMP_TYPE_LABEL[c.type]}, ${c.status}`}
                          className="block w-full text-left rounded px-1.5 py-0.5 mb-0.5 text-[10px] font-semibold truncate cursor-pointer"
                          style={{ background: 'color-mix(in srgb, var(--qms-brand) 12%, transparent)', color: 'var(--qms-brand)' }}
                          onClick={() => onOpen(role.id)}
                        >
                          {c.code} · {CAMP_TYPE_LABEL[c.type]}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default FoAssignmentsWeekGrid
