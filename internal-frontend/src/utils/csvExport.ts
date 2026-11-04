// Shared CSV-building/download primitives — extracted from crm.export.ts so
// Division/Contact export can reuse the same escaping and download behavior.

import { toast } from '@/components/ui/sonner'

export interface CsvColumn<T> {
  header: string
  get: (row: T) => string | number
}

// A leading =/+/-/@ is executed as a formula by Excel/Sheets on open — prefix
// with a quote to force plain-text, same mitigation OWASP recommends for CSV injection.
function escapeCsvCell(value: string | number): string {
  const raw = String(value ?? '')
  const str = /^[=+\-@]/.test(raw) ? `'${raw}` : raw
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvCell(c.header)).join(',')
  const body = rows.map((row) => columns.map((c) => escapeCsvCell(c.get(row))).join(','))
  return [header, ...body].join('\n')
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Every "export the full set" call site fetches with a hardcoded high limit
// rather than a true unbounded read — silently truncates past that limit with
// no signal to the user otherwise. Call this right before downloading so a
// truncated export is visible to the user, not just a quietly-incomplete file.
export function warnIfExportTruncated(fetchedCount: number, realTotal: number): void {
  if (fetchedCount < realTotal) {
    toast.warning(`Export includes only ${fetchedCount} of ${realTotal} rows — the full set exceeds this export's limit.`)
  }
}
