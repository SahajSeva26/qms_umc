import { useState } from 'react'
import { FiUpload, FiDownload, FiFileText, FiCheckCircle, FiXCircle, FiX } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'

interface BulkUploadCampsModalProps {
  open: boolean
  onClose: () => void
}

// Mirrors BULK_COLUMNS exactly (camps.js:762)
const BULK_COLUMNS = [
  'Date', 'Camp Type', 'Company', 'Division', 'Project', 'Doctor Name', 'City', 'State',
  'MR Name', 'Patients Screened', 'Executed By (3rd party)', 'Notes',
]

interface BulkSummary {
  imported: number
  skipped: number
}

const BulkUploadCampsModal = ({ open, onClose }: BulkUploadCampsModalProps) => {
  const [summary, setSummary] = useState<BulkSummary | null>(null)

  const handleDownloadTemplate = () => {
    toast.info('Template download — wiring comes next pass')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSummary({ imported: 0, skipped: 0 })
    toast.info('File upload/parsing — wiring comes next pass')
    e.target.value = ''
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-brand)' }}
            >
              <FiUpload size={14} />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
                Bulk upload — historical camps
              </DialogTitle>
              <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>
                3rd-party-executed camps · .xlsx import
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center gap-1.5 text-xs font-bold mb-2" style={{ color: 'var(--qms-text)' }}>
          <FiFileText size={13} /> Import historical camps
        </div>
        <div className="text-xs mb-3" style={{ color: 'var(--qms-text-muted)' }}>
          Upload past, 3rd-party-executed camps. Each row becomes a <b style={{ color: 'var(--qms-text)' }}>CLOSED</b> camp.
          Columns: {BULK_COLUMNS.join(' · ')}.
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <FiDownload size={14} /> Download template
          </Button>
        </div>

        <div>
          <label
            className="block text-xs font-bold uppercase mb-1.5"
            style={{ color: 'var(--qms-text-muted)', letterSpacing: '.04em' }}
          >
            Upload filled .xlsx
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="block w-full text-xs rounded-lg border px-2.5 py-1.5"
            style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)', background: 'var(--qms-surface)' }}
          />
        </div>

        {summary && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
              style={{ background: 'var(--success-soft)', color: 'var(--success)' }}
            >
              <FiCheckCircle size={11} /> Imported: <b>{summary.imported}</b>
            </span>
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
              style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}
            >
              <FiXCircle size={11} /> Skipped (no date): <b>{summary.skipped}</b>
            </span>
          </div>
        )}

        <DialogFooter className="sm:justify-between items-center">
          <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>
            Rows without a Date are skipped
          </div>
          <Button variant="outline" onClick={onClose}>
            <FiX size={14} /> Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BulkUploadCampsModal
