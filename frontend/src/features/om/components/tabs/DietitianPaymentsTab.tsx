import { useState } from 'react'
import { FiDownload, FiEdit2, FiList, FiPlus, FiTrash2, FiCheck, FiShield } from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import type { useOm } from '@/features/om/hooks/useOm'
import { dietitianExpensesOfType, dietitianWisePayments, stateWisePayments, type DietitianPaymentRow, type StatePaymentRow } from '@/features/om/om.service'
import { toCsv, downloadCsv } from '@/features/om/om.dietDashboard'
import type { DietitianBankAccount } from '@/features/om/om.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatINR } from '@/utils/formatters'

interface DietitianPaymentsTabProps {
  camps: Camp[]
  dietitians: Person[]
  om: ReturnType<typeof useOm>
}

const emptyAccount = (name: string, n: number): DietitianBankAccount => ({
  label: `Account ${n}`, accountName: name, accountNumber: '', ifsc: '', branch: '', accountType: 'SAVINGS', upi: '', chequeUrl: '',
})

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })

// Mirrors tabDietPayments() exactly (om-portal.js:1435-1602): section A
// (dietitian-wise payment table), section B (state-wise aggregation), plus
// the bank-details modal (om-portal.js:1612-1761) — multiple bank accounts,
// account-number/IFSC regex validation, mandatory cancelled-cheque upload,
// printing-charge-per-camp field.
const DietitianPaymentsTab = ({ camps, dietitians, om }: DietitianPaymentsTabProps) => {
  const [bankModalId, setBankModalId] = useState<string | null>(null)
  const [stateModal, setStateModal] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<DietitianBankAccount[]>([])
  const [printing, setPrinting] = useState(150)
  const [formError, setFormError] = useState('')

  const expenses = dietitianExpensesOfType(camps, om.expenseOverlay, om.rateHistory, dietitians)
  const dietRows = dietitianWisePayments(expenses, dietitians, om.dietPaymentDetails)
  const stateRows = stateWisePayments(dietRows)

  const totEarned = dietRows.reduce((a, r) => a + r.total, 0)
  const totPaid = dietRows.reduce((a, r) => a + r.paid, 0)
  const totPending = dietRows.reduce((a, r) => a + r.pending + r.approved, 0)
  const missingBank = dietRows.filter((r) => !r.bankComplete).length

  const bankModalDietitian = dietitians.find((d) => d.id === bankModalId)

  const openBankModal = (dietId: string) => {
    const existing = om.dietPaymentDetails[dietId]
    setAccounts(existing?.bankAccounts?.length ? existing.bankAccounts.map((a) => ({ ...a })) : [])
    setPrinting(existing?.printingChargePerCamp ?? 150)
    setFormError('')
    setBankModalId(dietId)
  }

  const addAccount = () => setAccounts((prev) => [...prev, emptyAccount(bankModalDietitian?.name ?? '', prev.length + 1)])
  const removeAccount = (i: number) => setAccounts((prev) => prev.filter((_, idx) => idx !== i))
  const updateAccount = (i: number, patch: Partial<DietitianBankAccount>) =>
    setAccounts((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)))

  const handleChequeUpload = async (i: number, file: File | undefined) => {
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    updateAccount(i, { chequeUrl: dataUrl })
  }

  const saveBankDetails = () => {
    for (let i = 0; i < accounts.length; i++) {
      const a = accounts[i]
      const anyFilled = a.accountName || a.accountNumber || a.ifsc || a.chequeUrl
      if (!anyFilled) continue
      if (!a.accountName) return setFormError(`Account ${i + 1}: holder name required`)
      const acc = String(a.accountNumber || '').replace(/\s+/g, '')
      if (!/^\d{6,18}$/.test(acc)) return setFormError(`Account ${i + 1}: 6-18 digit account number required`)
      const ifsc = String(a.ifsc || '').toUpperCase()
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return setFormError(`Account ${i + 1}: IFSC must be 11 chars (e.g. HDFC0001234)`)
      if (!a.chequeUrl) return setFormError(`Account ${i + 1}: cancelled cheque is mandatory`)
      accounts[i] = { ...a, accountNumber: acc, ifsc, capturedAt: a.capturedAt ?? new Date().toISOString() }
    }
    if (!bankModalId) return
    om.saveDietPaymentDetails(bankModalId, { bankAccounts: accounts, printingChargePerCamp: printing })
    setBankModalId(null)
  }

  const exportDietRows = (rows: DietitianPaymentRow[]) => {
    const data = rows.map((r) => ({
      Dietitian_ID: r.dietId, Dietitian: r.name, HQ: r.hq, States: r.states, Camps: r.camps,
      Total_Earned: r.total, Paid: r.paid, Pending: r.pending + r.approved, Rejected: r.rejected,
      Claimable: r.claimable,
      Bank_Account_Name: r.bankAccounts[0]?.accountName ?? '', Bank_Account_Number: r.bankAccounts[0]?.accountNumber ?? '',
      IFSC: r.bankAccounts[0]?.ifsc ?? '', Bank_Branch: r.bankAccounts[0]?.branch ?? '',
      Cheque_On_File: r.bankAccounts[0]?.chequeUrl ? 'YES' : 'NO', Bank_Complete: r.bankComplete ? 'YES' : 'NO',
    }))
    downloadCsv(`dietitian-payments-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(data))
  }

  const exportStateRows = (rows: StatePaymentRow[]) => {
    downloadCsv(`dietitian-payments-by-state-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows))
  }

  const stateCamps = stateModal
    ? camps.filter((c) => c.type === 'Diet' && dietitians.find((d) => d.id === c.dietitianId)?.states?.[0] === stateModal || (stateModal === '—' && !dietitians.find((d) => d.id === c.dietitianId)?.states?.[0]))
    : []

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-3.5">
        <div className="rounded-xl border p-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Active dietitians</div>
          <div className="text-[20px] font-extrabold mt-1" style={{ color: 'var(--qms-text)' }}>{dietRows.length}</div>
          <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>With camp earnings</div>
        </div>
        <div className="rounded-xl border p-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Total earned</div>
          <div className="text-[20px] font-extrabold mt-1" style={{ color: 'var(--qms-text)' }}>{formatINR(totEarned)}</div>
          <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>All-time</div>
        </div>
        <div className="rounded-xl border p-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Already paid</div>
          <div className="text-[20px] font-extrabold mt-1" style={{ color: '#047857' }}>{formatINR(totPaid)}</div>
          <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>Out the door</div>
        </div>
        <div className="rounded-xl border p-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Outstanding</div>
          <div className="text-[20px] font-extrabold mt-1" style={{ color: '#b91c1c' }}>{formatINR(totPending)}</div>
          <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>To be paid</div>
        </div>
        <div className="rounded-xl border p-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Bank info missing</div>
          <div className="text-[20px] font-extrabold mt-1" style={{ color: missingBank ? '#b91c1c' : '#047857' }}>{missingBank}</div>
          <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>Block payouts</div>
        </div>
        <div className="rounded-xl border p-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>States covered</div>
          <div className="text-[20px] font-extrabold mt-1" style={{ color: 'var(--qms-text)' }}>{stateRows.length}</div>
          <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>Unique state count</div>
        </div>
      </div>

      <div className="rounded-xl border p-3.5 mb-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
          <div>
            <div className="text-[14px] font-extrabold" style={{ color: 'var(--qms-text)' }}>Dietitian-wise payments</div>
            <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Per dietitian · total earned / paid / pending · click &quot;Edit bank&quot; to capture account + cancelled cheque.</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => exportDietRows(dietRows)}><FiDownload size={12} /> Export CSV</Button>
        </div>
        <div className="overflow-x-auto max-h-140">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['Dietitian', 'HQ · States', 'Camps', 'Earned', 'Paid', 'Pending', 'Claimable', 'Bank', ''].map((h) => (
                  <th key={h} className="text-left font-bold px-2 py-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dietRows.map((r) => (
                <tr key={r.dietId} className="border-t border-dashed" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-2 py-2"><span className="font-bold" style={{ color: 'var(--qms-text)' }}>{r.name}</span><div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>{r.dietId}</div></td>
                  <td className="px-2 py-2">{r.hq || '—'}<div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>{r.states}</div></td>
                  <td className="px-2 py-2">{r.camps}</td>
                  <td className="px-2 py-2 font-bold">{formatINR(r.total)}</td>
                  <td className="px-2 py-2" style={{ color: '#047857' }}>{formatINR(r.paid)}</td>
                  <td className="px-2 py-2" style={{ color: '#92400e' }}>{formatINR(r.pending + r.approved)}</td>
                  <td className="px-2 py-2 font-extrabold" style={{ color: '#b91c1c' }}>{formatINR(r.claimable)}</td>
                  <td className="px-2 py-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={r.bankComplete ? { background: 'rgba(16,185,129,.16)', color: '#047857' } : { background: 'rgba(244,63,94,.16)', color: '#b91c1c' }}>
                      {r.bankComplete ? 'COMPLETE' : 'MISSING'}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <Button size="sm" variant="outline" onClick={() => openBankModal(r.dietId)}><FiEdit2 size={11} /> Edit bank</Button>
                  </td>
                </tr>
              ))}
              {dietRows.length === 0 && (
                <tr><td colSpan={9} className="text-center py-8" style={{ color: 'var(--qms-text-muted)' }}>No dietitian payments yet — no Diet camps with assigned dietitians.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
          <div>
            <div className="text-[14px] font-extrabold" style={{ color: 'var(--qms-text)' }}>State-wise aggregation</div>
            <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Unique dietitians + claimable totals + camp count per state.</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => exportStateRows(stateRows)}><FiDownload size={12} /> Export CSV</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['State', 'Unique dietitians', 'Total camps', 'Earned', 'Paid', 'Claimable', ''].map((h) => (
                  <th key={h} className="text-left font-bold px-2 py-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stateRows.map((s) => (
                <tr key={s.state} className="border-t border-dashed" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-2 py-2 font-bold" style={{ color: 'var(--qms-text)' }}>{s.state}</td>
                  <td className="px-2 py-2">{s.uniqueDietitians}</td>
                  <td className="px-2 py-2">{s.camps}</td>
                  <td className="px-2 py-2 font-bold">{formatINR(s.total)}</td>
                  <td className="px-2 py-2" style={{ color: '#047857' }}>{formatINR(s.paid)}</td>
                  <td className="px-2 py-2 font-extrabold" style={{ color: '#b91c1c' }}>{formatINR(s.claimable)}</td>
                  <td className="px-2 py-2"><Button size="sm" variant="ghost" onClick={() => setStateModal(s.state)}><FiList size={11} /> Camps</Button></td>
                </tr>
              ))}
              {stateRows.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8" style={{ color: 'var(--qms-text-muted)' }}>No statewise data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bank details modal */}
      <Dialog open={!!bankModalId} onOpenChange={(o) => !o && setBankModalId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bank · printing · {bankModalDietitian?.name ?? bankModalId}</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] -mt-2" style={{ color: 'var(--qms-text-muted)' }}>Multiple bank accounts + cancelled cheques + per-camp printing charge</p>

          <div className="rounded-xl border p-3" style={{ background: 'rgba(59,109,255,.04)', borderColor: 'rgba(59,109,255,.2)' }}>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Printing charge per camp (₹)</label>
            <Input type="number" min={0} step={10} value={printing} onChange={(e) => setPrinting(Number(e.target.value) || 0)} />
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>Added to every camp&apos;s remuneration (counsellor leaflets, BMI sheets, ID stickers etc.).</p>
          </div>

          <div className="flex items-center justify-between mt-3.5 mb-1.5">
            <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>Bank accounts ({accounts.length})</div>
            <Button size="sm" variant="outline" onClick={addAccount}><FiPlus size={12} /> Add another bank</Button>
          </div>

          {accounts.length === 0 && (
            <div className="rounded-xl border p-3 text-[12px]" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
              No bank accounts yet — click <strong>Add another bank</strong>.
            </div>
          )}

          {accounts.map((a, i) => {
            const complete = !!(a.accountNumber && a.ifsc && a.chequeUrl)
            return (
              <div key={i} className="rounded-xl border p-3 mb-2.5" style={complete ? { borderColor: '#10b981', background: 'rgba(16,185,129,.04)' } : { borderColor: 'var(--qms-border)' }}>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <Input className="max-w-60 font-bold" value={a.label ?? ''} onChange={(e) => updateAccount(i, { label: e.target.value })} placeholder={`Account ${i + 1}`} />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full" style={complete ? { background: 'rgba(16,185,129,.16)', color: '#047857' } : { background: 'rgba(244,63,94,.16)', color: '#b91c1c' }}>
                      {complete ? 'COMPLETE' : 'INCOMPLETE'}
                    </span>
                    <button onClick={() => removeAccount(i)} style={{ color: '#b91c1c' }}><FiTrash2 size={13} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Account holder name</label>
                    <Input value={a.accountName} onChange={(e) => updateAccount(i, { accountName: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Account number</label>
                    <Input value={a.accountNumber} onChange={(e) => updateAccount(i, { accountNumber: e.target.value })} placeholder="e.g. 1234 5678 9012 3456" />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>IFSC</label>
                    <Input value={a.ifsc} onChange={(e) => updateAccount(i, { ifsc: e.target.value })} placeholder="HDFC0001234" />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Bank · branch</label>
                    <Input value={a.branch ?? ''} onChange={(e) => updateAccount(i, { branch: e.target.value })} placeholder="HDFC · Bandra West" />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Type</label>
                    <select
                      className="w-full h-9 rounded-lg border px-2.5 text-[13px]"
                      style={{ borderColor: 'var(--qms-border)' }}
                      value={a.accountType ?? 'SAVINGS'}
                      onChange={(e) => updateAccount(i, { accountType: e.target.value as 'SAVINGS' | 'CURRENT' })}
                    >
                      <option value="SAVINGS">Savings</option>
                      <option value="CURRENT">Current</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>UPI ID (optional)</label>
                    <Input value={a.upi ?? ''} onChange={(e) => updateAccount(i, { upi: e.target.value })} placeholder="name@hdfc" />
                  </div>
                </div>
                <label className="text-[10.5px] font-bold uppercase tracking-wide block mt-2.5 mb-1" style={{ color: 'var(--qms-text-muted)' }}>Cancelled cheque / bank-details photo *</label>
                <div className="rounded-xl border border-dashed p-3 text-center" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}>
                  {a.chequeUrl ? (
                    <>
                      <img src={a.chequeUrl} alt="Cancelled cheque" className="max-w-full max-h-40 rounded-lg mx-auto" />
                      <div className="text-[11px] font-bold mt-1" style={{ color: '#047857' }}>✓ Uploaded · re-upload to replace</div>
                    </>
                  ) : (
                    <div className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>Click to choose a cheque photo / passbook page</div>
                  )}
                  <input type="file" accept="image/*,application/pdf" className="mt-1.5 text-[11px] mx-auto" onChange={(e) => handleChequeUpload(i, e.target.files?.[0])} />
                </div>
              </div>
            )
          })}

          <p className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--qms-text-muted)' }}>
            <FiShield size={11} style={{ color: '#10b981' }} />
            Cheque images are held locally in this portal. In production they go to encrypted storage and the link is audit-logged.
          </p>

          {formError && <p className="text-[12px] font-semibold" style={{ color: 'var(--danger)' }}>{formError}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBankModalId(null)}>Cancel</Button>
            <Button onClick={saveBankDetails}><FiCheck size={13} /> Save all</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* State camps drill-down */}
      <Dialog open={!!stateModal} onOpenChange={(o) => !o && setStateModal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Diet camps · {stateModal}</DialogTitle></DialogHeader>
          <p className="text-[12px] -mt-2" style={{ color: 'var(--qms-text-muted)' }}>{stateCamps.length} camp{stateCamps.length === 1 ? '' : 's'}</p>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: 'var(--qms-surface-strong)' }}>
                  {['Camp', 'Date', 'City', 'Dietitian', 'Status'].map((h) => (
                    <th key={h} className="text-left font-bold px-2 py-1.5 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stateCamps.map((c) => (
                  <tr key={c.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                    <td className="px-2 py-1.5 font-bold">{c.id}</td>
                    <td className="px-2 py-1.5">{c.date}</td>
                    <td className="px-2 py-1.5">{c.city || '—'}</td>
                    <td className="px-2 py-1.5">{dietitians.find((d) => d.id === c.dietitianId)?.name ?? '—'}</td>
                    <td className="px-2 py-1.5">{c.status}</td>
                  </tr>
                ))}
                {stateCamps.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-6" style={{ color: 'var(--qms-text-muted)' }}>No camps in this state.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStateModal(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DietitianPaymentsTab
