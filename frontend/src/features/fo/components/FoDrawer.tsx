import { FiMessageCircle, FiPhone, FiRefreshCw } from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import type { FoClaim } from '@/features/fo/fo.types'
import SideDrawer from '@/components/ui/SideDrawer'
import { Button } from '@/components/ui/button'
import KpiTile from '@/components/ui/KpiTile'
import { FiCheckCircle, FiCalendar, FiStar, FiCpu } from 'react-icons/fi'
import { formatINR, formatDate } from '@/utils/formatters'
import {
  initials, avatarGradient, foLiveStatus, STATUS_LABEL, personCamps,
  closedCampsOf, upcomingCampsOf, avgFeedback, stubWhatsApp, stubCall, stubReassign,
} from '@/features/fo/components/fo.ui'

interface FoDrawerProps {
  fo: Person | null
  camps: Camp[]
  devices: DeviceCatalogItem[]
  claims: FoClaim[]
  onClose: () => void
}

const FoDrawer = ({ fo, camps, devices, claims, onClose }: FoDrawerProps) => {
  if (!fo) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  const myCamps = personCamps(fo, camps)
  const closed = closedCampsOf(myCamps)
  const upcoming = upcomingCampsOf(myCamps)
  const fb = avgFeedback(myCamps) || (fo.feedbackAvg ?? 0)
  const status = foLiveStatus(fo, camps)
  const myClaims = claims.filter((c) => c.foId === fo.id)
  const deviceNames = (fo.machinesAssigned ?? []).map((id) => devices.find((d) => d.id === id)?.name ?? id)

  return (
    <SideDrawer open title={fo.name} onClose={onClose} widthClassName="max-w-lg">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-[16px] shrink-0" style={{ background: avatarGradient(fo) }}>
            {initials(fo.name)}
          </div>
          <div className="min-w-0">
            <div className="text-[16px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{fo.name}</div>
            <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{fo.hq} · {(fo.states ?? []).join(', ')} · {STATUS_LABEL[status]}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <KpiTile label="Closed camps" value={String(closed.length)} tone="brand" icon={FiCheckCircle} />
          <KpiTile label="Upcoming" value={String(upcoming.length)} tone="teal" icon={FiCalendar} />
          <KpiTile label="Occupancy" value={`${fo.occupancyPct ?? '—'}%`} sub="vs target 85%" tone="amber" icon={FiCheckCircle} />
          <KpiTile label="Feedback" value={fb > 0 ? fb.toFixed(1) : '—'} tone="violet" icon={FiStar} />
        </div>

        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)' }}>
          <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--qms-text-muted)' }}>Personal &amp; HR</div>
          <dl className="text-[13px] space-y-1.5">
            {([
              ['Joined', formatDate(fo.joined)],
              ['PAN', fo.panMasked ?? '—'],
              ['Aadhar', fo.aadharMasked ?? '—'],
              ['Salary', fo.salaryInr ? formatINR(fo.salaryInr) + '/mo' : '—'],
              ['DA rule', fo.daRule ?? '—'],
              ['TA rule', fo.taRule ?? '—'],
              ['Permanent address', fo.permanentAddress ?? '—'],
              ['Temporary address', fo.temporaryAddress ?? '—'],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt style={{ color: 'var(--qms-text-muted)' }}>{k}</dt>
                <dd className="text-right truncate" style={{ color: 'var(--qms-text)' }}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)' }}>
          <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--qms-text-muted)' }}>Devices</div>
          {deviceNames.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {deviceNames.map((d, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
                  <FiCpu size={10} /> {d}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No devices handed over.</div>
          )}
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)' }}>
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>Upcoming camps</div>
          <table className="w-full text-[12px]">
            <tbody>
              {upcoming.slice(0, 10).map((c) => (
                <tr key={c.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-3 py-1.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{c.id}</td>
                  <td className="px-3 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(c.date)}</td>
                  <td className="px-3 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{c.city}</td>
                </tr>
              ))}
              {upcoming.length === 0 && (
                <tr><td className="px-3 py-3 text-center" style={{ color: 'var(--qms-text-muted)' }}>No upcoming camps.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {myClaims.length > 0 && (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)' }}>
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>TA/DA claims</div>
            <table className="w-full text-[12px]">
              <tbody>
                {myClaims.slice(0, 5).map((c) => (
                  <tr key={c.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                    <td className="px-3 py-1.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{c.id}</td>
                    <td className="px-3 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{c.type}</td>
                    <td className="px-3 py-1.5" style={{ color: 'var(--qms-text)' }}>{formatINR(c.amount)}</td>
                    <td className="px-3 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => stubWhatsApp(fo.name)}><FiMessageCircle size={13} /> WhatsApp</Button>
          <Button variant="outline" size="sm" onClick={() => stubCall(fo.name)}><FiPhone size={13} /> Call</Button>
          <Button variant="outline" size="sm" onClick={() => stubReassign(fo.name)}><FiRefreshCw size={13} /> Reassign</Button>
          <Button size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </SideDrawer>
  )
}

export default FoDrawer
