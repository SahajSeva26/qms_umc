// Generic CSV primitives — serialisation, download and the two parsers.
//
// These are genuinely cross-feature infrastructure: Diet's payment
// import/export and CRM's lead importer both use them. They previously lived
// inside features/diet, which meant CRM imported from another feature's
// internals; that dependency is what this module removes.
//
// Domain-specific helpers (payment-status normalisation, Indian date
// normalisation) deliberately stay in their owning feature.

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

// Basic (non-quote-aware) CSV line splitter.
export function parseCsvBasic(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map((l) => l.split(','))
}

// Quote-aware CSV parser — survives embedded commas via "..." with doubled ""
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
