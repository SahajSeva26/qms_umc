import { FiStar } from 'react-icons/fi'
import { RATING_GROUNDS, type RatingEntity } from '@qms/core'

const stars = (n: number) => {
  const filled = Math.round(n)
  return (
    <span className="inline-flex gap-px" style={{ color: '#f59e0b' }}>
      {Array.from({ length: 5 }, (_, i) => (
        <FiStar key={i} size={13} fill={i < filled ? 'currentColor' : 'none'} />
      ))}
    </span>
  )
}

interface RatingDisplayProps {
  rating: RatingEntity
}

// Read-only breakdown — clones the prototype's camp-detail.js renderRating() grid layout
// (ground label + star glyphs + N/5) and audit line. No reason/feedback text — the backend
// model has no such fields (see md-files/BACKEND_REQUESTS.md §4.5).
const RatingDisplay = ({ rating }: RatingDisplayProps) => {
  const grounds = [
    { key: 'overall', label: 'Overall', value: rating.overall },
    ...RATING_GROUNDS.map((g) => ({ key: g.key, label: g.label, value: rating[g.key as 'onTime' | 'attire' | 'communication'] })),
  ]

  return (
    <div>
      <div className="grid gap-x-3 gap-y-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
        {grounds.map((g) => (
          <div key={g.key}>
            <div className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{g.label}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {stars(g.value)}
              <span className="text-[11px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>{g.value}/5</span>
            </div>
          </div>
        ))}
      </div>

      {rating.ratedBy && (
        <div className="mt-1.5 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
          Rated by {rating.ratedBy.name} on {new Date(rating.ratedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}

export default RatingDisplay
