import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FiUpload, FiDownload, FiFilter, FiGlobe, FiFileText, FiFileMinus, FiList, FiTrendingUp,
  FiDollarSign, FiEdit2, FiCheckSquare,
} from 'react-icons/fi'
import { useAuth } from '@/hooks/useAuth'
import { useCampsData } from '@/hooks/useCampsData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import KpiTile from '@/components/ui/KpiTile'
import { toast } from '@/components/ui/sonner'
import type { Camp } from '@/types/camp.types'
import type { DietPayment } from '@/features/diet/dietitians.types'
import {
  dietitianById, isPaymentAdminLike, resolveCoordinatorId, isCoordCamp,
  dietitianExpense, campPaymentStatus, paymentsForCamp, paymentsByDietitian,
  bankComplete, bankAccountsFor, dietitianDetails, getPayments, addDietPayment, fmtInr,
} from '@/features/diet/dietitians.service'
import type { ScopedDietitianRollup } from '@/features/diet/components/payment/payment.types'
import { toCsv, downloadCsv, todayIso, parseCsvBasic, parseCsvQuoted, normDate, normPayStatus } from '@/features/diet/components/payment/paymentCsv'
import ViewCampsModal from '@/features/diet/components/payment/ViewCampsModal'
import AddPaymentModal from '@/features/diet/components/payment/AddPaymentModal'
import RateTrendModal from '@/features/diet/components/payment/RateTrendModal'
import BankEditModal from '@/features/diet/components/payment/BankEditModal'
import ReconciliationReportModal, { type ReconciliationReport } from '@/features/diet/components/payment/ReconciliationReportModal'

const ADMIN_LIKE_LABEL = 'Only OM · Diet, Admin or Accounts'

const DietitianPaymentPage = () => {
  const { user } = useAuth()
  const { camps } = useCampsData()

  const [search, setSearch] = useState('')
  const [payments, setPayments] = useState<DietPayment[]>([])
  const [refreshTick, setRefreshTick] = useState(0)

  const [viewCampsId, setViewCampsId] = useState<string | null>(null)
  const [addPaymentId, setAddPaymentId] = useState<string | null>(null)
  const [rateTrendId, setRateTrendId] = useState<string | null>(null)
  const [bankEditId, setBankEditId] = useState<string | null>(null)
  const [reconReport, setReconReport] = useState<ReconciliationReport | null>(null)

  const importCsvRef = useRef<HTMLInputElement>(null)
  const reconCsvRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getPayments().then(setPayments)
  }, [refreshTick])

  const refetch = () => setRefreshTick((t) => t + 1)

  const role = user?.role ?? ''
  const userName = user ? `${user.firstName} ${user.lastName}` : ''
  const adminLike = isPaymentAdminLike(role)
  const coordId = !adminLike ? resolveCoordinatorId(userName) : null
  const isCoordOnly = (role === 'diet_camp_coord' || role === 'camp_coord') && !adminLike

  // ── Scoping ─────────────────────────────────────────────────────────────
  const scopedDietCamps = useMemo((): Camp[] => {
    const dietCamps = camps.filter((c) => c.type === 'Diet' && !/CANCEL/i.test(c.status))
    if (adminLike) return dietCamps
    if (isCoordOnly) {
      if (!coordId) return dietCamps // fail-open
      return dietCamps.filter((c) => isCoordCamp(c, coordId))
    }
    return dietCamps
  }, [camps, adminLike, isCoordOnly, coordId])

  const scopeCampIds = useMemo(() => new Set(scopedDietCamps.map((c) => c.id)), [scopedDietCamps])

  const dietitiansInScope = useMemo(() => {
    const ids = Array.from(new Set(scopedDietCamps.map((c) => c.dietitianId).filter((id): id is string => !!id)))
    return ids.map((id) => dietitianById(id) ?? { id, name: id, real: false, phone: '', email: '', hq: '', states: [], ratePerCamp: 0, status: 'ENROLLED' as const, detailsComplete: false, appliedOn: '' })
  }, [scopedDietCamps])

  // ── Per-dietitian rollup (screen-specific — NOT the shared unscoped one) ──
  const rows = useMemo((): ScopedDietitianRollup[] => {
    const list: ScopedDietitianRollup[] = dietitiansInScope.map((d) => {
      const myCamps = camps.filter((c) => c.type === 'Diet' && c.dietitianId === d.id && scopeCampIds.has(c.id) && !/CANCEL/i.test(c.status))
      let ready = 0, paid = 0, pendingReports = 0, eligibleAmount = 0, upcomingAmount = 0
      myCamps.forEach((c) => {
        const e = dietitianExpense(c)
        const st = campPaymentStatus(c)
        if (st === 'READY') { eligibleAmount += e.total; ready++ }
        if (st === 'PAID') paid++
        if (st === 'PENDING') { upcomingAmount += e.total; pendingReports++ }
      })
      const paidAmount = paymentsByDietitian(d.id).reduce((s, p) => s + Number(p.amount || 0), 0)
      const det = dietitianDetails(d.id)
      return {
        dietitianId: d.id,
        dietitianName: d.name,
        hq: d.hq,
        states: d.states,
        totalCamps: myCamps.length,
        readyCamps: ready,
        paidCamps: paid,
        pendingReports,
        eligibleAmount,
        upcomingAmount,
        paidAmount,
        toBePaid: Math.max(0, eligibleAmount),
        bankComplete: bankComplete(d.id),
        printingCharge: det.printingChargePerCamp ?? 150,
      }
    })
    return list.sort((a, b) => b.toBePaid - a.toBePaid)
    // payments/refreshTick as deps so the rollup recomputes after a new payment is recorded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dietitiansInScope, camps, scopeCampIds, payments])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => `${r.dietitianName} ${r.dietitianId} ${r.hq} ${r.states.join(' ')}`.toLowerCase().includes(q))
  }, [rows, search])

  // ── KPIs ────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const reportsPending = rows.reduce((s, r) => s + r.pendingReports, 0)
    const released = rows.reduce((s, r) => s + r.paidAmount, 0)
    const ready = rows.reduce((s, r) => s + r.toBePaid, 0)
    const upcoming = rows.reduce((s, r) => s + r.upcomingAmount, 0)
    const missingBank = rows.filter((r) => !r.bankComplete).length
    return { reportsPending, released, ready, upcoming, missingBank }
  }, [rows])

  // ── Row/modal helpers ─────────────────────────────────────────────────
  const rowById = (id: string) => rows.find((r) => r.dietitianId === id)
  const nameFor = (id: string | null) => (id ? (rowById(id)?.dietitianName ?? id) : '')

  const openAddPayment = (dietitianId: string) => {
    if (!adminLike) {
      toast.error(`${ADMIN_LIKE_LABEL} can record payments`)
      return
    }
    setViewCampsId(null)
    setAddPaymentId(dietitianId)
  }

  // ── §5 Exports ──────────────────────────────────────────────────────────
  const exportRollup = (r: ScopedDietitianRollup[]) => {
    const data = r.map((row) => ({
      Dietitian: row.dietitianName,
      Dietitian_ID: row.dietitianId,
      HQ: row.hq,
      States: row.states.join(', '),
      Total_Camps: row.totalCamps,
      Ready_Camps: row.readyCamps,
      Paid_Camps: row.paidCamps,
      Reports_Pending: row.pendingReports,
      Ready_For_Payment_INR: row.toBePaid,
      Upcoming_INR: row.upcomingAmount,
      Already_Paid_INR: row.paidAmount,
      Bank_Complete: row.bankComplete ? 'YES' : 'NO',
      Printing_Charge_INR: row.printingCharge,
    }))
    downloadCsv(`dietitian-payment-rollup-${todayIso()}.csv`, toCsv(data))
  }

  const exportLedger = (list: DietPayment[]) => {
    const data = list.map((p) => ({
      Payment_ID: p.id,
      Date: p.paidOn,
      Dietitian: p.dietitianName,
      Dietitian_ID: p.dietitianId,
      Amount_INR: p.amount,
      Mode: p.mode,
      Reference: p.ref,
      Camps: p.campIds.join('|'),
      By: p.paidBy,
      Notes: p.notes,
    }))
    downloadCsv(`dietitian-payment-ledger-${todayIso()}.csv`, toCsv(data))
  }

  const exportPaymentReady = () => {
    const readyCamps = scopedDietCamps
      .filter((c) => c.dietitianId && campPaymentStatus(c) === 'READY')
      .sort((a, b) => (a.dietitianId! + a.date).localeCompare(b.dietitianId! + b.date))
    if (readyCamps.length === 0) {
      toast.info('No payment-ready camps in scope — nothing to export')
      return
    }
    const data = readyCamps.map((c) => {
      const e = dietitianExpense(c)
      const d = dietitianById(c.dietitianId!)
      // dietBank() picks the first account that actually has an accountNumber,
      // not just array index 0 — dietitian-payment.js:797.
      const accts = bankAccountsFor(c.dietitianId!)
      const acct = accts.find((a) => a.accountNumber) ?? accts[0]
      return {
        Camp_ID: c.id,
        Dietitian: d?.name ?? c.dietitianId,
        Dietitian_ID: c.dietitianId,
        Project_ID: c.projectId ?? '',
        City: c.city,
        Camp_Date: c.date,
        Base_INR: e.base,
        TA_INR: e.ta,
        Printing_INR: e.printing,
        Payable_INR: e.total,
        Bank_Account: acct?.accountNumber ?? '',
        Bank_IFSC: acct?.ifsc ?? '',
        Bank_Status: bankComplete(c.dietitianId!) ? 'COMPLETE' : 'MISSING',
        Payment_Status: '',
        Paid_Amount_INR: '',
        Payment_Date: '',
        Payment_Mode: '',
        UTR_Reference: '',
        Finance_Remarks: '',
      }
    })
    downloadCsv(`dietitian-payment-ready-${todayIso()}.csv`, toCsv(data))
  }

  // ── §4 CSV import (loose ledger import) ──────────────────────────────────
  const handleImportCsv = async (file: File) => {
    const text = await file.text()
    const rowsRaw = parseCsvBasic(text)
    if (rowsRaw.length < 2) { toast.error('CSV has no data rows'); return }
    const header = rowsRaw[0].map((h) => h.trim())
    const idx = (...names: string[]) => {
      for (const n of names) {
        const i = header.findIndex((h) => h.toLowerCase() === n.toLowerCase())
        if (i >= 0) return i
      }
      return -1
    }
    const iDietId = idx('Dietitian_ID', 'dietitianId')
    const iAmount = idx('Amount_INR', 'amount')
    const iDietName = idx('Dietitian', 'dietitianName')
    const iDate = idx('Date', 'paidOn')
    const iMode = idx('Mode', 'mode')
    const iRef = idx('Reference', 'ref')
    const iCamps = idx('Camps', 'campIds')
    const iBy = idx('By', 'paidBy')
    const iNotes = idx('Notes', 'notes')

    let imported = 0
    for (let r = 1; r < rowsRaw.length; r++) {
      const cells = rowsRaw[r]
      const dietitianId = iDietId >= 0 ? cells[iDietId]?.trim() : ''
      if (!dietitianId) continue
      const amount = iAmount >= 0 ? Number(cells[iAmount]) : 0
      if (!amount) continue
      const dietitianName = (iDietName >= 0 && cells[iDietName]?.trim()) || dietitianId
      const paidOn = (iDate >= 0 && cells[iDate]?.trim()) || todayIso()
      const mode = ((iMode >= 0 && cells[iMode]?.trim()) || 'BANK').toUpperCase() as DietPayment['mode']
      const ref = (iRef >= 0 && cells[iRef]?.trim()) || ''
      const campIds = iCamps >= 0 ? (cells[iCamps] || '').split(/[|,]/).map((s) => s.trim()).filter(Boolean) : []
      const paidBy = (iBy >= 0 && cells[iBy]?.trim()) || 'CSV import'
      const notes = (iNotes >= 0 && cells[iNotes]?.trim()) || ''
      await addDietPayment({ dietitianId, dietitianName, amount, campIds, paidOn, mode, ref, notes, paidBy })
      imported++
    }
    toast.success(`Imported ${imported} payment row(s)`)
    refetch()
  }

  // ── §6 Finance reconciliation import ─────────────────────────────────────
  const handleReconcileImport = async (file: File) => {
    if (!adminLike) {
      toast.error(`${ADMIN_LIKE_LABEL} can reconcile payments`)
      return
    }
    const text = await file.text()
    const rowsRaw = parseCsvQuoted(text)
    if (rowsRaw.length < 2) { toast.error('CSV has no data rows'); return }
    const header = rowsRaw[0].map((h) => h.trim())
    const idx = (...names: string[]) => {
      for (const n of names) {
        const i = header.findIndex((h) => h.toLowerCase() === n.toLowerCase())
        if (i >= 0) return i
      }
      return -1
    }
    const iCampId = idx('Camp_ID', 'campId')
    const iDietitianId = idx('Dietitian_ID', 'dietitianId')
    const iStatus = idx('Payment_Status', 'status')
    const iPaidAmt = idx('Paid_Amount_INR', 'paidAmount')
    const iPaidDate = idx('Payment_Date', 'paidOn')
    const iMode = idx('Payment_Mode', 'mode')
    const iRef = idx('UTR_Reference', 'utr', 'Reference', 'ref')
    const iRemarks = idx('Finance_Remarks', 'remarks')

    let held = 0, rejected = 0, pendingBlank = 0, alreadyDone = 0
    const notFound: string[] = []
    const discrepancies: string[] = []

    type Group = { dietitianId: string; dietitianName: string; paidOn: string; mode: string; ref: string; campIds: string[]; amount: number; remarks: string[] }
    const groups = new Map<string, Group>()

    for (let r = 1; r < rowsRaw.length; r++) {
      const cells = rowsRaw[r]
      const campId = iCampId >= 0 ? cells[iCampId]?.trim() : ''
      if (!campId) continue
      const camp = camps.find((c) => c.id === campId)
      if (!camp) { notFound.push(campId); continue }
      const status = normPayStatus(iStatus >= 0 ? cells[iStatus] : '')
      const remark = (iRemarks >= 0 && cells[iRemarks]?.trim()) || ''

      if (status === 'PAID') {
        if (paymentsForCamp(campId).length > 0) { alreadyDone++; continue }
        // dietitian-payment.js:945 falls back to the CSV row's own
        // Dietitian_ID when the matched camp itself lacks one, rather than
        // treating the row as "camp not found" (the camp WAS found, it just
        // has no dietitian assigned).
        const dietitianId = camp.dietitianId || (iDietitianId >= 0 ? cells[iDietitianId]?.trim() : '')
        if (!dietitianId) { notFound.push(campId); continue }
        const d = dietitianById(dietitianId)
        const payable = Math.round(dietitianExpense(camp).total)
        const rawPaidAmt = iPaidAmt >= 0 ? Number(cells[iPaidAmt]) : NaN
        const paidAmt = Math.round(rawPaidAmt) || payable
        const paidOn = normDate(iPaidDate >= 0 ? cells[iPaidDate] : '')
        const mode = ((iMode >= 0 && cells[iMode]?.trim()) || 'BANK').toUpperCase()
        const ref = (iRef >= 0 && cells[iRef]?.trim()) || ''
        const key = `${dietitianId}|${paidOn}|${mode}|${ref || campId}`
        if (Math.abs(paidAmt - payable) > 1) {
          discrepancies.push(`${campId} · finance paid ${fmtInr(paidAmt)} vs payable ${fmtInr(payable)}`)
        }
        const g = groups.get(key) ?? { dietitianId, dietitianName: d?.name ?? dietitianId, paidOn, mode, ref, campIds: [], amount: 0, remarks: [] }
        g.campIds.push(campId)
        g.amount += paidAmt
        if (remark) g.remarks.push(`${campId}: ${remark}`)
        groups.set(key, g)
      } else if (status === 'HOLD') {
        held++
        if (paymentsForCamp(campId).length > 0) {
          discrepancies.push(`${campId} · file says HOLD but a payout already exists in the ledger`)
        }
      } else if (status === 'REJECTED') {
        rejected++
        if (paymentsForCamp(campId).length > 0) {
          discrepancies.push(`${campId} · file says REJECTED but a payout already exists in the ledger`)
        }
      } else {
        pendingBlank++
      }
    }

    let recorded = 0
    let campsMarkedPaid = 0
    let amountReconciled = 0
    for (const g of groups.values()) {
      await addDietPayment({
        dietitianId: g.dietitianId,
        dietitianName: g.dietitianName,
        amount: g.amount,
        campIds: g.campIds,
        paidOn: g.paidOn,
        mode: (['BANK', 'UPI', 'CHEQUE', 'CASH'].includes(g.mode) ? g.mode : 'BANK') as DietPayment['mode'],
        ref: g.ref,
        notes: 'Reconciled from finance import' + (g.remarks.length ? ' · ' + g.remarks.join('; ') : ''),
        paidBy: 'Finance reconciliation',
      })
      recorded++
      campsMarkedPaid += g.campIds.length
      amountReconciled += g.amount
    }

    setReconReport({
      totalRows: rowsRaw.length - 1,
      recorded,
      campsMarkedPaid,
      amountReconciled,
      alreadyDone,
      held,
      rejected,
      pendingBlank,
      discrepancies,
      notFound,
    })
    refetch()
  }

  // ── Ledger (last 25, newest first) ───────────────────────────────────────
  const sortedPayments = useMemo(() => [...payments].sort((a, b) => (b.paidAt || '').localeCompare(a.paidAt || '')), [payments])
  const recentPayments = sortedPayments.slice(0, 25)

  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN')
  }

  const addPaymentDietitianName = nameFor(addPaymentId)
  const viewCampsDietitianName = nameFor(viewCampsId)
  const rateTrendDietitianName = nameFor(rateTrendId)
  const bankEditDietitianName = nameFor(bankEditId)

  return (
    <div className="max-w-7xl">
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

      {/* Scope banner */}
      {isCoordOnly ? (
        <div className="rounded-lg px-3.5 py-2.5 mb-3.5 flex items-center gap-2 text-[12.5px]" style={{ background: 'rgba(59,109,255,.06)', border: '1px solid rgba(59,109,255,.2)', color: '#1d4ed8' }}>
          <FiFilter size={13} /> Scoped to dietitians in your assigned projects.
        </div>
      ) : (
        <div className="rounded-lg px-3.5 py-2.5 mb-3.5 flex items-center gap-2 text-[12.5px]" style={{ background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.2)', color: '#047857' }}>
          <FiGlobe size={13} /> Showing every dietitian in the portal.
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 mb-4">
        <KpiTile label="Dietitians" value={String(rows.length)} sub="In your scope" tone="brand" icon={FiList} />
        <KpiTile label="Reports pending" value={String(kpi.reportsPending)} sub="Camps awaiting patient count + photos" tone="amber" icon={FiFileText} />
        <KpiTile label="Payment released" value={fmtInr(kpi.released)} sub="Across all ledger entries" tone="emerald" icon={FiCheckSquare} />
        <div className="relative rounded-xl border p-3.5 overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Ready for payment</div>
          <div className="text-[22px] font-extrabold leading-tight mb-0.5" style={{ color: '#0d9488' }}>{fmtInr(kpi.ready)}</div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Reports complete · not yet paid</div>
        </div>
        <div className="relative rounded-xl border p-3.5 overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Estimated upcoming</div>
          <div className="text-[22px] font-extrabold leading-tight mb-0.5" style={{ color: '#92400e' }}>{fmtInr(kpi.upcoming)}</div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>After report completion</div>
        </div>
        <KpiTile label="Missing bank" value={String(kpi.missingBank)} sub="Blocks payout" tone="rose" icon={FiFileMinus} />
      </div>

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

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['Dietitian', 'HQ · States', 'Total camps', 'Reports pending', 'Amt to be paid', 'Amount paid', 'Bank', 'Actions'].map((h) => (
                  <th key={h} className="text-left font-bold px-2 py-2 text-[10px] uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr
                  key={r.dietitianId}
                  className="border-t border-dashed"
                  style={{ borderColor: 'var(--qms-border)', background: r.toBePaid > 0 ? 'rgba(16,185,129,.04)' : undefined }}
                >
                  <td className="px-2 py-2">
                    <span className="font-bold" style={{ color: 'var(--qms-text)' }}>{r.dietitianName}</span>
                    <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>{r.dietitianId}</div>
                  </td>
                  <td className="px-2 py-2">
                    {r.hq || '—'}
                    <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>{r.states.join(', ')}</div>
                  </td>
                  <td className="px-2 py-2">
                    <span className="font-bold">{r.totalCamps}</span>
                    <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>{r.readyCamps} ready · {r.paidCamps} paid</div>
                  </td>
                  <td className="px-2 py-2 font-bold" style={{ color: r.pendingReports > 0 ? '#b91c1c' : '#475569' }}>{r.pendingReports}</td>
                  <td className="px-2 py-2">
                    <span className="font-bold" style={{ color: '#0d9488' }}>{fmtInr(r.toBePaid)}</span>
                    {r.upcomingAmount > 0 && (
                      <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>+ {fmtInr(r.upcomingAmount)} after reports</div>
                    )}
                  </td>
                  <td className="px-2 py-2" style={{ color: '#047857' }}>{fmtInr(r.paidAmount)}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={r.bankComplete ? { background: 'rgba(16,185,129,.16)', color: '#047857' } : { background: 'rgba(244,63,94,.16)', color: '#b91c1c' }}>
                        {r.bankComplete ? 'COMPLETE' : 'MISSING'}
                      </span>
                      {!r.bankComplete && (
                        <button title="Add bank" onClick={() => setBankEditId(r.dietitianId)} style={{ color: 'var(--qms-text-muted)' }}>
                          <FiEdit2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => setViewCampsId(r.dietitianId)}><FiList size={11} /> View camps</Button>
                      <Button size="sm" variant="outline" onClick={() => setRateTrendId(r.dietitianId)}><FiTrendingUp size={11} /> Rate trend</Button>
                      {adminLike && (
                        <Button size="sm" disabled={r.toBePaid === 0} onClick={() => openAddPayment(r.dietitianId)}>
                          <FiDollarSign size={11} /> Add payment
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8" style={{ color: 'var(--qms-text-muted)' }}>No dietitians in your scope.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment ledger */}
      <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
          <div>
            <div className="text-[14px] font-extrabold" style={{ color: 'var(--qms-text)' }}>Recent payments ({sortedPayments.length})</div>
            <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Last 25 payouts recorded. Newest first.</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => exportLedger(sortedPayments)}><FiDownload size={12} /> Export ledger</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['Date', 'Dietitian', 'Camps', 'Mode', 'Reference', 'Amount ₹', 'By'].map((h) => (
                  <th key={h} className="text-left font-bold px-2 py-2 text-[10px] uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p) => (
                <tr key={p.id} className="border-t border-dashed" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-2 py-2">{fmtDate(p.paidOn)}</td>
                  <td className="px-2 py-2 font-bold" style={{ color: 'var(--qms-text)' }}>{p.dietitianName}</td>
                  <td className="px-2 py-2">{p.campIds.length ? p.campIds.join(', ') : '—'}</td>
                  <td className="px-2 py-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,109,255,.14)', color: '#1d4ed8' }}>{p.mode}</span>
                  </td>
                  <td className="px-2 py-2">{p.ref || '—'}</td>
                  <td className="px-2 py-2 font-bold" style={{ color: '#047857' }}>{fmtInr(p.amount)}</td>
                  <td className="px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>{p.paidBy}</td>
                </tr>
              ))}
              {recentPayments.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8" style={{ color: 'var(--qms-text-muted)' }}>No payments recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ViewCampsModal
        dietitianId={viewCampsId}
        dietitianName={viewCampsDietitianName}
        camps={camps}
        adminLike={adminLike}
        onClose={() => setViewCampsId(null)}
        onAddPayment={openAddPayment}
      />
      <AddPaymentModal
        dietitianId={addPaymentId}
        dietitianName={addPaymentDietitianName}
        camps={camps}
        paidBy={userName || 'Unknown'}
        onClose={() => setAddPaymentId(null)}
        onSaved={() => { setAddPaymentId(null); refetch() }}
      />
      <RateTrendModal
        dietitianId={rateTrendId}
        dietitianName={rateTrendDietitianName}
        onClose={() => setRateTrendId(null)}
      />
      <BankEditModal
        dietitianId={bankEditId}
        dietitianName={bankEditDietitianName}
        onClose={() => setBankEditId(null)}
        onSaved={() => { setBankEditId(null); refetch() }}
      />
      <ReconciliationReportModal
        report={reconReport}
        onClose={() => setReconReport(null)}
      />
    </div>
  )
}

export default DietitianPaymentPage
