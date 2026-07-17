import { useState } from 'react'
import { FiCheck, FiX, FiRotateCcw, FiUpload } from 'react-icons/fi'
import { FiCreditCard as FiWallet } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import type { Person } from '@/types/people.types'
import type { useOm } from '@/features/om/hooks/useOm'
import { expensesOfType, dietitianExpensesOfType, type ExpenseRow } from '@/features/om/om.service'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { clientName } from '@/types/campref.types'
import { formatDate, formatINR } from '@/utils/formatters'
import type { ExpenseStatus } from '@/features/om/om.types'

interface ExpensesTabProps {
  camps: Camp[]
  mode: 'Screening' | 'Diet'
  fos: Person[]
  dietitians: Person[]
  om: ReturnType<typeof useOm>
}

const STATUS_STYLE: Record<ExpenseStatus, { bg: string; color: string }> = {
  PENDING: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  APPROVED: { bg: 'rgba(59,109,255,.12)', color: 'var(--qms-brand)' },
  REJECTED: { bg: 'var(--danger-soft)', color: 'var(--danger)' },
  PAID: { bg: 'var(--success-soft)', color: 'var(--success)' },
}
const ORDER: Record<ExpenseStatus, number> = { PENDING: 0, APPROVED: 1, PAID: 2, REJECTED: 3 }

// Mirrors tabExpenses() exactly (om-portal.js:1248-1336), including the
// payment-docs gate: marking APPROVED → PAID requires attaching an Excel
// sheet + photos before window.omExpense(id,'PAID') fires.
const ExpensesTab = ({ camps, mode, fos, dietitians, om }: ExpensesTabProps) => {
  const isDiet = mode === 'Diet'
  const subjCol = isDiet ? 'Dietitian' : 'FO'
  const headerLabel = isDiet ? `Dietitian remuneration claims — ${mode} camps` : `FO expense claims — ${mode} camps`

  const [payModalExp, setPayModalExp] = useState<ExpenseRow | null>(null)
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])

  let expenses = isDiet
    ? dietitianExpensesOfType(camps, om.expenseOverlay, om.rateHistory, dietitians)
    : expensesOfType(camps, om.expenseOverlay, mode, fos)
  expenses = [...expenses].sort((a, b) => (ORDER[a.status] - ORDER[b.status]) || (b.date || '').localeCompare(a.date || ''))

  const pending = expenses.filter((e) => e.status === 'PENDING')
  const approved = expenses.filter((e) => e.status === 'APPROVED')
  const paid = expenses.filter((e) => e.status === 'PAID')
  const outstanding = approved.reduce((a, e) => a + e.total, 0)

  const openPayModal = (exp: ExpenseRow) => {
    setPayModalExp(exp)
    setExcelFile(null)
    setPhotoFiles([])
  }

  const confirmPayment = () => {
    if (!payModalExp) return
    if (!excelFile || photoFiles.length === 0) return
    om.setExpenseStatus(payModalExp.id, 'PAID')
    setPayModalExp(null)
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Total claims</div>
          <div className="text-[22px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{formatINR(expenses.reduce((a, e) => a + e.total, 0))}</div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{expenses.length} {isDiet ? 'remuneration' : 'expense'} line{expenses.length === 1 ? '' : 's'}</div>
        </div>
        <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Pending approval</div>
          <div className="text-[22px] font-extrabold" style={{ color: '#f59e0b' }}>{formatINR(pending.reduce((a, e) => a + e.total, 0))}</div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{pending.length} claims</div>
        </div>
        <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Payment outstanding</div>
          <div className="text-[22px] font-extrabold" style={{ color: '#f43f5e' }}>{formatINR(outstanding)}</div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{approved.length} approved · unpaid</div>
        </div>
        <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Paid &amp; settled</div>
          <div className="text-[22px] font-extrabold" style={{ color: '#10b981' }}>{formatINR(paid.reduce((a, e) => a + e.total, 0))}</div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{paid.length} claims</div>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="px-3.5 py-3 border-b text-[13px] font-extrabold" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}>{headerLabel}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {[`${isDiet ? 'Remuneration' : 'Expense'} · Camp`, subjCol, 'Company', 'Breakdown', 'Status', ''].map((h) => (
                  <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-3 py-2.5">
                    <div className="font-extrabold" style={{ color: 'var(--qms-text)' }}>{e.id}</div>
                    <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{e.campId} · {formatDate(e.date)}</div>
                  </td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{isDiet ? e.dietitianName : e.foName}</td>
                  <td className="px-3 py-2.5">
                    <div style={{ color: 'var(--qms-text-soft)' }}>{clientName(e.clientId)}</div>
                    <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{e.city ?? ''}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                      {isDiet
                        ? `Remuneration ${formatINR(e.base ?? 0)} · Travel ${formatINR(e.travel ?? 0)}${e.travelKm ? ` (${e.travelKm} km)` : ''}`
                        : `Travel ${formatINR(e.travel ?? 0)} · DA ${formatINR(e.daily ?? 0)} · Misc ${formatINR(e.misc ?? 0)}`}
                    </div>
                    <div className="font-extrabold" style={{ color: 'var(--qms-text)' }}>{formatINR(e.total)}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: STATUS_STYLE[e.status].bg, color: STATUS_STYLE[e.status].color }}>{e.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {e.status === 'PENDING' && (
                      <>
                        <Button size="sm" variant="ghost" style={{ color: '#10b981' }} onClick={() => om.setExpenseStatus(e.id, 'APPROVED')}><FiCheck size={13} /> Approve</Button>
                        <Button size="sm" variant="ghost" style={{ color: 'var(--danger)' }} onClick={() => om.setExpenseStatus(e.id, 'REJECTED')}><FiX size={13} /></Button>
                      </>
                    )}
                    {e.status === 'APPROVED' && (
                      <Button size="sm" variant="ghost" style={{ color: '#0ea5e9' }} onClick={() => openPayModal(e)}><FiWallet size={13} /> Mark paid</Button>
                    )}
                    {e.status === 'REJECTED' && (
                      <Button size="sm" variant="ghost" onClick={() => om.setExpenseStatus(e.id, 'PENDING')}><FiRotateCcw size={13} /> Reopen</Button>
                    )}
                    {e.status === 'PAID' && <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>settled</span>}
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No {isDiet ? 'remuneration' : 'expense'} claims in scope</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!payModalExp} onOpenChange={(o) => !o && setPayModalExp(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Release payment · {payModalExp?.id}</DialogTitle></DialogHeader>
          <p className="text-[12px] -mt-2" style={{ color: 'var(--qms-text-muted)' }}>Attach the required documents to mark this expense paid</p>

          <div className="flex items-center gap-2 text-[11px] mb-1">
            <span className="font-bold" style={{ color: '#10b981' }}>✓ Approved</span>
            <span style={{ color: 'var(--qms-text-muted)' }}>→</span>
            <span className="font-bold" style={{ color: 'var(--qms-brand)' }}>Documents attached</span>
            <span style={{ color: 'var(--qms-text-muted)' }}>→</span>
            <span style={{ color: 'var(--qms-text-muted)' }}>Paid</span>
          </div>

          {payModalExp && (
            <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>
              Amount: <strong style={{ color: 'var(--qms-text)' }}>{formatINR(payModalExp.total)}</strong>
            </div>
          )}

          <div className="space-y-2">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-[12px]" style={{ borderColor: excelFile ? '#10b981' : 'var(--qms-border)', color: excelFile ? '#10b981' : 'var(--qms-text-muted)' }}>
              <FiUpload size={13} /> {excelFile ? excelFile.name : 'Upload payment Excel sheet (required)'}
              <input type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)} />
            </label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-[12px]" style={{ borderColor: photoFiles.length ? '#10b981' : 'var(--qms-border)', color: photoFiles.length ? '#10b981' : 'var(--qms-text-muted)' }}>
              <FiUpload size={13} /> {photoFiles.length ? `${photoFiles.length} photo${photoFiles.length === 1 ? '' : 's'} attached` : 'Upload payment proof photos (required)'}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))} />
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModalExp(null)}>Cancel</Button>
            <Button disabled={!excelFile || photoFiles.length === 0} onClick={confirmPayment}>
              <FiCheck size={13} /> Confirm payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ExpensesTab
