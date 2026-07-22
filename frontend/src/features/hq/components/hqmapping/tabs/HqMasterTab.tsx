import { useRef } from 'react'
import { FiUpload, FiDownload, FiTrash2 } from 'react-icons/fi'
import type { ClassifiedHq } from '@/features/hq/hq.types'
import HqTable from '@/features/hq/components/hqmapping/HqTable'
import { downloadCsv } from '@/features/hq/components/hqmapping/hq.ui'
import { toast } from '@/components/ui/sonner'

interface HqMasterTabProps {
  rows: ClassifiedHq[]
  allCount: number
  onOpenRow: (id: string) => void
  onClearUploaded: () => void
}

const HQ_TEMPLATE_ROW = {
  'Pharma Company Name': 'Sun Pharma', Division: 'Cardiology', 'HQ Code': 'HQ-MUM-001',
  'HQ Name': 'Sun Cardio · Mumbai', State: 'MH', District: 'Mumbai Suburban', City: 'Mumbai',
  Pincode: '400001', Latitude: 19.076, Longitude: 72.8777, 'Priority HQ': 'HIGH',
  'Business Potential': 'Platinum', 'Required Device Type': 'ECG', 'Expected Camps Per Month': 6,
}

// Exact port of hq-serviceability.js's renderHqMaster()/bindHqTable() (lines
// 1095-1124) — the drop-zone card (Excel import is stubbed with a toast, per
// this codebase's established convention for unwired file-parsing — see
// BulkUploadCampsModal.tsx's identical "wiring comes next pass" pattern; no
// xlsx/SheetJS dependency exists in this project to genuinely parse .xlsx)
// plus the full HQ rows table.
const HqMasterTab = ({ rows, allCount, onOpenRow, onClearUploaded }: HqMasterTabProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File | undefined) => {
    if (!file) return
    toast.info(`Import of ${file.name} — wiring comes next pass`)
  }

  const downloadTemplate = () => downloadCsv('hq-template.csv', [HQ_TEMPLATE_ROW])

  return (
    <div>
      <div className="rounded-2xl border p-3.5 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[13px] font-extrabold">HQ master data</span>
          <span className="text-[10.5px] font-semibold uppercase" style={{ color: 'var(--qms-text-muted)' }}>
            {rows.length.toLocaleString()} of {allCount.toLocaleString()} HQ rows · seed + uploaded
          </span>
        </div>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="rounded-2xl border-2 border-dashed p-4.5 text-center cursor-pointer transition-colors"
          style={{ borderColor: '#c4b5fd', background: 'rgba(124,92,255,.04)' }}
        >
          <div className="w-[38px] h-[38px] rounded-xl grid place-items-center mx-auto mb-2 text-white" style={{ background: 'linear-gradient(135deg,#7c5cff,#3b6dff)' }}>
            <FiUpload size={18} />
          </div>
          <div className="font-extrabold text-[13px]">Drop the HQ Excel here · or click to choose a file</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>Supports .xlsx, .xls, .csv · headers auto-mapped · duplicates detected</div>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          <div className="flex gap-1.5 justify-center mt-2.5">
            <button
              onClick={(e) => { e.stopPropagation(); downloadTemplate() }}
              className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border"
              style={{ borderColor: 'var(--qms-border)', background: '#fff' }}
            >
              <FiDownload size={12} /> Download template
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClearUploaded() }}
              className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-white"
              style={{ background: 'linear-gradient(135deg,#f43f5e,#fb7185)' }}
            >
              <FiTrash2 size={12} /> Clear uploaded
            </button>
          </div>
        </div>
      </div>
      <HqTable rows={rows} title="All HQ rows" onOpenRow={onOpenRow} />
    </div>
  )
}

export default HqMasterTab
