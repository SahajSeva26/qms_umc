import type { Incident, MachineFlag } from '@/features/fo/fo.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import { suggestReplacement } from '@/features/fo/fo.service'
import { Button } from '@/components/ui/button'
import { FiCheck } from 'react-icons/fi'
import { fmtDt } from './incidents.ui'

interface FaultyMachinesTabProps {
  flags: MachineFlag[]
  devices: DeviceCatalogItem[]
  incidents: Incident[]
  onOpenTicket: (incident: Incident) => void
  onClearFlag: (flag: MachineFlag) => void
}

// Faulty machines — mirrors incidents.js's tabMachines(): every device
// currently flagged FAULTY (isMachineFaulty's source of truth, not the
// device catalog's own display-only `faulty` field), the originating
// ticket, a replacement suggestion, and a manual "Clear flag" action.
const FaultyMachinesTab = ({ flags, devices, incidents, onOpenTicket, onClearFlag }: FaultyMachinesTabProps) => {
  const activeFlags = flags.filter((f) => f.faulty && !f.clearedAt)

  return (
    <div className="space-y-3">
      <div className="rounded-xl border p-3.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
        <div className="font-extrabold text-[13px]" style={{ color: 'var(--qms-text)' }}>Faulty machines · allocation blocked</div>
        <div className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>
          {activeFlags.length} device{activeFlags.length === 1 ? '' : 's'} flagged · they're invisible to camp / dedicated assignment until cleared
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                {['Device', 'Status', 'Origin ticket', 'Replacement suggestion', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeFlags.map((f) => {
                const device = devices.find((d) => d.id === f.deviceId)
                const ticket = incidents.find((i) => i.id === f.flaggedByIncidentId)
                const repl = suggestReplacement(f.deviceId, devices)
                return (
                  <tr key={f.deviceId} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                    <td className="px-3 py-2 align-top">
                      <div className="font-extrabold" style={{ color: 'var(--qms-text)' }}>{device?.name ?? f.deviceId}</div>
                      <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{f.deviceId} · {device?.type ?? '—'}</div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wide" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>FAULTY</span>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>since {fmtDt(f.flaggedAt)}</div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {ticket ? (
                        <button onClick={() => onOpenTicket(ticket)} className="text-left hover:underline" style={{ color: 'var(--qms-brand)' }}>
                          <div>{ticket.id}</div>
                          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{ticket.title}</div>
                        </button>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {repl ? (
                        <div>
                          <div className="font-bold" style={{ color: 'var(--qms-text)' }}>{repl.name}</div>
                          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{repl.id}</div>
                        </div>
                      ) : <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>No same-type replacement</span>}
                    </td>
                    <td className="px-3 py-2 align-top text-right">
                      <Button size="sm" variant="outline" onClick={() => onClearFlag(f)}>
                        <FiCheck size={13} /> Clear flag
                      </Button>
                    </td>
                  </tr>
                )
              })}
              {activeFlags.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-[12px]" style={{ color: 'var(--success)' }}>
                    ✓ No faulty machines — every device is available for allocation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default FaultyMachinesTab
