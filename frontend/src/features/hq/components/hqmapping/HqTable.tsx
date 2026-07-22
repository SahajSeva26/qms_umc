import type { ClassifiedHq } from '@/features/hq/hq.types'
import { HqStatusPill } from '@/features/hq/components/hqmapping/StatusPill'

interface HqTableProps {
  rows: ClassifiedHq[]
  title: string
  subtitle?: string
  onOpenRow: (id: string) => void
}

// Exact port of hq-serviceability.js's renderHqTable() (lines 1125-1152) —
// HQ / Pharma / City·State / Required device / Status / Nearest FO / FO city
// / Distance·ETA / Last updated, click-to-drawer.
const HqTable = ({ rows, title, subtitle, onOpenRow }: HqTableProps) => (
  <div className="rounded-2xl border p-3.5 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
    <div className="flex items-center justify-between mb-2.5">
      <span className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{title}</span>
      <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>
        {subtitle ?? 'click a row for nearest FO + actions'}
      </span>
    </div>
    <div className="overflow-auto" style={{ maxHeight: 520 }}>
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr>
            {['HQ', 'Pharma', 'City · State', 'Required device', 'Status', 'Nearest FO', 'FO city', 'Distance · ETA', 'Last updated'].map((h) => (
              <th
                key={h}
                className="text-left px-2 py-2 text-[10px] font-extrabold uppercase tracking-wide sticky top-0"
                style={{ color: 'var(--qms-text-muted)', background: 'var(--qms-surface-strong)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => onOpenRow(r.id)}
              className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
              style={{ borderBottom: '1px dashed var(--qms-border)' }}
            >
              <td className="px-2 py-2 align-top">
                <div className="font-bold" style={{ color: 'var(--qms-text)' }}>{r.hqName}</div>
                <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>{r.hqCode} · {r.division}</div>
              </td>
              <td className="px-2 py-2 align-top">{r.company}</td>
              <td className="px-2 py-2 align-top">
                {r.city}
                <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>{r.state}</div>
              </td>
              <td className="px-2 py-2 align-top">{r.requiredDevice || '—'}</td>
              <td className="px-2 py-2 align-top"><HqStatusPill status={r.status} /></td>
              <td className="px-2 py-2 align-top">
                {r.nearestFo ? (
                  <>
                    <div className="font-bold">{r.nearestFo.name}</div>
                    <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>load {r.nearestFo.loadPct}%</div>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold px-2 py-1 rounded-full" style={{ background: 'rgba(244,63,94,.16)', color: '#b91c1c' }}>NONE</span>
                )}
              </td>
              <td className="px-2 py-2 align-top">{r.nearestFo ? r.nearestFo.hq : '—'}</td>
              <td className="px-2 py-2 align-top">
                {r.distanceKm != null ? (
                  <>
                    {r.distanceKm.toFixed(1)} KM
                    <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>~{r.etaMin} min</div>
                  </>
                ) : '—'}
              </td>
              <td className="px-2 py-2 align-top">{new Date(r.lastUpdated).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit' })}</td>
            </tr>
          )) : (
            <tr><td colSpan={9} className="text-center py-6" style={{ color: 'var(--qms-text-muted)' }}>No matching rows</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
)

export default HqTable
