import { useMemo, useRef, useState } from 'react'
import { FiUpload, FiDownload, FiFileText, FiCheckSquare } from 'react-icons/fi'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import type { ScopedDietitianRollup } from '@/features/diet/dietitians.types'
import { fmtInr } from '@/features/diet/diet.utils'
import { dietKeys } from '@/features/diet/hooks/dietQueryKeys'
import { useDietitianPaymentRollup } from '@/features/diet/hooks/payments/useDietitianPaymentRollup'
import {
  // The ONE sanctioned bypass of the Diet mutation-hook boundary: the CSV
  // import and finance reconciliation below are bulk loops. Routing them
  // through useAddDietPayment() would fire one cache invalidation — and one
  // ledger refetch — per imported row; they invalidate once at the end
  // instead. Every single-payout path uses the hook. When the API lands this
  // becomes one batch endpoint and the exception disappears.
  // eslint-disable-next-line no-restricted-imports
  addDietPayment, paymentsForCamp, loadRollupIndex, campPaymentStatusFrom,
} from '@/features/diet/services/dietitianPayment.service'
import { dietitianExpense } from '@/features/diet/services/dietitianRates.service'
import { dietitianById } from '@/features/diet/services/dietitianRoster.service'
import { toCsv, downloadCsv, parseCsvBasic, parseCsvQuoted } from '@/lib/csv/csv'
import { todayIso } from '@/features/diet/utils/payments/paymentCsv'
import { errorMessage } from '@/features/diet/utils/errorMessage'
import { buildRollupCsvRows, buildLedgerCsvRows, buildPaymentReadyCsvRows } from '@/features/diet/utils/payments/paymentCsvRows'
import { planLedgerImport, planReconciliation, reconciliationGroupToPayment } from '@/features/diet/utils/payments/paymentImport'
import PaymentScopeBanner from '@/features/diet/components/payment/PaymentScopeBanner'
import PaymentKpiStrip from '@/features/diet/components/payment/PaymentKpiStrip'
import PaymentRollupTable from '@/features/diet/components/payment/PaymentRollupTable'
import PaymentLedgerTable from '@/features/diet/components/payment/PaymentLedgerTable'
import ViewCampsModal from '@/features/diet/components/payment/ViewCampsModal'
import AddPaymentModal from '@/features/diet/components/payment/AddPaymentModal'
import RateTrendModal from '@/features/diet/components/payment/RateTrendModal'
import BankEditModal from '@/features/diet/components/payment/BankEditModal'
import ReconciliationReportModal, { type ReconciliationReport } from '@/features/diet/components/payment/ReconciliationReportModal'

const ADMIN_LIKE_LABEL = 'Only OM · Diet, Admin or Accounts'

// Page = orchestration only. Data derivation lives in
// useDietitianPaymentRollup, CSV shaping/parsing in utils/payments/, and the
// rendered blocks in components/payment/. What stays here is UI state
// (search, which modal is open) and the handlers wiring them together.
const DietitianPaymentPage = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // No real backend "diet coordinator"/payment-admin permission concept
  // exists yet (Diet has no backend module at all — see useDietPermissions.ts).
  // Every real login has no `role` field to read (AuthUser no longer carries
  // one), and the old placeholder role checks this fed into were always
  // hardcoded to 'super_admin' regardless of who was logged in anyway — this
  // hardcode preserves that same, actual historical behavior (full,
  // unscoped, admin-like access for everyone) until real backend Diet
  // permissions land.
  const role = 'super_admin'
  const userName = user ? `${user.firstName} ${user.lastName}` : ''

  const { camps, payments, adminLike, isCoordOnly, scopedDietCamps, rows, kpi } =
    useDietitianPaymentRollup({ role, userName })

  const [search, setSearch] = useState('')
  const [viewCampsId, setViewCampsId] = useState<string | null>(null)
  const [addPaymentId, setAddPaymentId] = useState<string | null>(null)
  const [rateTrendId, setRateTrendId] = useState<string | null>(null)
  const [bankEditId, setBankEditId] = useState<string | null>(null)
  const [reconReport, setReconReport] = useState<ReconciliationReport | null>(null)

  const importCsvRef = useRef<HTMLInputElement>(null)
  const reconCsvRef = useRef<HTMLInputElement>(null)

  // ONLY the bulk import/reconciliation loops need this. They write through
  // the service directly (a per-row mutation hook would fire one invalidation
  // and one ledger refetch per imported row) and invalidate ONCE at the end.
  // The single-action modals below own their own invalidation through their
  // mutation hooks — they no longer bump the cache from here.
  const refreshDietCache = () => queryClient.invalidateQueries({ queryKey: dietKeys.all })

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => `${r.dietitianName} ${r.dietitianId} ${r.hq} ${r.states.join(' ')}`.toLowerCase().includes(q))
  }, [rows, search])

  const sortedPayments = useMemo(() => [...payments].sort((a, b) => (b.paidAt || '').localeCompare(a.paidAt || '')), [payments])
  const recentPayments = sortedPayments.slice(0, 25)

  const nameFor = (id: string | null) => (id ? (rows.find((r) => r.dietitianId === id)?.dietitianName ?? id) : '')

  const openAddPayment = (dietitianId: string) => {
    if (!adminLike) {
      toast.error(`${ADMIN_LIKE_LABEL} can record payments`)
      return
    }
    setViewCampsId(null)
    setAddPaymentId(dietitianId)
  }

  // ── Exports ─────────────────────────────────────────────────────────────
  const exportRollup = (r: ScopedDietitianRollup[]) => {
    downloadCsv(`dietitian-payment-rollup-${todayIso()}.csv`, toCsv(buildRollupCsvRows(r)))
  }

  const exportLedger = () => {
    downloadCsv(`dietitian-payment-ledger-${todayIso()}.csv`, toCsv(buildLedgerCsvRows(sortedPayments)))
  }

  const exportPaymentReady = () => {
    // One index for the whole export — the filter and the row build share it.
    const ix = loadRollupIndex()
    const readyCamps = scopedDietCamps
      .filter((c) => c.dietitianId && campPaymentStatusFrom(c, ix) === 'READY')
      .sort((a, b) => (a.dietitianId! + a.date).localeCompare(b.dietitianId! + b.date))
    if (readyCamps.length === 0) {
      toast.info('No payment-ready camps in scope — nothing to export')
      return
    }
    downloadCsv(`dietitian-payment-ready-${todayIso()}.csv`, toCsv(buildPaymentReadyCsvRows(readyCamps, ix)))
  }

  // ── Imports ─────────────────────────────────────────────────────────────
  const handleImportCsv = async (file: File) => {
    const text = await file.text()
    const rowsRaw = parseCsvBasic(text)
    if (rowsRaw.length < 2) { toast.error('CSV has no data rows'); return }

    // A partial import must not report success: stop at the first failure,
    // say how far it got, and still refresh so the rows that DID land show up.
    const toImport = planLedgerImport(rowsRaw)
    let imported = 0
    try {
      for (const payload of toImport) {
        await addDietPayment(payload)
        imported++
      }
      toast.success(`Imported ${imported} payment row(s)`)
    } catch (err) {
      toast.error(`${errorMessage(err, 'Import failed')} · ${imported} of ${toImport.length} row(s) imported.`)
    }
    refreshDietCache()
  }

  const handleReconcileImport = async (file: File) => {
    if (!adminLike) {
      toast.error(`${ADMIN_LIKE_LABEL} can reconcile payments`)
      return
    }
    const text = await file.text()
    const rowsRaw = parseCsvQuoted(text)
    if (rowsRaw.length < 2) { toast.error('CSV has no data rows'); return }

    // Deliberately NOT passing a DietitianRollupIndex snapshot: reconciliation
    // interleaves reads with payment writes, so these lookups are injected as
    // callbacks that read live per row (Phase 1's explicit decision).
    const plan = planReconciliation(
      rowsRaw,
      camps,
      {
        hasExistingPayment: (campId) => paymentsForCamp(campId).length > 0,
        payableFor: (camp) => Math.round(dietitianExpense(camp).total),
        dietitianNameFor: (id) => dietitianById(id)?.name ?? id,
      },
      fmtInr,
    )

    let recorded = 0
    let campsMarkedPaid = 0
    let amountReconciled = 0
    try {
      for (const g of plan.groups) {
        await addDietPayment(reconciliationGroupToPayment(g))
        recorded++
        campsMarkedPaid += g.campIds.length
        amountReconciled += g.amount
      }
    } catch (err) {
      // Report what actually got written rather than the plan's totals — the
      // report below is the operator's record of the run.
      toast.error(`${errorMessage(err, 'Reconciliation failed')} · stopped after ${recorded} of ${plan.groups.length} group(s).`)
    }

    setReconReport({
      totalRows: plan.totalRows,
      recorded,
      campsMarkedPaid,
      amountReconciled,
      alreadyDone: plan.alreadyDone,
      held: plan.held,
      rejected: plan.rejected,
      pendingBlank: plan.pendingBlank,
      discrepancies: plan.discrepancies,
      notFound: plan.notFound,
    })
    refreshDietCache()
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>Operations · Finance</p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Dietitian Payment</h1>
          <p className="text-[12.5px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            Daily payment workbench · base + TA + printing · gated on report completion · ledger of paid-outs.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input ref={importCsvRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportCsv(f); e.target.value = '' }} />
          <Button variant="outline" onClick={() => importCsvRef.current?.click()}><FiUpload size={13} /> Import CSV</Button>
          <Button onClick={() => exportRollup(filteredRows)}><FiDownload size={13} /> Export CSV</Button>
        </div>
      </div>

      <PaymentScopeBanner isCoordOnly={isCoordOnly} />

      <PaymentKpiStrip dietitianCount={rows.length} kpi={kpi} />

      {/* Main table */}
      <div className="rounded-xl border p-3.5 mb-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search dietitian / HQ / state…" className="w-64" />
            <span className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>{filteredRows.length} of {rows.length} dietitians</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => exportRollup(filteredRows)}><FiDownload size={12} /> Export rollup</Button>
            <Button size="sm" onClick={exportPaymentReady}><FiFileText size={12} /> Export payment-ready</Button>
            {adminLike && (
              <>
                <input ref={reconCsvRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReconcileImport(f); e.target.value = '' }} />
                <Button size="sm" variant="outline" onClick={() => reconCsvRef.current?.click()}><FiCheckSquare size={12} /> Import finance reconciliation</Button>
              </>
            )}
          </div>
        </div>

        <PaymentRollupTable
          rows={filteredRows}
          adminLike={adminLike}
          onViewCamps={setViewCampsId}
          onRateTrend={setRateTrendId}
          onAddPayment={openAddPayment}
          onEditBank={setBankEditId}
        />
      </div>

      <PaymentLedgerTable
        payments={sortedPayments}
        recentPayments={recentPayments}
        onExport={exportLedger}
      />

      {/* Modals */}
      <ViewCampsModal
        dietitianId={viewCampsId}
        dietitianName={nameFor(viewCampsId)}
        camps={camps}
        adminLike={adminLike}
        onClose={() => setViewCampsId(null)}
        onAddPayment={openAddPayment}
      />
      <AddPaymentModal
        dietitianId={addPaymentId}
        dietitianName={nameFor(addPaymentId)}
        camps={camps}
        paidBy={userName || 'Unknown'}
        onClose={() => setAddPaymentId(null)}
        onSaved={() => setAddPaymentId(null)}
      />
      <RateTrendModal
        dietitianId={rateTrendId}
        dietitianName={nameFor(rateTrendId)}
        onClose={() => setRateTrendId(null)}
      />
      <BankEditModal
        dietitianId={bankEditId}
        dietitianName={nameFor(bankEditId)}
        onClose={() => setBankEditId(null)}
        onSaved={() => setBankEditId(null)}
      />
      <ReconciliationReportModal
        report={reconReport}
        onClose={() => setReconReport(null)}
      />
    </div>
  )
}

export default DietitianPaymentPage
