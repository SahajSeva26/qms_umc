import { FiMessageCircle, FiPhone, FiCheckCircle, FiCalendar, FiXCircle, FiStar, FiDollarSign, FiFileText, FiClock, FiCpu } from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import type { FoClaim } from '@/features/fo/fo.types'
import type { EmpTypeConfig } from '@/features/fo/components/fo.ui'
import SideDrawer from '@/components/ui/SideDrawer'
import { Button } from '@/components/ui/button'
import KpiTile from '@/components/ui/KpiTile'
import { formatINR, formatDate } from '@/utils/formatters'
import {
  initials, avatarGradient, personCamps, upcomingCampsOf,
  cancelledCampsOf, avgFeedback, stubWhatsApp, stubCall,
} from '@/features/fo/components/fo.ui'

interface PersonnelProfileDrawerProps {
  person: Person | null
  people: Person[]
  camps: Camp[]
  devices: DeviceCatalogItem[]
  claims: FoClaim[]
  config: EmpTypeConfig
  salesView: boolean
  onClose: () => void
}

const PersonnelProfileDrawer = ({ person, people, camps, devices, claims, config, salesView, onClose }: PersonnelProfileDrawerProps) => {
  if (!person) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  const myCamps = personCamps(person, camps)
  const upcoming = upcomingCampsOf(myCamps)
  const cancelled = cancelledCampsOf(myCamps)
  // Camps this specific FO cancelled (vs. the aggregate cancelled-count KPI
  // above) — exact port of the prototype's cancelledByFo filter.
  const cancelledByFo = cancelled.filter((c) =>
    /^FO/i.test(c.cancelledBy || '') || c.cancelledBy === person.id || c.cancelledBy === person.name
  )
  const reportsToName = people.find((p) => p.id === person.reportsTo)?.name ?? '—'
  const fb = avgFeedback(myCamps) || (person.feedbackAvg ?? 0)
  const myClaims = claims.filter((c) => c.foId === person.id)
  const pendingClaims = myClaims.filter((c) => c.status === 'PENDING' || c.status === 'SUBMITTED')
  const paidClaims = myClaims.filter((c) => c.status === 'APPROVED' || c.status === 'PAID')
  const deviceList = (person.machinesAssigned ?? []).map((id) => devices.find((d) => d.id === id) ?? { id, name: id, category: '—' })

  const salaryRows = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return { month: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), amount: person.salaryInr ?? 0 }
  })

  return (
    <SideDrawer open={!!person} title={config.title} onClose={onClose} widthClassName="max-w-lg">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-[16px] shrink-0" style={{ background: avatarGradient(person) }}>
            {initials(person.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{person.name}</div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,109,255,.12)', color: 'var(--qms-brand)' }}>{config.label}</span>
              {person.vendor && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>{person.vendor}</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <KpiTile label="Camps total" value={String(myCamps.length)} tone="brand" icon={FiCheckCircle} />
          <KpiTile label="Live/upcoming" value={String(upcoming.length)} tone="teal" icon={FiCalendar} />
          {!salesView && (
            <>
              <KpiTile label="Cancelled" value={String(cancelled.length)} sub={`${cancelledByFo.length} by FO`} tone="rose" icon={FiXCircle} />
              <KpiTile label="Feedback" value={fb > 0 ? fb.toFixed(1) : '—'} tone="violet" icon={FiStar} />
              <KpiTile label="Salary" value={person.salaryInr ? formatINR(person.salaryInr) : '—'} sub="/month" tone="amber" icon={FiDollarSign} />
              <KpiTile label="TA-DA pending" value={formatINR(pendingClaims.reduce((s, c) => s + c.amount, 0))} tone="amber" icon={FiFileText} />
              <KpiTile label="TA-DA paid" value={formatINR(paidClaims.reduce((s, c) => s + c.amount, 0))} tone="emerald" icon={FiFileText} />
              <KpiTile label="Leaves" value="0" tone="brand" icon={FiClock} />
            </>
          )}
          <KpiTile label="Assets" value={String(deviceList.length)} tone="teal" icon={FiCpu} />
        </div>

        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)' }}>
          <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--qms-text-muted)' }}>Personal &amp; HR</div>
          <dl className="text-[13px] space-y-1.5">
            <div className="flex justify-between gap-3">
              <dt style={{ color: 'var(--qms-text-muted)' }}>Phone</dt>
              <dd className="text-right truncate" style={{ color: 'var(--qms-text)' }}>{person.phone || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt style={{ color: 'var(--qms-text-muted)' }}>Email</dt>
              <dd className="text-right truncate" style={{ color: 'var(--qms-text)' }}>{person.email || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt style={{ color: 'var(--qms-text-muted)' }}>HQ</dt>
              <dd className="text-right truncate" style={{ color: 'var(--qms-text)' }}>{person.hq || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt style={{ color: 'var(--qms-text-muted)' }}>Joined</dt>
              <dd className="text-right truncate" style={{ color: 'var(--qms-text)' }}>{formatDate(person.joined)}</dd>
            </div>
            {config.vendor && (
              <div className="flex justify-between gap-3">
                <dt style={{ color: 'var(--qms-text-muted)' }}>Vendor / Agency</dt>
                <dd className="text-right truncate" style={{ color: 'var(--qms-text)' }}>{person.vendor || '—'}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt style={{ color: 'var(--qms-text-muted)' }}>Reports to</dt>
              <dd className="text-right truncate" style={{ color: 'var(--qms-text)' }}>{reportsToName}</dd>
            </div>
            {!salesView && (
              <>
                <div className="flex justify-between gap-3">
                  <dt style={{ color: 'var(--qms-text-muted)' }}>PAN</dt>
                  <dd className="text-right truncate" style={{ color: 'var(--qms-text)' }}>{person.panMasked ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt style={{ color: 'var(--qms-text-muted)' }}>Aadhar</dt>
                  <dd className="text-right truncate" style={{ color: 'var(--qms-text)' }}>{person.aadharMasked ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt style={{ color: 'var(--qms-text-muted)' }}>Permanent address</dt>
                  <dd className="text-right truncate" style={{ color: 'var(--qms-text)' }}>{person.permanentAddress ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt style={{ color: 'var(--qms-text-muted)' }}>Temporary address</dt>
                  <dd className="text-right truncate" style={{ color: 'var(--qms-text)' }}>{person.temporaryAddress ?? '—'}</dd>
                </div>
              </>
            )}
            <div className="flex justify-between gap-3">
              <dt style={{ color: 'var(--qms-text-muted)' }}>Camps / day target</dt>
              <dd className="text-right truncate" style={{ color: 'var(--qms-text)' }}>{person.campsPerDay || 0}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)' }}>
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>Camp execution</div>
          <table className="w-full text-[12px]">
            <tbody>
              {myCamps.slice(0, 25).map((c) => (
                <tr key={c.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-3 py-1.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{c.id}</td>
                  <td className="px-3 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(c.date)}</td>
                  <td className="px-3 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{c.city}</td>
                  <td className="px-3 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{c.status}</td>
                </tr>
              ))}
              {myCamps.length === 0 && (
                <tr><td className="px-3 py-3 text-center" style={{ color: 'var(--qms-text-muted)' }}>No camps executed yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {!salesView && cancelledByFo.length > 0 && (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)' }}>
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>Camps cancelled by this FO ({cancelledByFo.length})</div>
            <table className="w-full text-[12px]">
              <thead>
                <tr>
                  {['ID', 'Date', 'City', 'Status', 'Cancelled at'].map((h) => (
                    <th key={h} className="text-left px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cancelledByFo.map((c) => (
                  <tr key={c.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                    <td className="px-3 py-1.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{c.id}</td>
                    <td className="px-3 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(c.date)}</td>
                    <td className="px-3 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{c.city || '—'}</td>
                    <td className="px-3 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{c.status}</td>
                    <td className="px-3 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{c.cancelledAt ? formatDate(c.cancelledAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!salesView && (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)' }}>
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>Salary (last 6 months)</div>
            <table className="w-full text-[12px]">
              <tbody>
                {salaryRows.map((r) => (
                  <tr key={r.month} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                    <td className="px-3 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{r.month}</td>
                    <td className="px-3 py-1.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{formatINR(r.amount)}</td>
                    <td className="px-3 py-1.5 text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>PAID</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!salesView && (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)' }}>
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>TA/DA claims</div>
            <table className="w-full text-[12px]">
              <tbody>
                {myClaims.map((c) => (
                  <tr key={c.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                    <td className="px-3 py-1.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{c.id}</td>
                    <td className="px-3 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{c.type}</td>
                    <td className="px-3 py-1.5" style={{ color: 'var(--qms-text)' }}>{formatINR(c.amount)}</td>
                    <td className="px-3 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{c.status}</td>
                  </tr>
                ))}
                {myClaims.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-3 text-center" style={{ color: 'var(--qms-text-muted)' }}>No claims filed.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!salesView && (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)' }}>
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>Leaves</div>
            <div className="px-3 py-3 text-center text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No leaves logged.</div>
          </div>
        )}

        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)' }}>
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>Devices</div>
          <table className="w-full text-[12px]">
            <thead>
              <tr>
                {['Type', 'Name', 'Model'].map((h) => (
                  <th key={h} className="text-left px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deviceList.map((d) => (
                <tr key={d.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-3 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{d.category}</td>
                  <td className="px-3 py-1.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{d.name}</td>
                  <td className="px-3 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{d.id}</td>
                </tr>
              ))}
              {deviceList.length === 0 && (
                <tr><td colSpan={3} className="px-3 py-3 text-center" style={{ color: 'var(--qms-text-muted)' }}>No devices handed over.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => stubWhatsApp(person.name)}><FiMessageCircle size={13} /> WhatsApp</Button>
          <Button variant="outline" size="sm" onClick={() => stubCall(person.name)}><FiPhone size={13} /> Call</Button>
          <Button size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </SideDrawer>
  )
}

export default PersonnelProfileDrawer
