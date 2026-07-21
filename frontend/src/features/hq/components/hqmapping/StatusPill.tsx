import type { HqTier, CityTier, BulkCityStatus } from '@/features/hq/hq.types'
import { HQ_TIER_COLOR, CITY_TIER_COLOR } from '@/features/hq/components/hqmapping/hq.ui'

// One pill component per status vocabulary — deliberately NOT unified, per
// the task's instruction that HqTier/CityTier/BulkCityStatus must stay
// visually and semantically distinct across their respective screens.

export function HqStatusPill({ status }: { status: HqTier }) {
  const c = HQ_TIER_COLOR[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold px-2.5 py-1 rounded-full tracking-wide"
      style={{ background: c.bg, color: c.fg }}
    >
      <span className="w-[7px] h-[7px] rounded-full" style={{ background: c.dot }} />
      {status}
    </span>
  )
}

export function CityStatusPill({ status }: { status: CityTier }) {
  const c = CITY_TIER_COLOR[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold px-2.5 py-1 rounded-full tracking-wide"
      style={{ background: c.bg, color: c.fg }}
    >
      <span className="w-[7px] h-[7px] rounded-full" style={{ background: c.dot }} />
      {status}
    </span>
  )
}

const BULK_STATUS_COLOR: Record<BulkCityStatus, { bg: string; fg: string }> = {
  SERVICEABLE: { bg: 'rgba(16,185,129,.15)', fg: '#059669' },
  'NON-SERVICEABLE': { bg: 'rgba(244,63,94,.15)', fg: '#e11d48' },
  'UNKNOWN CITY': { bg: 'rgba(15,23,42,.08)', fg: '#475569' },
}

export function BulkStatusPill({ status }: { status: BulkCityStatus }) {
  const c = BULK_STATUS_COLOR[status]
  return (
    <span className="inline-flex items-center text-[10.5px] font-extrabold px-2.5 py-1 rounded-full tracking-wide" style={{ background: c.bg, color: c.fg }}>
      {status}
    </span>
  )
}
