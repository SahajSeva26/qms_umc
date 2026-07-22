import type { DietitianProfileBundle } from '@/features/diet/dietitians.types'
import { initials } from './profile.utils'

interface HeroHeaderProps {
  bundle: DietitianProfileBundle
}

// §2 — hero header. Gradient card, avatar, name, contact sub-line, rating
// chip (only if averageRating present), BCA badge (always one of 3 states).
const HeroHeader = ({ bundle }: HeroHeaderProps) => {
  const { dietitian: d, details: det, equipment, averageRating } = bundle
  const bca = equipment.bca

  const bcaLabel = bca.verified ? '✓ BCA verified' : bca.owned ? 'BCA un-verified' : 'No BCA'
  // dietitian-profile.js:59 prefers the details overlay's email/phone over
  // the roster record's own, wherever contact info is shown on this page.
  const email = det.email || d.email
  const phone = det.phone || d.phone

  return (
    <div
      className="rounded-[14px] p-[18px] flex items-start gap-3.5 flex-wrap text-white"
      style={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)' }}
    >
      <div
        className="w-16 h-16 rounded-[18px] flex items-center justify-center shrink-0 font-extrabold text-[26px]"
        style={{ background: 'rgba(255,255,255,.22)' }}
      >
        {initials(d.name)}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-[20px] font-extrabold leading-tight">{d.name}</h1>
        <div className="text-[12px] mt-0.5" style={{ opacity: 0.9 }}>
          {email || '—'} · {phone || '—'} · {d.hq || '—'}{d.specialty ? ` · ${d.specialty}` : ''}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {averageRating && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-extrabold rounded-full px-2.5 py-[3px]"
              style={{ background: 'rgba(255,255,255,.18)' }}
            >
              {averageRating.avg} ★ · {averageRating.count} rating{averageRating.count !== 1 ? 's' : ''}
            </span>
          )}
          <span
            className="inline-flex items-center gap-1 text-[11px] font-extrabold rounded-full px-2.5 py-[3px]"
            style={{ background: 'rgba(255,255,255,.18)' }}
          >
            {bcaLabel}
          </span>
        </div>
      </div>
    </div>
  )
}

export default HeroHeader
