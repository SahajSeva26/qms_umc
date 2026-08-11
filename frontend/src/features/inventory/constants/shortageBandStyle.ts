// Shared shortage/readiness "band" pill color map (green/amber/orange/red) —
// the inventory-intel.js '.im-band' palette (distinct from the Item Master
// expiry-band palette, which uses 'yellow' not 'amber' as its 4th key,
// despite sharing the same underlying color values — kept as separate
// constants since the two key vocabularies belong to different domains).
// Previously redeclared in both DashboardsTab.tsx (all 4 keys) and
// ForecastTab.tsx (a value-identical green/red subset) — consolidated here.
// Same keys, same values, zero visual change.
export const SHORTAGE_BAND_STYLE: Record<'green' | 'amber' | 'orange' | 'red', { bg: string; fg: string }> = {
  green: { bg: 'rgba(16,185,129,.15)', fg: '#059669' },
  amber: { bg: 'rgba(234,179,8,.18)', fg: '#a16207' },
  orange: { bg: 'rgba(249,115,22,.16)', fg: '#c2410c' },
  red: { bg: 'rgba(244,63,94,.15)', fg: '#e11d48' },
}
