// Payment-domain CSV helpers for the Dietitian Payment screen.
//
// The generic primitives (toCsv / downloadCsv / parseCsvBasic /
// parseCsvQuoted) moved to @/lib/csv/csv because CRM's lead importer needs
// them too — a feature must not import another feature's internals. What
// stays here is payment/date-domain specific and used only by Diet.

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
