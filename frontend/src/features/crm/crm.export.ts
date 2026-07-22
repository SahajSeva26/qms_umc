import type { Lead } from '@/types/lead.types'
import { STAGES, LOST_STAGE } from '@/features/crm/crm.mock'
import { toast } from '@/components/ui/sonner'

// Matches the prototype's crmExportLeads()/QMS_EXPORT.openMaster() behavior:
// export the currently visible/filtered lead set as a single CSV, no
// selection/bulk-checkbox model exists in the source we ported from.

const COLUMNS: { header: string; get: (lead: Lead) => string | number }[] = [
  { header: 'Lead ID', get: (l) => l.id },
  { header: 'Account', get: (l) => l.account },
  { header: 'Contact', get: (l) => l.contact },
  { header: 'Contact Role', get: (l) => l.contactRole },
  { header: 'Email', get: (l) => l.email },
  { header: 'Phone', get: (l) => l.phone },
  { header: 'Division', get: (l) => l.division },
  { header: 'Therapy', get: (l) => l.therapy },
  { header: 'Geography', get: (l) => l.geography },
  { header: 'Stage', get: (l) => (l.stage === 'lost' ? LOST_STAGE : STAGES.find((s) => s.id === l.stage))?.name ?? l.stage },
  { header: 'Value (INR)', get: (l) => l.value },
  { header: 'AI Score', get: (l) => l.score },
  { header: 'Owner', get: (l) => l.owner },
  { header: 'Age (days)', get: (l) => l.age },
  { header: 'Next Action', get: (l) => l.nextAction },
  { header: 'Next Due', get: (l) => l.nextDue },
  { header: 'Source', get: (l) => l.source },
  { header: 'Created', get: (l) => l.created },
]

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '')
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function leadsToCsv(leads: Lead[]): string {
  const header = COLUMNS.map((c) => escapeCsvCell(c.header)).join(',')
  const rows = leads.map((lead) => COLUMNS.map((c) => escapeCsvCell(c.get(lead))).join(','))
  return [header, ...rows].join('\n')
}

export function downloadLeadsCsv(leads: Lead[], filename: string): void {
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
