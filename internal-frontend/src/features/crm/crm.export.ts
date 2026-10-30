import type { LeadEntity } from '@/types/crm.types'
import { LEAD_STATUS_LABEL } from '@/types/crm.types'
import { roleLabel, contactPersonLabel, divisionLabel, tenantLabel } from '@/features/crm/crm.utils'
import { toast } from '@/components/ui/sonner'
import { toCsv, downloadCsv, type CsvColumn } from '@/utils/csvExport'

// Matches the prototype's crmExportLeads()/QMS_EXPORT.openMaster() behavior:
// export the currently visible/filtered lead set as a single CSV, no
// selection/bulk-checkbox model exists in the source we ported from.

const COLUMNS: CsvColumn<LeadEntity>[] = [
  { header: 'Lead ID', get: (l) => l.id },
  { header: 'Title', get: (l) => l.title },
  { header: 'Company', get: (l) => tenantLabel(l.tenant) },
  { header: 'Division', get: (l) => divisionLabel(l.division) },
  { header: 'Contact', get: (l) => contactPersonLabel(l.contactPerson) },
  { header: 'Sales rep', get: (l) => roleLabel(l.salesPerson) },
  { header: 'Status', get: (l) => LEAD_STATUS_LABEL[l.status] },
  { header: 'Value (INR)', get: (l) => l.estimatedValue },
  { header: 'Confidence', get: (l) => l.confidence },
  { header: 'Created', get: (l) => l.createdAt },
]

export function leadsToCsv(leads: LeadEntity[]): string {
  return toCsv(leads, COLUMNS)
}

export function downloadLeadsCsv(leads: LeadEntity[], filename: string): void {
  downloadCsv(leadsToCsv(leads), filename)
  toast.success(`Exported ${leads.length} lead${leads.length === 1 ? '' : 's'}`)
}
