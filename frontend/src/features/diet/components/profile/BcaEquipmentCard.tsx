import { useState } from 'react'
import { FiCpu, FiPackage, FiCheckCircle, FiPackage as FiPackageSearch } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import type { DietitianProfileBundle } from '@/features/diet/dietitians.types'
import { requestBcaScale } from '@/features/diet/dietitians.service'
import { fmtDate } from './profile.utils'
import BcaVerifyDialog from './BcaVerifyDialog'
import LogStockMovementDialog from './LogStockMovementDialog'

interface BcaEquipmentCardProps {
  bundle: DietitianProfileBundle
  userName: string
  onChanged: () => void
}

// §6 (right column) — BCA scale & equipment: verification pill, actions,
// and a nested stock-movements table.
const BcaEquipmentCard = ({ bundle, userName, onChanged }: BcaEquipmentCardProps) => {
  const bca = bundle.equipment.bca
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)

  const pill = bca.verified
    ? { bg: 'rgba(16,185,129,.16)', color: '#047857', label: '✓ VERIFIED' }
    : bca.owned
      ? { bg: 'rgba(245,158,11,.16)', color: '#92400e', label: 'OWNED · UNVERIFIED' }
      : { bg: 'rgba(244,63,94,.16)', color: '#b91c1c', label: 'NOT OWNED' }

  const handleRequest = async () => {
    await requestBcaScale(bundle.dietitian.id, userName)
    toast.success('BCA scale requested · logistics will allocate')
    onChanged()
  }

  const movements = (bca.stockMovements || []).slice(0, 15)

  return (
    <div className="rounded-xl border p-3.5 h-full" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide mb-2.5" style={{ color: 'var(--qms-text-soft)' }}>
        <FiCpu size={13} /> BCA scale &amp; equipment
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="inline-flex items-center text-[11px] font-extrabold rounded-full px-2.5 py-1" style={{ background: pill.bg, color: pill.color }}>
          {pill.label}
        </span>
        {bca.videoUrl && (
          <a
            href={bca.videoUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center text-[11px] font-bold rounded-full px-2.5 py-1"
            style={{ background: 'rgba(29,78,216,.12)', color: '#1d4ed8' }}
          >
            Video
          </a>
        )}
      </div>
      {bca.verifiedAt && (
        <p className="text-[11.5px] mb-2" style={{ color: 'var(--qms-text-muted)' }}>
          Verified {fmtDate(bca.verifiedAt)} by {bca.verifiedBy || '—'}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mt-2 mb-3">
        {!bca.owned && (
          <Button size="sm" onClick={handleRequest}><FiPackage size={12} /> Request BCA scale</Button>
        )}
        {bca.owned && !bca.verified && (
          <Button size="sm" onClick={() => setVerifyOpen(true)}><FiCheckCircle size={12} /> Verify (upload video)</Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setLogOpen(true)}><FiPackageSearch size={12} /> Log movement</Button>
      </div>

      <div className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Stock movements</div>
      {movements.length === 0 ? (
        <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No stock movements logged.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>
          <table className="w-full text-[11.5px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['When', 'By', 'Action', 'Location', 'Video'].map((h) => (
                  <th key={h} className="text-left font-semibold px-2 py-1.5 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movements.map((m, i) => (
                <tr key={i} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-2 py-1.5" style={{ color: 'var(--qms-text)' }}>{fmtDate(m.at)}</td>
                  <td className="px-2 py-1.5" style={{ color: 'var(--qms-text-soft)' }}>{m.by}</td>
                  <td className="px-2 py-1.5" style={{ color: 'var(--qms-text)' }}>{m.action}</td>
                  <td className="px-2 py-1.5" style={{ color: 'var(--qms-text-soft)' }}>
                    {m.fromLocation ? `${m.fromLocation}${m.toLocation ? ` → ${m.toLocation}` : ''}` : '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    {m.videoUrl ? <a href={m.videoUrl} target="_blank" rel="noreferrer" style={{ color: '#0d9488', fontWeight: 700 }}>Video</a> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BcaVerifyDialog open={verifyOpen} dietitianId={bundle.dietitian.id} userName={userName} onClose={() => setVerifyOpen(false)} onSaved={() => { setVerifyOpen(false); onChanged() }} />
      <LogStockMovementDialog open={logOpen} dietitianId={bundle.dietitian.id} userName={userName} onClose={() => setLogOpen(false)} onSaved={() => { setLogOpen(false); onChanged() }} />
    </div>
  )
}

export default BcaEquipmentCard
