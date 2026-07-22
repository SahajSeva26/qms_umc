// CSV helpers for the Dietitian Payment screen — plain-CSV only (no XLSX/
// SheetJS dependency in this project; the prototype's own CSV-fallback path
// is what we implement, applied unconditionally for both import and export).

// toCsv() — header from Object.keys(rows[0]) so callers control exact column
// order by building objects with keys already in the declared order. Quotes/
// escapes values containing a comma, quote, or newline.
export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v)
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.join(',')]
  rows.forEach((r) => {
    lines.push(headers.map((h) => escape(r[h])).join(','))
  })
  return lines.join('\r\n')
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function slugify(s: string): string {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Basic (non-quote-aware) CSV line splitter — used by §4's plain importCsv
// path, matching the prototype's own simple importer exactly.
export function parseCsvBasic(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map((l) => l.split(','))
}

// Quote-aware CSV parser — used by the finance-reconciliation importer only
// (§6), which needs to survive embedded commas via "..." with doubled ""
// escaping.
export function parseCsvQuoted(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
  for (const line of lines) {
    const cells: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++ }
          else inQuotes = false
        } else {
          cur += ch
        }
      } else {
        if (ch === '"') inQuotes = true
        else if (ch === ',') { cells.push(cur); cur = '' }
        else cur += ch
      }
    }
    cells.push(cur)
    rows.push(cells)
  }
  return rows
}

// normDate() — accepts dd/mm/yyyy or dd-mm-yyyy (2 or 4 digit year, 2-digit
// expands to 20xx), or any Date()-parseable string, else falls back to today.
export function normDate(s: string | undefined | null): string {
  const raw = String(s || '').trim()
  if (!raw) return todayIso()
  const m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (m) {
    const dd = m[1].padStart(2, '0')
    const mm = m[2].padStart(2, '0')
    let yyyy = m[3]
    if (yyyy.length === 2) yyyy = `20${yyyy}`
    return `${yyyy}-${mm}-${dd}`
  }
  const parsed = new Date(raw)
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return todayIso()
}

// normPayStatus() — normalizes a finance file's free-text payment-status
// column into one of PAID / HOLD / REJECTED / '' (unrecognized).
export function normPayStatus(s: string | undefined | null): 'PAID' | 'HOLD' | 'REJECTED' | '' {
  const v = String(s || '').toUpperCase().trim()
  if (/^(PAID|PAY|DONE|YES|Y|SETTLED|COMPLETE|COMPLETED|SUCCESS)/.test(v)) return 'PAID'
  if (/^(HOLD|ON HOLD|PENDING|HELD|WAIT)/.test(v)) return 'HOLD'
  if (/^(REJECT|REJECTED|FAIL|FAILED|RETURN|RETURNED|DECLINE|CANCEL)/.test(v)) return 'REJECTED'
  return ''
}
