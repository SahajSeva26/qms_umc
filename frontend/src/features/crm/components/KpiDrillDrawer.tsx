import type { Lead, KpiTile } from '@/types/lead.types'
import RecordsDrawer from '@/features/crm/components/RecordsDrawer'

function describeKpi(tile: KpiTile, leads: Lead[]): Lead[] {
  switch (tile.id) {
    case 'pipe':
    case 'open':
    case 'aov':
      return leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost')
    case 'won':
      return leads.filter((l) => l.stage === 'won')
    case 'wr':
      return leads.filter((l) => l.stage === 'won' || l.stage === 'lost')
    case 'aiscore':
      return [...leads].sort((a, b) => b.score - a.score)
    default:
      return leads
  }
}

interface KpiSideDrawerProps {
  tile: KpiTile
  leads: Lead[]
  onClose: () => void
}

const KpiSideDrawer = ({ tile, leads, onClose }: KpiSideDrawerProps) => (
  <RecordsDrawer title={tile.label} exportSlug={`kpi-${tile.id}`} leads={describeKpi(tile, leads)} onClose={onClose} />
)

export default KpiSideDrawer
