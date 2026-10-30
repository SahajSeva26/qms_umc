import { Link } from 'react-router-dom'
import { FiUsers } from 'react-icons/fi'
import type { DietitianRosterEntry } from '@/features/diet/dietitians.types'
import { initials } from './profile.utils'

interface PickerViewProps {
  roster: DietitianRosterEntry[]
}

// §1 — picker/list view (no ?id= present). No search/filter/sort/pagination,
// matching the prototype exactly: render dietitianRoster() as-is.
const PickerView = ({ roster }: PickerViewProps) => {
  return (
    <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide mb-2.5" style={{ color: 'var(--qms-text-soft)' }}>
        <FiUsers size={13} /> Pick a dietitian
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {roster.map((d) => (
          <Link
            key={d.id}
            to={`/diet/profiles?id=${d.id}`}
            className="flex items-center gap-2.5 rounded-xl border p-2.5 no-underline transition-colors"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}
          >
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 text-white font-extrabold text-[13px]"
              style={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)' }}
            >
              {initials(d.name)}
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{d.name}</div>
              <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                {d.hq || '—'}{d.specialty ? ` · ${d.specialty}` : ''}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default PickerView
