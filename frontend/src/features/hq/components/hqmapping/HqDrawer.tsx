import { FiCopy, FiUserCheck, FiDownload } from 'react-icons/fi'
import SideDrawer from '@/components/ui/SideDrawer'
import type { ClassifiedHq } from '@/features/hq/hq.types'
import { HqStatusPill } from '@/features/hq/components/hqmapping/StatusPill'
import { toast } from '@/components/ui/sonner'

interface HqDrawerProps {
  hq: ClassifiedHq | null
  onClose: () => void
  onAssign?: (hq: ClassifiedHq) => void
  onExportCoverage: () => void
}

// Exact port of hq-serviceability.js's window.hqOpenDrawer() (lines 1884-1930)
// — HQ details table, serviceability verdict + nearest/2nd-nearest FO, and
// the 3 drawer actions (copy coords / book camp with this FO / export coverage).
const HqDrawer = ({ hq, onClose, onAssign, onExportCoverage }: HqDrawerProps) => (
  <SideDrawer open={!!hq} title={hq?.hqName ?? 'HQ Detail'} onClose={onClose} widthClassName="max-w-lg">
    {hq && (
      <div>
        <div className="mb-3 flex items-center gap-1.5">
          <HqStatusPill status={hq.status} />
          <span className="inline-flex items-center text-[10.5px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(15,23,42,.06)', color: '#475569' }}>
            {hq.priority || 'MED'}
          </span>
        </div>

        <div className="rounded-xl border p-3 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[13px] font-extrabold mb-2" style={{ color: 'var(--qms-text)' }}>HQ details</div>
          <table className="w-full text-[12px]">
            <tbody>
              {[
                ['Company', hq.company],
                ['Division', hq.division],
                ['HQ Code', hq.hqCode],
                ['City / State', `${hq.city} · ${hq.state}`],
                ['Pincode', hq.pincode || '—'],
                ['Coordinates', hq.lat ? `${hq.lat.toFixed(5)}, ${hq.lng!.toFixed(5)}${hq.geoSource ? ` (${hq.geoSource})` : ''}` : '—'],
                ['Required device', hq.requiredDevice || '—'],
                ['Business potential', hq.businessPotential || '—'],
                ['Camps/month', String(hq.campsPerMonth || 0)],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px dashed var(--qms-border)' }}>
                  <th className="text-left py-1.5 pr-2 font-semibold w-[42%]" style={{ color: 'var(--qms-text-muted)' }}>{k}</th>
                  <td className="py-1.5">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border p-3 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[13px] font-extrabold mb-2" style={{ color: 'var(--qms-text)' }}>Serviceability verdict</div>
          <div className="text-[12.5px] font-bold">{hq.reason}</div>
          {hq.nearestFo && (
            <div className="mt-2 p-2.5 rounded-lg text-[12px]" style={{ background: 'rgba(20,184,166,.08)' }}>
              <div className="font-extrabold">Nearest FO · {hq.nearestFo.name}</div>
              <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{hq.nearestFo.hq} · {hq.nearestFo.state} · {hq.nearestFo.phone || ''}</div>
              <div className="mt-1.5 flex flex-wrap gap-2 text-[11.5px]">
                <span><b>Distance:</b> {hq.distanceKm?.toFixed(2)} KM</span>
                <span><b>ETA:</b> ~{hq.etaMin} min</span>
                <span><b>Load:</b> {hq.nearestFo.loadPct}%</span>
                <span><b>Devices:</b> {hq.nearestFo.devices.join(', ') || '—'}</span>
              </div>
            </div>
          )}
          {hq.secondFo && (
            <div className="mt-2 p-2 rounded-lg text-[12px]" style={{ background: 'var(--qms-surface-strong)' }}>
              <b>2nd nearest:</b> {hq.secondFo.name} · {hq.secondFo.hq} · {hq.secondFo.km.toFixed(2)} KM
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => {
              if (hq.lat != null) {
                navigator.clipboard?.writeText(`${hq.lat.toFixed(5)}, ${hq.lng!.toFixed(5)}`)
                toast.success('Coords copied')
              }
            }}
            className="flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1.5 rounded-lg border"
            style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
          >
            <FiCopy size={12} /> Copy coords
          </button>
          {hq.nearestFo && onAssign && (
            <button
              onClick={() => onAssign(hq)}
              className="flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1.5 rounded-lg text-white"
              style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
            >
              <FiUserCheck size={12} /> Book camp with this FO
            </button>
          )}
          <button
            onClick={onExportCoverage}
            className="flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1.5 rounded-lg border"
            style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
          >
            <FiDownload size={12} /> Export coverage
          </button>
        </div>
      </div>
    )}
  </SideDrawer>
)

export default HqDrawer
