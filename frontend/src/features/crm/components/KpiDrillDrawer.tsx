import type { LeadEntity, KpiTile } from '@/types/crm.types'
import RecordsDrawer from '@/features/crm/components/RecordsDrawer'

function describeKpi(tile: KpiTile, leads: LeadEntity[]): LeadEntity[] {
  switch (tile.id) {
    case 'pipe':
    case 'open':
    case 'aov':
      return leads.filter((l) => l.status !== 'won' && l.status !== 'lost')
    case 'won':
      return leads.filter((l) => l.status === 'won')
    case 'wr':
      return leads.filter((l) => l.status === 'won' || l.status === 'lost')
    default:
      return leads
  }
}

interface KpiDrillDrawerProps {
  tile: KpiTile
  leads: LeadEntity[]
  onClose: () => void
}

const KpiDrillDrawer = ({ tile, leads, onClose }: KpiDrillDrawerProps) => (
  <RecordsDrawer title={tile.label} exportSlug={`kpi-${tile.id}`} leads={describeKpi(tile, leads)} onClose={onClose} />
)

export default KpiDrillDrawer
