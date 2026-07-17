import { useNavigate } from 'react-router-dom'
import { FiFolderPlus, FiActivity, FiCpu } from 'react-icons/fi'
import { useProjectsDataShared } from '@/hooks/useProjectsDataShared'
import { usePeopleData } from '@/hooks/usePeopleData'
import KpiTile from '@/components/ui/KpiTile'
import { Button } from '@/components/ui/button'
import { clientName } from '@/types/campref.types'

// Mirrors renderMasters — a quick-action launcher + counts over the shared
// masters (erp-screening.js:436-540), not a full CRUD screen. Coordinator
// assignment reuses Project Management's own edit flow rather than
// duplicating write logic here.
const MastersTab = () => {
  const navigate = useNavigate()
  const { projects } = useProjectsDataShared()
  const { devices } = usePeopleData()
  const screeningProjects = projects.filter((p) => p.type === 'Screening')

  return (
    <div>
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <KpiTile label="Screening projects" value={String(screeningProjects.length)} tone="brand" icon={FiFolderPlus} />
        <KpiTile label="Tests configured" value="10" tone="teal" icon={FiActivity} />
        <KpiTile label="Devices" value={String(devices.length)} tone="violet" icon={FiCpu} />
      </div>

      <div className="rounded-xl border overflow-x-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: 'var(--qms-surface-strong)' }}>
              {['Project', 'Client', 'PO qty', 'Coordinator'].map((h) => (
                <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {screeningProjects.map((p) => (
              <tr key={p.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{p.name}</td>
                <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{clientName(p.clientId)}</td>
                <td className="px-3 py-2.5 text-center tabular-nums" style={{ color: 'var(--qms-text)' }}>{p.totalCamps}</td>
                <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{p.coordinatorId || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 border-t" style={{ borderColor: 'var(--qms-border)' }}>
          <Button size="sm" variant="outline" onClick={() => navigate('/projects')}>Manage projects, tests & devices in their own modules</Button>
        </div>
      </div>
    </div>
  )
}

export default MastersTab
