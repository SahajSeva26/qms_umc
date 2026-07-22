import { FiDownload } from 'react-icons/fi'
import type { Lead } from '@/types/lead.types'
import SideDrawer from '@/components/ui/SideDrawer'
import StagePill from '@/features/crm/components/StagePill'
import ScoreChip from '@/features/crm/components/ScoreChip'
import { Button } from '@/components/ui/button'
import { downloadLeadsCsv } from '@/features/crm/crm.export'
import { formatINR } from '@/utils/formatters'

interface RecordsDrawerProps {
  title: string
  /** Used to build the export filename, e.g. "kpi-pipe" or "insight-dormant" */
  exportSlug: string
  leads: Lead[]
  onClose: () => void
}

// Shared by the KPI drill-down and the AI Insights / Top Reps click-to-drill —
// mirrors the prototype's openRawData(): a titled drawer listing the exact
// lead records behind a summary number, with a CSV export of that same set.
const RecordsDrawer = ({ title, exportSlug, leads, onClose }: RecordsDrawerProps) => {
  const total = leads.reduce((sum, l) => sum + l.value, 0)

  const handleExport = () => downloadLeadsCsv(leads, `crm-${exportSlug}-${new Date().toISOString().slice(0, 10)}.csv`)

  return (
    <SideDrawer open onClose={onClose} title={title}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
          <span className="font-bold" style={{ color: 'var(--qms-text)' }}>{leads.length}</span> records ·{' '}
          <span className="font-bold" style={{ color: 'var(--qms-text)' }}>{formatINR(total)}</span> total
        </div>
        <Button size="xs" variant="outline" onClick={handleExport} disabled={leads.length === 0}>
          <FiDownload size={12} /> Export
        </Button>
      </div>
      <div className="space-y-2">
        {leads.map((lead) => (
          <div key={lead.id} className="rounded-lg p-2.5" style={{ background: 'var(--qms-surface-strong)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-bold" style={{ color: 'var(--qms-text)' }}>{lead.account}</span>
              <ScoreChip score={lead.score} size="sm" />
            </div>
            <div className="flex items-center justify-between">
              <StagePill stage={lead.stage} />
              <span className="text-[12px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>{formatINR(lead.value)}</span>
            </div>
          </div>
        ))}
        {leads.length === 0 && (
          <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No matching records.</p>
        )}
      </div>
    </SideDrawer>
  )
}

export default RecordsDrawer
