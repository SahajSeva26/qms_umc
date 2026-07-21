import { FiUpload, FiDownload } from 'react-icons/fi'
import type { GeoFo } from '@/features/hq/hq.types'
import { toast } from '@/components/ui/sonner'
import { downloadCsv } from '@/features/hq/components/hqmapping/hq.ui'

interface FoMasterTabProps {
  fos: GeoFo[]
}

const FO_TEMPLATE_ROW = {
  'FO ID': 'p-ravi', 'FO Name': 'Ravi Kumar', 'Mobile Number': '+91 9810011005', State: 'MH',
  City: 'Pune', Territory: 'Pune-West', 'Working Radius': 35, Latitude: 18.5204, Longitude: 73.8567,
  'Active Status': 'ACTIVE', 'Device Assigned': 'BP, Glucometer, ECG', 'Device Capacity': 4, 'Daily Camp Capacity': 2,
}

// Exact port of hq-serviceability.js's renderFoMaster() (lines 1161-1191) —
// read-only FO list (managed for real in Admin → People / FO Management),
// Excel import stubbed with a toast per this codebase's established
// no-real-xlsx-parser convention (see HqMasterTab.tsx's identical note).
const FoMasterTab = ({ fos }: FoMasterTabProps) => (
  <div>
    <div className="rounded-2xl border p-3.5 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[13px] font-extrabold">FO master</span>
        <span className="text-[10.5px] font-semibold uppercase" style={{ color: 'var(--qms-text-muted)' }}>
          {fos.length} active · click "Import FO" or manage in FO Management
        </span>
      </div>
      <div
        onClick={() => toast.info('Import FO master — wiring comes next pass')}
        className="rounded-2xl border-2 border-dashed p-4.5 text-center cursor-pointer"
        style={{ borderColor: '#c4b5fd', background: 'rgba(124,92,255,.04)' }}
      >
        <div className="w-[38px] h-[38px] rounded-xl grid place-items-center mx-auto mb-2 text-white" style={{ background: 'linear-gradient(135deg,#7c5cff,#3b6dff)' }}>
          <FiUpload size={18} />
        </div>
        <div className="font-extrabold text-[13px]">Import FO master (Excel)</div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>Updates lat/lng + working radius + device capacity · creates new FO records if missing</div>
        <div className="mt-2.5">
          <button
            onClick={(e) => { e.stopPropagation(); downloadCsv('fo-template.csv', [FO_TEMPLATE_ROW]) }}
            className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border mx-auto"
            style={{ borderColor: 'var(--qms-border)', background: '#fff' }}
          >
            <FiDownload size={12} /> Download template
          </button>
        </div>
      </div>
    </div>

    <div className="rounded-2xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <div className="text-[13px] font-extrabold mb-2.5">FOs · live</div>
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr>
            {['FO', 'HQ city', 'State', 'Devices', 'Capacity', 'Load today', 'Lat / Lng'].map((h) => (
              <th key={h} className="text-left px-2 py-1.5 text-[10px] font-extrabold uppercase" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fos.map((f) => (
            <tr key={f.id} style={{ borderBottom: '1px dashed var(--qms-border)' }}>
              <td className="px-2 py-1.5">
                <div className="font-bold">{f.name}</div>
                <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>{f.id}</div>
              </td>
              <td className="px-2 py-1.5">{f.hq}</td>
              <td className="px-2 py-1.5">{f.state}</td>
              <td className="px-2 py-1.5">{f.deviceTypes.join(' · ') || '—'}</td>
              <td className="px-2 py-1.5">{f.dailyCap}/day</td>
              <td className="px-2 py-1.5">{f.loadToday}/{f.dailyCap} · {f.loadPct}%</td>
              <td className="px-2 py-1.5">
                {typeof f.lat === 'number' && typeof f.lng === 'number' ? (
                  `${f.lat.toFixed(4)}, ${f.lng.toFixed(4)}`
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold px-2.5 py-1 rounded-full" style={{ background: 'rgba(244,63,94,.16)', color: '#b91c1c' }}>
                    <span className="w-[7px] h-[7px] rounded-full" style={{ background: '#f43f5e' }} /> NO COORDS
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

export default FoMasterTab
