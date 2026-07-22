import type { EngagementBand } from '@/features/doctors/doctors.types'
import { BAND_COLOR, BAND_LABEL } from '@/features/doctors/doctors.ui'

const BandPill = ({ band }: { band: EngagementBand }) => (
  <span
    className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
    style={{ background: `${BAND_COLOR[band]}1a`, color: BAND_COLOR[band] }}
  >
    {BAND_LABEL[band]}
  </span>
)

export default BandPill
