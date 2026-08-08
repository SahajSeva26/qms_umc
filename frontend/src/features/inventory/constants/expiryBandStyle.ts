// Shared "band" pill color map (green/yellow/orange/red) for expiry/holding
// status pills. Previously redeclared verbatim (identical rgba/hex values)
// in ItemMasterTab.tsx, FieldOpsTab.tsx, FOInventoryTab.tsx, and
// ExpiryFEFOTab.tsx — extracted here (Phase 4 cleanup) so there's one source
// of truth. Same keys, same values, zero visual change.
import type { ExpiryBandCss } from '@/features/inventory/inventory.types'

export const EXPIRY_BAND_STYLE: Record<ExpiryBandCss, { bg: string; fg: string }> = {
  green: { bg: 'rgba(16,185,129,.15)', fg: '#059669' },
  yellow: { bg: 'rgba(234,179,8,.18)', fg: '#a16207' },
  orange: { bg: 'rgba(249,115,22,.16)', fg: '#c2410c' },
  red: { bg: 'rgba(244,63,94,.15)', fg: '#e11d48' },
}
