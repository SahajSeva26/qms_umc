import { useState } from 'react'
import { FiCreditCard, FiPlus } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import type { DietitianProfileBundle } from '@/features/diet/dietitians.types'
import BankAddDialog from './BankAddDialog'

interface BankAccountsSectionProps {
  bundle: DietitianProfileBundle
  onChanged: () => void
}

const mask = (accountNumber?: string) => (accountNumber ? `••${accountNumber.slice(-4)}` : '—')

// §11 — Bank accounts, full width, last section.
const BankAccountsSection = ({ bundle, onChanged }: BankAccountsSectionProps) => {
  const accounts = bundle.details.bankAccounts || []
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide mb-2.5" style={{ color: 'var(--qms-text-soft)' }}>
        <FiCreditCard size={13} /> Bank accounts ({accounts.length})
      </div>

      {accounts.length === 0 ? (
        <div>
          <p className="text-[12.5px] mb-2.5" style={{ color: 'var(--qms-text-muted)' }}>No bank accounts on file.</p>
          <Button size="sm" onClick={() => setAddOpen(true)}><FiPlus size={12} /> Add bank details</Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['Label', 'Account', 'Branch', 'Type', 'Cheque'].map((h) => (
                  <th key={h} className="text-left font-semibold px-2.5 py-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map((a, i) => (
                <tr key={i} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text)' }}>
                    <div className="font-bold">{a.label || 'Account'}</div>
                    <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{a.accountName || '—'}</div>
                  </td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text)' }}>
                    <div>{mask(a.accountNumber)}</div>
                    <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{a.ifsc || '—'}</div>
                  </td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{a.branch || '—'}</td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>
                    <div>{a.accountType || '—'}</div>
                    {a.upi && <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{a.upi}</div>}
                  </td>
                  <td className="px-2.5 py-2">
                    {a.chequeUrl ? (
                      <a href={a.chequeUrl} target="_blank" rel="noreferrer" className="font-bold" style={{ color: '#0d9488' }}>View cheque</a>
                    ) : (
                      <span className="inline-flex items-center text-[10.5px] font-extrabold rounded-full px-2 py-0.5" style={{ background: 'rgba(244,63,94,.16)', color: '#b91c1c' }}>missing</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BankAddDialog
        open={addOpen}
        dietitianId={bundle.dietitian.id}
        dietitianName={bundle.dietitian.name}
        onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); onChanged() }}
      />
    </div>
  )
}

export default BankAccountsSection
