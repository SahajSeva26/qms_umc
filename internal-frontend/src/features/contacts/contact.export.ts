import type { ContactEntity } from '@/types/contact.types'
import { toCsv, downloadCsv, type CsvColumn } from '@/utils/csvExport'
import { toast } from '@/components/ui/sonner'

function divisionName(division: ContactEntity['division']): string {
  if (!division || typeof division === 'string') return '—'
  return division.name
}

const COLUMNS: CsvColumn<ContactEntity>[] = [
  { header: 'Name', get: (c) => c.name },
  { header: 'Designation', get: (c) => c.designation ?? '' },
  { header: 'Email', get: (c) => c.email ?? '' },
  { header: 'Phone', get: (c) => c.phone ?? '' },
  { header: 'Location', get: (c) => c.location ?? '' },
  { header: 'Division', get: (c) => divisionName(c.division) },
  { header: 'Type', get: (c) => c.type },
  { header: 'Status', get: (c) => c.status },
  { header: 'Has login', get: (c) => (c.hasLogin ? 'Yes' : 'No') },
  { header: 'Created', get: (c) => c.createdAt },
]

export function contactsToCsv(contacts: ContactEntity[]): string {
  return toCsv(contacts, COLUMNS)
}

export function downloadContactsCsv(contacts: ContactEntity[], filename: string): void {
  downloadCsv(contactsToCsv(contacts), filename)
  toast.success(`Exported ${contacts.length} contact${contacts.length === 1 ? '' : 's'}`)
}
