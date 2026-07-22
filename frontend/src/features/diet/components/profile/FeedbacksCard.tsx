import { FiStar } from 'react-icons/fi'
import type { DietitianProfileBundle } from '@/features/diet/dietitians.types'
import { fmtDate } from './profile.utils'

interface FeedbacksCardProps {
  bundle: DietitianProfileBundle
}

// 5 star glyphs — filled amber for the clamped rating, remaining gray.
const Stars = ({ rating }: { rating: number }) => {
  const filled = Math.max(1, Math.min(5, rating))
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <FiStar key={i} size={12} style={{ color: i < filled ? '#f59e0b' : '#cbd5e1' }} fill={i < filled ? '#f59e0b' : 'none'} />
      ))}
    </span>
  )
}

// §8 (right) — feedbacks & ratings, read-only display. bundle.feedbacks is
// already sorted newest-first by the service. No submit-feedback UI here
// (matches prototype — feedback is recorded elsewhere, e.g. camp closure).
const FeedbacksCard = ({ bundle }: FeedbacksCardProps) => {
  const rows = bundle.feedbacks.slice(0, 10)

  return (
    <div className="rounded-xl border p-3.5 h-full" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide mb-2.5" style={{ color: 'var(--qms-text-soft)' }}>
        <FiStar size={13} /> Feedbacks &amp; ratings
      </div>
      {rows.length === 0 ? (
        <p className="text-[12.5px]" style={{ color: 'var(--qms-text-muted)' }}>No ratings yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['Camp', 'Rating', 'Remarks', 'By'].map((h) => (
                  <th key={h} className="text-left font-semibold px-2.5 py-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((f, i) => (
                <tr key={i} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text)' }}>
                    <div className="font-bold">{f.campId}</div>
                    <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{fmtDate(f.camp?.date)} · {f.camp?.city || '—'}</div>
                  </td>
                  <td className="px-2.5 py-2"><Stars rating={f.rating} /></td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text)' }}>{f.remarks || '—'}</td>
                  <td className="px-2.5 py-2 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{f.by} · {fmtDate(f.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default FeedbacksCard
