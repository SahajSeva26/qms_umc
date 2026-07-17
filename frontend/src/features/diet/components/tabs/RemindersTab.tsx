import type { Camp } from '@/types/camp.types'
import type { CampReminderLog, ReminderRecipient, ReminderWindow } from '@/features/diet/diet.types'
import type { useDietCamps } from '@/features/diet/hooks/useDietCamps'
import { clientName } from '@/types/campref.types'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/utils/formatters'

interface RemindersTabProps {
  camps: Camp[]
  reminders: Record<string, CampReminderLog>
  viewOnly: boolean
  diet: ReturnType<typeof useDietCamps>
}

const WINDOWS: ReminderWindow[] = ['T48', 'T24', 'T2']
const RECIPIENTS: ReminderRecipient[] = ['FO', 'DIETITIAN', 'LABTECH', 'MANPOWER', 'DOCTOR']

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'var(--qms-text-muted)',
  SENT: '#0ea5e9',
  CONFIRMED: 'var(--success)',
  DECLINED: 'var(--danger)',
  NO_RESPONSE: 'var(--warning)',
}

function emptyLog(): CampReminderLog {
  const empty = () => ({ FO: 'PENDING', DIETITIAN: 'PENDING', LABTECH: 'PENDING', MANPOWER: 'PENDING', DOCTOR: 'PENDING' } as CampReminderLog['T48'])
  return { T48: empty(), T24: empty(), T2: empty() }
}

// Mirrors the reminder grid — every non-final camp gets a 3-window × 5-recipient
// matrix (diet-camps.js:1219-1236); "Send all" bulk-flips PENDING→SENT only.
const RemindersTab = ({ camps, reminders, viewOnly, diet }: RemindersTabProps) => {
  const eligible = camps.filter((c) => c.status !== 'CLOSED' && c.status !== 'CANCELLED' && c.status !== 'CANCELLED_CHARGED')

  return (
    <div className="space-y-3">
      {eligible.map((camp) => {
        const log = reminders[camp.id] ?? emptyLog()
        return (
          <div key={camp.id} className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{camp.id}</div>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{clientName(camp.clientId)} · {formatDate(camp.date)}</div>
              </div>
              {!viewOnly && (
                <Button size="sm" variant="outline" onClick={() => diet.sendAllReminders(camp.id)}>Send all (WhatsApp + AI call)</Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="text-[11px] w-full">
                <thead>
                  <tr>
                    <th className="text-left px-2 py-1" style={{ color: 'var(--qms-text-muted)' }}></th>
                    {WINDOWS.map((w) => <th key={w} className="text-center px-2 py-1 font-semibold" style={{ color: 'var(--qms-text-muted)' }}>{w}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {RECIPIENTS.map((who) => (
                    <tr key={who}>
                      <td className="px-2 py-1 font-semibold" style={{ color: 'var(--qms-text)' }}>{who}</td>
                      {WINDOWS.map((w) => (
                        <td key={w} className="text-center px-2 py-1">
                          <button
                            disabled={viewOnly}
                            onClick={() => diet.setConfirmation(camp.id, w, who, log[w][who] === 'PENDING' ? 'SENT' : 'CONFIRMED')}
                            className="font-bold"
                            style={{ color: STATUS_COLOR[log[w][who]] }}
                          >
                            {log[w][who]}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
      {eligible.length === 0 && (
        <p className="text-[13px] text-center py-8" style={{ color: 'var(--qms-text-muted)' }}>No active camps need reminders.</p>
      )}
    </div>
  )
}

export default RemindersTab
