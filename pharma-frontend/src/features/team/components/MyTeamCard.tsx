import { displayMrName, type EligibleMr } from '@/features/pharma'

// Deterministic per-name hash → one of these 10 colors — reverse-engineered from the prototype's
// own stringToColor() (asm-portal.js), so the same MR always gets the same avatar color across
// renders/sessions without needing a stored field for it.
const AVATAR_PALETTE = ['#3b6dff', '#a855f7', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#14b8a6', '#7c5cff', '#f43f5e', '#84cc16']

function stringToColor(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

interface MyTeamCardProps {
  mr: EligibleMr
}

const divisionLabel = (division: EligibleMr['division']): string | null =>
  division && typeof division !== 'string' ? division.name : null

// Shows only what GET /roles/mrs actually returns (populated user name, code, division) — the prototype's card
// also has an HQ city chip, Screening/Diet/Lab camp-count pills, a "Directly serviceable" banner,
// and camps/upcoming/requested stat chips, none of which exist in our real data today (the
// prototype's version keys off a demo-only `mr.serviceability` field with no backend equivalent,
// and there's no camp-count-per-MR aggregate or MR location field yet — see
// md-files/BACKEND_REQUESTS.md §7). Omitted entirely rather than faked with placeholder zeros.
const MyTeamCard = ({ mr }: MyTeamCardProps) => {
  const division = divisionLabel(mr.division)
  const name = displayMrName(mr)

  return (
    <div
      className="rounded-xl border p-3.5"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)', borderLeft: `3px solid ${stringToColor(name)}` }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="rounded-full flex items-center justify-center text-white font-extrabold text-[13px] shrink-0"
          style={{ width: 38, height: 38, background: stringToColor(name) }}
        >
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-[13px] truncate" style={{ color: 'var(--qms-text)' }}>{name}</div>
          <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-soft)' }}>MR · {mr.code}</div>
        </div>
      </div>
      {division && (
        <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-soft)' }}>{division}</div>
      )}
    </div>
  )
}

export default MyTeamCard
