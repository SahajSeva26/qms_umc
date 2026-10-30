import type { CampStatus } from '@/types/campReal.types'

const STATUS_OPTIONS: Array<{ status: CampStatus | 'ALL'; label: string }> = [
  { status: 'ALL', label: 'All' },
  { status: 'requested', label: 'Requested' },
  { status: 'confirmed', label: 'Upcoming' },
  { status: 'live', label: 'Live' },
  { status: 'closed', label: 'Completed' },
  { status: 'cancelled', label: 'Cancelled' },
  { status: 'cancelled_charged', label: 'Cancelled · Charged' },
]

interface DietCampsStatusPillsProps {
  counts: Record<CampStatus, number>
  total: number
  activeStatus: CampStatus | 'ALL'
  onSelect: (status: CampStatus | 'ALL') => void
}

const DietCampsStatusPills = ({ counts, total, activeStatus, onSelect }: DietCampsStatusPillsProps) => (
  <div
    aria-label="Diet camp status filters"
    className="mb-3 flex gap-1.5 overflow-x-auto rounded-[10px] border px-3 py-2.5"
    style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
  >
    {STATUS_OPTIONS.map(({ status, label }) => {
      const active = status === activeStatus
      const count = status === 'ALL' ? total : counts[status]

      return (
        <button
          key={status}
          type="button"
          aria-label={`${label} ${count}`}
          aria-pressed={active}
          onClick={() => onSelect(status)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors"
          style={{
            background: active ? 'var(--qms-brand)' : 'var(--qms-surface-card)',
            borderColor: active ? 'var(--qms-brand)' : 'var(--qms-border)',
            color: active ? '#fff' : 'var(--qms-text-muted)',
          }}
        >
          {label}
          <span
            className="min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold"
            style={{
              background: active ? 'rgba(255,255,255,.2)' : 'var(--qms-surface-strong)',
              color: active ? '#fff' : 'var(--qms-text-muted)',
            }}
          >
            {count}
          </span>
        </button>
      )
    })}
  </div>
)

export default DietCampsStatusPills
