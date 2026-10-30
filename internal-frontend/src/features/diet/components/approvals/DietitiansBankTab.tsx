import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FiUserPlus, FiEdit2 } from 'react-icons/fi'
import { isBankAccountComplete, loadDietDetails } from '@/features/diet/services/dietitianRoster.service'
import { useDietitianRoster } from '@/features/diet/hooks/useDietitianRoster'
import { dietKeys } from '@/features/diet/hooks/dietQueryKeys'
import type { DietitianBankAccount, DietitianRosterEntry } from '@/features/diet/dietitians.types'
import AddDietitianModal from './AddDietitianModal'
import DietitianBankModal from './DietitianBankModal'

const DietitiansBankTab = () => {
  const [addOpen, setAddOpen] = useState(false)
  const [bankFor, setBankFor] = useState<DietitianRosterEntry | null>(null)

  // Roster is a cached query; the modals' onDone invalidates the Diet cache
  // subtree instead of bumping a local version counter.
  const { data: roster = [], isPending, error } = useDietitianRoster()

  // The details store is read ONCE per render for the whole table.
  // bankComplete(id) and dietitianDetails(id) each re-parse it, and the old
  // code called them in a filter AND twice per row — 3 full parses per
  // dietitian. Deliberately NOT memoised: one parse per render is already
  // O(1), and a memo would have to be keyed on something that tracks writes to
  // a store this component does not own.
  const detailsById = loadDietDetails()
  const withBank = roster.filter((d) => isBankAccountComplete(detailsById[d.id]?.bankAccounts ?? [])).length
  const missing = roster.length - withBank

  const queryClient = useQueryClient()
  const bump = () => queryClient.invalidateQueries({ queryKey: dietKeys.all })

  return (
    <div>
      <div className="rounded-xl border p-4 mb-4 flex items-start justify-between gap-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div>
          <h3 className="text-[13.5px] font-bold" style={{ color: 'var(--qms-text)' }}>Dietitian master · bank capture</h3>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
            {roster.length} dietitians · <span style={{ color: '#047857', fontWeight: 700 }}>{withBank}</span> ready for payout · <span style={{ color: '#b91c1c', fontWeight: 700 }}>{missing}</span> missing bank info
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 text-[12.5px] font-bold px-3.5 py-2 rounded-lg text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          <FiUserPlus size={13} /> Add Dietitian
        </button>
      </div>

      <div className="rounded-xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        {isPending ? (
          <p className="text-[12.5px] py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading dietitians…</p>
        ) : error ? (
          <p className="text-[12.5px] py-4 text-center text-danger">Failed to load the dietitian master. Please try again.</p>
        ) : roster.length === 0 ? (
          <p className="text-[12.5px] py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>No dietitians yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]" style={{ color: 'var(--qms-text)' }}>
              <thead>
                <tr>
                  <Th>Dietitian</Th><Th>HQ · State</Th><Th>Status</Th><Th>Bank</Th><Th>Cheque</Th><Th />
                </tr>
              </thead>
              <tbody>
                {roster.map((d) => {
                  const accounts = detailsById[d.id]?.bankAccounts ?? []
                  const complete = isBankAccountComplete(accounts)
                  const details = d
                  return (
                    <tr key={d.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                      <td className="py-1.5 px-2"><b>{d.name}</b> <span style={{ color: 'var(--qms-text-muted)' }}>{d.specialty || ''}</span></td>
                      <td className="py-1.5 px-2">{d.hq || '—'} <span style={{ color: 'var(--qms-text-muted)' }}>{(d.states || []).join(', ')}</span></td>
                      <td className="py-1.5 px-2">{d.status}</td>
                      <td className="py-1.5 px-2"><BankCell accounts={accounts} /></td>
                      <td className="py-1.5 px-2">
                        <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={complete ? { background: 'rgba(16,185,129,.16)', color: '#047857' } : { background: 'rgba(244,63,94,.16)', color: '#b91c1c' }}>
                          {complete ? 'COMPLETE' : 'MISSING'}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        <button onClick={() => setBankFor(details)} className="flex items-center gap-1 text-[11.5px] font-semibold px-2 py-1 rounded-lg" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
                          <FiEdit2 size={11} /> Edit bank
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddDietitianModal open={addOpen} onClose={() => setAddOpen(false)} onDone={bump} />
      <DietitianBankModal open={!!bankFor} onClose={() => setBankFor(null)} dietitian={bankFor} onDone={bump} />
    </div>
  )
}

// Bank summary cell — the dietitian's primary account. Accounts are passed in
// from the table's single details read rather than looked up per row.
function BankCell({ accounts }: { accounts: DietitianBankAccount[] }) {
  const acc = accounts.find((b) => b.accountNumber && b.ifsc)
  if (!acc) return <span style={{ color: 'var(--qms-text-muted)' }}>—</span>
  const last4 = (acc.accountNumber || '').slice(-4)
  return <span>••{last4} · {acc.ifsc}</span>
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="py-1.5 px-2 text-left text-[11px] font-semibold uppercase" style={{ color: 'var(--qms-text-muted)' }}>{children}</th>
}

export default DietitiansBankTab
