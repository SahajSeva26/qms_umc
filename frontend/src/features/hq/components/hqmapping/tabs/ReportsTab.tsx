import { FiFileText, FiClock, FiDatabase, FiFileMinus, FiDownload, FiPrinter, FiGlobe, FiUserCheck, FiCpu, FiAlertTriangle, FiMap } from 'react-icons/fi'
import type { ClassifiedHq, GeoFo } from '@/features/hq/hq.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import HqKpi from '@/features/hq/components/hqmapping/HqKpi'
import { HQ_REPORT_DEFS, buildReportRows, type HqReportId } from '@/features/hq/components/hqmapping/hqReports'
import { downloadCsv, printableReport, todayIso } from '@/features/hq/components/hqmapping/hq.ui'
import { toast } from '@/components/ui/sonner'

interface ReportsTabProps {
  rows: ClassifiedHq[]
  fos: GeoFo[]
  devices: DeviceCatalogItem[]
}

const REPORT_ICON: Record<HqReportId, typeof FiFileText> = {
  coverage: FiFileMinus,
  state: FiGlobe,
  'fo-util': FiUserCheck,
  'device-util': FiCpu,
  gap: FiAlertTriangle,
  nearest: FiMap,
}

// Exact port of hq-serviceability.js's renderReports()/hqRunReport() (lines
// 1196-1226, 1772-1848) — 6 pre-built reports, each exportable as CSV, "Excel"
// (CSV under the hood — no xlsx dependency, matching this codebase's
// established convention) or PDF (window.print(), no PDF library needed).
const ReportsTab = ({ rows, fos, devices }: ReportsTabProps) => {
  const run = (id: HqReportId, fmt: 'csv' | 'xlsx' | 'pdf') => {
    const data = buildReportRows(id, rows, fos, devices)
    if (!data.length) { toast.info('No data'); return }
    const filename = { coverage: 'hq-coverage', state: 'state-coverage', 'fo-util': 'fo-utilization', 'device-util': 'device-utilization', gap: 'gap-analysis', nearest: 'nearest-fo-mapping' }[id]
    if (fmt === 'pdf') {
      printableReport(filename, data)
    } else {
      downloadCsv(`${filename}-${todayIso()}.csv`, data)
      if (fmt === 'xlsx') toast.info('Excel library not available in this build — exported CSV instead')
    }
    toast.success(`Exported ${filename} (${fmt})`)
  }

  return (
    <div>
      <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <HqKpi label="Total reports" value="6" sub="Pre-built" icon={FiFileText} tone="blue" />
        <HqKpi label="Last refresh" value={new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} sub="Local" icon={FiClock} />
        <HqKpi label="Records" value={rows.length.toLocaleString()} sub="HQ master" icon={FiDatabase} />
      </div>

      {HQ_REPORT_DEFS.map((r) => {
        const Icon = REPORT_ICON[r.id]
        return (
          <div key={r.id} className="rounded-2xl border p-3.5 mb-2.5 flex items-center gap-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="w-[42px] h-[42px] rounded-xl grid place-items-center shrink-0 text-white" style={{ background: 'linear-gradient(135deg,#7c5cff,#3b6dff)' }}>
              <Icon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-[13px]">{r.name}</div>
              <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{r.desc}</div>
            </div>
            <div className="flex gap-1.5 flex-wrap shrink-0">
              <button onClick={() => run(r.id, 'csv')} className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>
                <FiDownload size={12} /> CSV
              </button>
              <button onClick={() => run(r.id, 'xlsx')} className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>
                <FiFileText size={12} /> Excel
              </button>
              <button onClick={() => run(r.id, 'pdf')} className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-white" style={{ background: 'linear-gradient(135deg,#7c5cff,#3b6dff)' }}>
                <FiPrinter size={12} /> PDF
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ReportsTab
