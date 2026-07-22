import type { LeadEntity } from '@/types/crm.types'
import { LEAD_STATUS_LABEL } from '@/types/crm.types'
import { roleLabel, divisionLabel, tenantLabel } from '@/features/crm/crm.utils'
import { toast } from '@/components/ui/sonner'

// Matches the prototype's crmExportLeads()/QMS_EXPORT.openMaster() behavior:
// export the currently visible/filtered lead set as a single CSV, no
// selection/bulk-checkbox model exists in the source we ported from.

const COLUMNS: { header: string; get: (lead: LeadEntity) => string | number }[] = [
  { header: 'Lead ID', get: (l) => l.id },
  { header: 'Title', get: (l) => l.title },
  { header: 'Company', get: (l) => tenantLabel(l.tenant) },
  { header: 'Division', get: (l) => divisionLabel(l.division) },
  { header: 'Contact', get: (l) => roleLabel(l.contactPerson) },
  { header: 'Sales rep', get: (l) => roleLabel(l.salesPerson) },
  { header: 'Status', get: (l) => LEAD_STATUS_LABEL[l.status] },
  { header: 'Value (INR)', get: (l) => l.estimatedValue },
  { header: 'Confidence', get: (l) => l.confidence },
  { header: 'Created', get: (l) => l.createdAt },
]

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '')
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function leadsToCsv(leads: LeadEntity[]): string {
  const header = COLUMNS.map((c) => escapeCsvCell(c.header)).join(',')
  const rows = leads.map((lead) => COLUMNS.map((c) => escapeCsvCell(c.get(lead))).join(','))
  return [header, ...rows].join('\n')
}

export function downloadLeadsCsv(leads: LeadEntity[], filename: string): void {
  const csv = leadsToCsv(leads)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toast.success(`Exported ${leads.length} lead${leads.length === 1 ? '' : 's'}`)
}
