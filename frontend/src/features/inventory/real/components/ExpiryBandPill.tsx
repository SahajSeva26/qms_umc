import { expiryBand, EXPIRY_BAND_COLOR } from '@/features/inventory/real/utils/expiryBand'

interface ExpiryBandPillProps {
  expiryDate: string | undefined | null
}

// Matches the prototype's .im-band (inventory-masters.js:209-214) — pure display over the real expiryDate field.
const ExpiryBandPill = ({ expiryDate }: ExpiryBandPillProps) => {
  const band = expiryBand(expiryDate)
  if (!band) return <span style={{ color: 'var(--qms-text-muted)' }}>—</span>
  const color = EXPIRY_BAND_COLOR[band.css]
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
      style={{ background: color.bg, color: color.text }}
    >
      {band.label}
    </span>
  )
}

export default ExpiryBandPill
