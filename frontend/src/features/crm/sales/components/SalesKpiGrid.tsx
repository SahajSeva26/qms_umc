import {
  FiTarget, FiTrendingUp, FiPieChart, FiPercent, FiGitMerge, FiZap,
  FiBriefcase, FiUserPlus, FiUsers, FiRepeat, FiFolder, FiLayers,
} from 'react-icons/fi'
import { GiWallet, GiCrown, GiCampingTent, GiShinyApple, GiRoundBottomFlask } from 'react-icons/gi'
import { PiGaugeBold, PiReceiptBold, PiStackBold } from 'react-icons/pi'
import type { IconType } from 'react-icons'
import type { SalesKpiTile, KpiTone } from '@/features/crm/sales/sales.kpis'
import { groupByCategory } from '@/features/crm/sales/sales.kpis'

// Mirrors the prototype's .kpi/.kpi.tone tiles (styles.css lines 449-489) —
// the colored corner glow-blob is a blurred ::after circle at 18% opacity.
const TONE_COLOR: Record<KpiTone, string> = {
  brand: '#3b6dff',
  teal: '#14b8a6',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
}

const ICON_BY_ID: Record<string, IconType> = {
  'sh-rev': GiWallet,
  'sh-rvt': FiTarget,
  'sh-ytd': FiTrendingUp,
  'sh-run': PiGaugeBold,
  'sh-gm': FiPercent,
  'sh-ebitda': FiPieChart,
  'sh-out': PiReceiptBold,
  'sh-pipe': FiTrendingUp,
  'sh-conv': FiGitMerge,
  'sh-fc': FiZap,
  acc: FiBriefcase,
  'sh-new': FiUserPlus,
  'sh-hv': GiCrown,
  'sh-ret': FiRepeat,
  'sh-team': FiUsers,
  'sh-camps': GiCampingTent,
  'sh-scr': FiUsers,
  'sh-prj': FiFolder,
  'sh-pscr': GiCampingTent,
  'sh-pdiet': GiShinyApple,
  'sh-plab': GiRoundBottomFlask,
  'sh-pmix': PiStackBold,
  div: FiLayers,
  pen: FiPieChart,
  bill: GiWallet,
  l2po: FiGitMerge,
  tva: FiTarget,
  qtva: PiGaugeBold,
}

const KpiTileView = ({ tile }: { tile: SalesKpiTile }) => {
  const color = TONE_COLOR[tile.tone]
  const Icon = ICON_BY_ID[tile.id] ?? FiTarget
  return (
    <div
      className="relative rounded-xl border p-3 overflow-hidden transition-transform hover:-translate-y-0.5"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', backdropFilter: 'blur(20px) saturate(140%)' }}
    >
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ right: -30, top: -30, width: 140, height: 140, opacity: 0.18, filter: 'blur(30px)', background: color }}
      />
      <div className="relative flex items-start gap-2 mb-1.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(36,81,240,.16), rgba(20,184,166,.16))', border: '1px solid var(--qms-border-strong)', color: 'var(--qms-brand)' }}
        >
          <Icon size={14} />
        </div>
        <div className="text-[10.5px] font-semibold uppercase leading-tight" style={{ color: 'var(--qms-text-muted)', letterSpacing: '.02em' }}>
          {tile.label}
        </div>
      </div>
      <div className="relative text-[21px] font-extrabold leading-tight mb-0.5" style={{ color: 'var(--qms-text)', letterSpacing: '-0.02em' }}>
        {tile.value}
      </div>
      {tile.sub && (
        <div className="relative text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{tile.sub}</div>
      )}
    </div>
  )
}

const SalesKpiGrid = ({ tiles }: { tiles: SalesKpiTile[] }) => {
  const categories = groupByCategory(tiles)
  return (
    <div className="mb-3.5">
      {categories.map(({ cat, tiles: catTiles }) => (
        <div key={cat} className="mb-3">
          <div
            className="relative text-[11px] font-extrabold uppercase tracking-wide pl-2.5 mb-1.5"
            style={{ color: 'var(--qms-text-muted)' }}
          >
            <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full" style={{ background: 'var(--qms-brand)' }} />
            {cat}
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
            {catTiles.map((tile) => (
              <KpiTileView key={tile.id} tile={tile} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default SalesKpiGrid
