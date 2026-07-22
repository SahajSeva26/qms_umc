import { FiUser } from 'react-icons/fi'
import type { DietitianProfileBundle } from '@/features/diet/dietitians.types'

interface PersonalHrCardProps {
  bundle: DietitianProfileBundle
}

// §4 — Personal & HR key-value table.
const PersonalHrCard = ({ bundle }: PersonalHrCardProps) => {
  const { dietitian: d, details } = bundle
  const printing = details.printingChargePerCamp ?? 150

  const rows: [string, string][] = [
    ['Email', details.email || d.email || '—'],
    ['Phone', details.phone || d.phone || '—'],
    ['HQ', d.hq || '—'],
    ['States covered', d.states?.length ? d.states.join(', ') : '—'],
    ['Specialty', d.specialty || '—'],
    ['PAN', details.pan || d.pan || '—'],
    ['Aadhar', details.aadhar || d.aadhar || '—'],
    ['Rate/camp default', `₹${d.ratePerCamp || 0}`],
    ['Printing/camp', `₹${printing}`],
  ]

  return (
    <div className="rounded-xl border p-3.5 h-full" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide mb-2.5" style={{ color: 'var(--qms-text-soft)' }}>
        <FiUser size={13} /> Personal &amp; HR
      </div>
      <div className="grid gap-y-1.5 text-[13px]" style={{ gridTemplateColumns: '140px 1fr' }}>
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <div style={{ color: 'var(--qms-text-muted)' }}>{k}</div>
            <div style={{ color: 'var(--qms-text)' }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PersonalHrCard
