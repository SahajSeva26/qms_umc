import { useRef, useState } from 'react'
import { FiUpload, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'
import type { CreateLeadPayload } from '@/types/crm.types'
import { crmService } from '@/features/crm/crm.service'
import { resolveRowNames, type ResolveError } from '@/features/crm/crm.importResolver'
import { parseCsvQuoted } from '@/features/diet/components/payment/paymentCsv'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'

// Bulk CSV Import — the counterpart to crm.export.ts's downloadLeadsCsv, but
// NOT a literal round-trip of that exact file: Export writes display names
// (Company/Division/Contact/Sales rep), while creating a real Lead needs
// ObjectIds for tenant/division/contactPerson/salesPerson. This dialog parses
// a name-based CSV, resolves every row's names to real IDs via each
// resource's own existing search endpoint (crm.importResolver.ts — no
// backend changes needed, those endpoints already support server-side name
// filtering), shows a preview of what will/won't import, and only sends
// POST /leads for rows that fully resolve. Matches the product decisions:
// preview-before-commit, reject (not fuzzy-match) unresolved names, and
// partial success — the valid rows import even if some rows fail.

const REQUIRED_HEADERS = ['Title', 'Company', 'Division', 'Contact', 'Sales rep', 'Problem statement', 'Number of MRs'] as const

interface ParsedRow {
  rowNumber: number
  title: string
  company: string
  division: string
  contact: string
  salesRep: string
  problemStatement: string
  numberOfMRS: number
  estimatedValue?: number
  confidence?: number
}

type RowState =
  | { status: 'resolving'; row: ParsedRow }
  | { status: 'ready'; row: ParsedRow; payload: CreateLeadPayload; resolvedLabel: string }
  | { status: 'error'; row: ParsedRow; errors: ResolveError[] }
  | { status: 'created'; row: ParsedRow; leadId: string }
  | { status: 'failed'; row: ParsedRow; message: string }

interface ImportLeadsDialogProps {
  onClose: () => void
  onImported: () => void
}

function parseFile(text: string): { rows: ParsedRow[]; parseErrors: string[] } {
  const table = parseCsvQuoted(text)
  const parseErrors: string[] = []
  if (table.length === 0) return { rows: [], parseErrors: ['File is empty.'] }

  const header = table[0].map((h) => h.trim())
  const missing = REQUIRED_HEADERS.filter((h) => !header.includes(h))
  if (missing.length > 0) {
    return { rows: [], parseErrors: [`Missing required column${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}.`] }
  }

  const idx = (name: string) => header.indexOf(name)
  const rows: ParsedRow[] = []
  for (let i = 1; i < table.length; i++) {
    const cells = table[i]
    if (cells.every((c) => !c.trim())) continue // skip blank lines
    const rowNumber = i + 1 // 1-indexed, matching the file's own line numbers (header = line 1)
    const numberOfMRSRaw = cells[idx('Number of MRs')]?.trim()
    const numberOfMRS = Number(numberOfMRSRaw)
    if (!numberOfMRSRaw || Number.isNaN(numberOfMRS)) {
      parseErrors.push(`Row ${rowNumber}: "Number of MRs" must be a number, got "${numberOfMRSRaw ?? ''}".`)
      continue
    }
    const estimatedValueRaw = cells[idx('Estimated value')]?.trim()
    const confidenceRaw = cells[idx('Confidence')]?.trim()
    rows.push({
      rowNumber,
      title: cells[idx('Title')]?.trim() ?? '',
      company: cells[idx('Company')]?.trim() ?? '',
      division: cells[idx('Division')]?.trim() ?? '',
      contact: cells[idx('Contact')]?.trim() ?? '',
      salesRep: cells[idx('Sales rep')]?.trim() ?? '',
      problemStatement: cells[idx('Problem statement')]?.trim() ?? '',
      numberOfMRS,
      estimatedValue: estimatedValueRaw ? Number(estimatedValueRaw) : undefined,
      confidence: confidenceRaw ? Number(confidenceRaw) : undefined,
    })
  }
  return { rows, parseErrors }
}

const ImportLeadsDialog = ({ onClose, onImported }: ImportLeadsDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [rowStates, setRowStates] = useState<RowState[]>([])
  const [phase, setPhase] = useState<'pick' | 'resolving' | 'preview' | 'importing' | 'done'>('pick')

  const resetToPick = () => {
    setFileName(null)
    setFileErrors([])
    setRowStates([])
    setPhase('pick')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFile = async (file: File) => {
    setFileName(file.name)
    const text = await file.text()
    const { rows, parseErrors } = parseFile(text)
    setFileErrors(parseErrors)
    if (rows.length === 0) {
      setRowStates([])
      setPhase('preview')
      return
    }

    setPhase('resolving')
    setRowStates(rows.map((row) => ({ status: 'resolving', row })))

    // Resolve rows sequentially, not in parallel — each row fires up to 4
    // search requests, and running dozens of rows concurrently would be a
    // real burst-load spike against the same search endpoints the rest of
    // the app's pickers use. Sequential is slower but safe, and this is an
    // occasional bulk-admin action, not a hot path.
    const results: RowState[] = []
    for (const row of rows) {
      try {
        const { resolved, errors } = await resolveRowNames({
          company: row.company,
          division: row.division,
          contact: row.contact,
          salesRep: row.salesRep,
        })
        if (!resolved) {
          results.push({ status: 'error', row, errors })
        } else {
          const payload: CreateLeadPayload = {
            tenant: resolved.tenantId,
            division: resolved.divisionId,
            contactPerson: resolved.contactPersonId,
            salesPerson: resolved.salesPersonId,
            title: row.title,
            problemStatement: row.problemStatement,
            numberOfMRS: row.numberOfMRS,
            estimatedValue: row.estimatedValue,
            confidence: row.confidence,
          }
          results.push({
            status: 'ready',
            row,
            payload,
            resolvedLabel: `${resolved.tenantName} · ${resolved.divisionName} · ${resolved.contactPersonName} → ${resolved.salesPersonName}`,
          })
        }
      } catch {
        results.push({ status: 'error', row, errors: [{ field: 'Row', message: 'Lookup failed — try again.' }] })
      }
      setRowStates([...results, ...rows.slice(results.length).map((r) => ({ status: 'resolving' as const, row: r }))])
    }
    setPhase('preview')
  }

  const readyCount = rowStates.filter((r) => r.status === 'ready').length
  const errorCount = rowStates.filter((r) => r.status === 'error').length

  const handleConfirmImport = async () => {
    setPhase('importing')
    const next = [...rowStates]
    for (let i = 0; i < next.length; i++) {
      const state = next[i]
      if (state.status !== 'ready') continue
      try {
        const res = await crmService.createLead(state.payload)
        next[i] = { status: 'created', row: state.row, leadId: res.data?.id ?? '' }
      } catch (err: any) {
        next[i] = { status: 'failed', row: state.row, message: err?.response?.data?.message || 'Create failed.' }
      }
      setRowStates([...next])
    }
    setPhase('done')
    const created = next.filter((r) => r.status === 'created').length
    if (created > 0) {
      toast.success(`Imported ${created} lead${created === 1 ? '' : 's'}`)
      onImported()
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="max-h-[85vh] overflow-hidden flex flex-col"
        style={{ width: 'min(720px, 92vw)', maxWidth: 'min(720px, 92vw)' }}
      >
        <DialogHeader>
          <DialogTitle>Import leads from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns: Title, Company, Division, Contact, Sales rep, Problem statement, Number of MRs
            (optional: Estimated value, Confidence). Names must exactly match existing tenants/divisions/roles.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-2">
          {phase === 'pick' && (
            <div
              className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
              style={{ borderColor: 'var(--qms-border)' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <FiUpload size={24} className="mx-auto mb-2" style={{ color: 'var(--qms-text-muted)' }} />
              <p className="text-[13px] font-semibold" style={{ color: 'var(--qms-text)' }}>Click to choose a CSV file</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
            </div>
          )}

          {fileName && phase !== 'pick' && (
            <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>File: {fileName}</p>
          )}

          {fileErrors.length > 0 && (
            <div className="text-[12px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger space-y-0.5">
              {fileErrors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}

          {phase === 'resolving' && (
            <p className="text-[13px] text-center py-4" style={{ color: 'var(--qms-text-muted)' }}>
              Resolving {rowStates.filter((r) => r.status !== 'resolving').length} / {rowStates.length} rows…
            </p>
          )}

          {(phase === 'preview' || phase === 'importing' || phase === 'done') && rowStates.length > 0 && (
            <>
              <div className="flex items-center gap-3 text-[12px] font-semibold">
                <span style={{ color: 'var(--success)' }}>{readyCount} ready</span>
                {errorCount > 0 && <span className="text-danger">{errorCount} will be skipped</span>}
              </div>
              <div className="space-y-2">
                {rowStates.map((state, i) => (
                  <div key={i} className="rounded-lg p-2.5 text-[12px]" style={{ background: 'var(--qms-surface-strong)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>
                        Row {state.row.rowNumber} · {state.row.title || '(no title)'}
                      </span>
                      {state.status === 'ready' && <FiCheckCircle style={{ color: 'var(--success)' }} />}
                      {(state.status === 'error' || state.status === 'failed') && <FiAlertTriangle className="text-danger" />}
                      {state.status === 'created' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success-soft text-success">Created</span>}
                    </div>
                    {state.status === 'ready' && (
                      <div className="mt-1" style={{ color: 'var(--qms-text-muted)' }}>{state.resolvedLabel}</div>
                    )}
                    {state.status === 'error' && (
                      <div className="mt-1 text-danger space-y-0.5">
                        {state.errors.map((e, j) => <div key={j}>{e.field}: {e.message}</div>)}
                      </div>
                    )}
                    {state.status === 'failed' && (
                      <div className="mt-1 text-danger">{state.message}</div>
                    )}
                    {state.status === 'created' && (
                      <div className="mt-1" style={{ color: 'var(--qms-text-muted)' }}>Lead ID: {state.leadId}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {phase === 'preview' && (
            <>
              <Button variant="secondary" onClick={resetToPick}>Choose a different file</Button>
              <Button onClick={handleConfirmImport} disabled={readyCount === 0} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
                Import {readyCount} lead{readyCount === 1 ? '' : 's'}
              </Button>
            </>
          )}
          {phase === 'done' && (
            <Button onClick={onClose}>Close</Button>
          )}
          {(phase === 'pick' || phase === 'resolving' || phase === 'importing') && (
            <Button variant="secondary" onClick={onClose} disabled={phase === 'importing'}>Cancel</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImportLeadsDialog
