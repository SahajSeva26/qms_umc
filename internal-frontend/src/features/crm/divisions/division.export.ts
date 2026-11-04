import type { DivisionEntity } from '@/types/crm.types'
import { DIVISION_THERAPY_LABEL } from '@/types/crm.types'
import { toCsv, downloadCsv, type CsvColumn } from '@/utils/csvExport'
import { toast } from '@/components/ui/sonner'

function ownerName(owner: DivisionEntity['owner']): string {
  if (!owner || typeof owner === 'string' || !owner.user) return '—'
  return [owner.user.firstName, owner.user.lastName].filter(Boolean).join(' ')
}

function tenantName(tenant: DivisionEntity['tenant']): string {
  return typeof tenant === 'string' ? '—' : tenant.name
}

const COLUMNS: CsvColumn<DivisionEntity>[] = [
  { header: 'Code', get: (d) => d.code },
  { header: 'Name', get: (d) => d.name },
  { header: 'Therapy', get: (d) => d.therapy.map((t) => DIVISION_THERAPY_LABEL[t]).join('; ') },
  { header: 'Company', get: (d) => tenantName(d.tenant) },
  { header: 'Head', get: (d) => ownerName(d.owner) },
  { header: 'Status', get: (d) => d.status ?? '—' },
  { header: 'MR count', get: (d) => d.mrCount },
  { header: 'Created', get: (d) => d.createdAt },
]

export function divisionsToCsv(divisions: DivisionEntity[]): string {
  return toCsv(divisions, COLUMNS)
}

export function downloadDivisionsCsv(divisions: DivisionEntity[], filename: string): void {
  downloadCsv(divisionsToCsv(divisions), filename)
  toast.success(`Exported ${divisions.length} division${divisions.length === 1 ? '' : 's'}`)
}
