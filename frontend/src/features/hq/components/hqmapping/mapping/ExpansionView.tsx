import { useMemo } from 'react'
import { FiChevronRight, FiDownload, FiUsers, FiWatch as FiApple, FiNavigation } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import type { ClientMr } from '@/types/client.types'
import type { GeoFo, ExpansionRecommendation } from '@/features/hq/hq.types'
import { buildExpansion } from '@/features/hq/hq.service'
import { downloadCsv } from '@/features/hq/components/hqmapping/hq.ui'
import { toast } from '@/components/ui/sonner'

interface ExpansionViewProps {
  camps: Camp[]
  mrs: ClientMr[]
  fos: GeoFo[]
  onOpenCompanies: () => void
}

const TYPE_LABEL: Record<ExpansionRecommendation['type'], string> = { both: 'FO + Dietitian', diet: 'Dietitian', fo: 'Field Officer' }
const TYPE_BORDER: Record<ExpansionRecommendation['type'], string> = { fo: '#14b8a6', diet: '#10b981', both: '#8b5cf6' }

// Exact port of hq-mapping.js's viewExpansion()/hmExportExpansion() (lines
// 758-803) — buildExpansion() ranked cards (score, demand signals,
// justification) + CSV export. FiApple substitutes lucide's 'apple' icon
// (not in react-icons/fi) — closest available fruit/nutrition icon is
// actually unavailable too, so FiWatch (a neutral dietitian-adjacent glyph)
// is aliased as FiApple for readability at the call site; the Field
// Officer/Both icons (route/users) map directly to existing fi icons.
const ExpansionView = ({ camps, mrs, fos, onOpenCompanies }: ExpansionViewProps) => {
  const recs = useMemo(() => buildExpansion(camps, mrs, fos), [camps, mrs, fos])
  const foN = recs.filter((r) => r.type === 'fo' || r.type === 'both').length
  const dietN = recs.filter((r) => r.type === 'diet' || r.type === 'both').length

  const exportPlan = () => {
    if (!recs.length) return
    downloadCsv('FO-Diet-Expansion-Plan.csv', recs.map((r) => ({
      City: r.city, Recommend: TYPE_LABEL[r.type], Score: r.score,
      CampsExecuted: r.executed, Upcoming: r.upcoming, OpenRequests: r.requested,
      MR_Density: r.mrDensity, DietCamps: r.dietCamps, FO_Based_Here: r.foHere ? 'YES' : 'NO',
      NearestFO: r.nearestFo ? `${r.nearestFo.fo.name} (${r.nearestFo.fo.hq})` : '',
      NearestFO_KM: r.nearestFo?.km ?? '', NearbyLoad_pct: r.avgLoad, Justification: r.why,
    })))
    toast.success('Exported expansion plan')
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 text-[12px] mb-3.5" style={{ color: 'var(--qms-text-muted)' }}>
        <a onClick={onOpenCompanies} className="font-bold cursor-pointer" style={{ color: 'var(--qms-brand)' }}>Companies</a>
        <FiChevronRight size={13} />
        <b style={{ color: 'var(--qms-text)' }}>Expansion recommender</b>
      </div>

      <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
        <div>
          <div className="text-[18px] font-extrabold">Where to add FOs &amp; Dietitians</div>
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Ranked by camp execution, open requests, MR density and existing FO load.</div>
        </div>
        <button onClick={exportPlan} className="flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>
          <FiDownload size={13} /> Export plan
        </button>
      </div>

      <div className="grid gap-2.5 mb-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)' }}><div className="text-[10px] uppercase font-bold" style={{ color: 'var(--qms-text-muted)' }}>Cities flagged</div><div className="text-[22px] font-extrabold mt-0.5" style={{ color: 'var(--qms-brand)' }}>{recs.length}</div></div>
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)' }}><div className="text-[10px] uppercase font-bold" style={{ color: 'var(--qms-text-muted)' }}>Need an FO</div><div className="text-[22px] font-extrabold mt-0.5" style={{ color: '#059669' }}>{foN}</div></div>
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)' }}><div className="text-[10px] uppercase font-bold" style={{ color: 'var(--qms-text-muted)' }}>Need a Dietitian</div><div className="text-[22px] font-extrabold mt-0.5" style={{ color: '#059669' }}>{dietN}</div></div>
      </div>

      {recs.length ? recs.map((r) => {
        const Icon = r.type === 'diet' ? FiApple : r.type === 'both' ? FiUsers : FiNavigation
        return (
          <div key={r.city} className="rounded-lg p-3 mb-2.5" style={{ background: 'var(--qms-surface)', borderLeft: `3px solid ${TYPE_BORDER[r.type]}`, borderTop: '1px solid var(--qms-border)', borderRight: '1px solid var(--qms-border)', borderBottom: '1px solid var(--qms-border)' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Icon size={15} />
              <span className="text-[14px] font-extrabold">{r.city}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,109,255,.1)', color: 'var(--qms-brand)' }}>{TYPE_LABEL[r.type]}</span>
              <span className="ml-auto font-extrabold" style={{ color: 'var(--qms-brand)' }}>score {r.score}</span>
            </div>
            <div className="text-[12px] leading-relaxed" style={{ color: 'var(--qms-text-soft, var(--qms-text-muted))' }}>{r.why}</div>
          </div>
        )
      }) : (
        <div className="text-center py-8" style={{ color: 'var(--qms-text-muted)' }}>No expansion gaps detected — coverage looks healthy.</div>
      )}
    </div>
  )
}

export default ExpansionView
