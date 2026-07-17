import { useMemo, useState } from 'react'
import { FiUserPlus, FiEye, FiEdit3, FiCheck, FiX, FiPhone, FiMail, FiMapPin } from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import type { FoEnrollment, DietitianEnrollment, RosterEntry } from '@/features/om/om.types'
import type { useOm } from '@/features/om/hooks/useOm'
import { foRoster, dietitianRoster } from '@/features/om/om.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import SideDrawer from '@/components/ui/SideDrawer'

interface RosterTabProps {
  mode: 'Screening' | 'Diet'
  fos: Person[]
  dietitians: Person[]
  devices: DeviceCatalogItem[]
  om: ReturnType<typeof useOm>
}

const STATUS_COLOR: Record<string, string> = {
  ENROLLED: '#10b981', APPROVED: '#0ea5e9', PENDING: '#f59e0b', REJECTED: '#f43f5e', SUBMITTED: '#0ea5e9',
}

function initials(name: string) { return name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() }
function stringToColor(s: string) {
  const palette = ['#3b6dff', '#a855f7', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#14b8a6', '#7c5cff', '#f43f5e', '#84cc16']
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

// Mirrors tabFos() exactly (om-portal.js:750-801) plus its Enroll/Fill-details/
// Details-drawer/Approve/Reject actions (om-portal.js:809-938) — the real
// FO/Dietitian roster + enrollment pipeline, used for Diet's "Dietitian
// Management" tab and Screening's "FO Onboarding" tab (both render tabFos in
// the prototype; Screening's own "FO Management" tab instead iframe-embeds
// fo.html, a pattern this project deliberately does NOT replicate).
const RosterTab = ({ mode, fos, dietitians, devices, om }: RosterTabProps) => {
  const isDiet = mode === 'Diet'
  const subjLabel = isDiet ? 'dietitian' : 'field officer'
  const title = isDiet ? 'Dietitian management' : 'Field Officer management'
  const enrollLabel = isDiet ? 'Enroll new dietitian' : 'Enroll new FO'

  const roster = useMemo(
    () => (isDiet
      ? dietitianRoster(dietitians, om.dietEnrollments, om.foDetailsOverlay)
      : foRoster(fos, om.foEnrollments, om.foDetailsOverlay)),
    [isDiet, dietitians, fos, om.dietEnrollments, om.foEnrollments, om.foDetailsOverlay]
  )
  const pendingCount = roster.filter((f) => f.status === 'PENDING').length

  const [enrollOpen, setEnrollOpen] = useState(false)
  const [detailsFor, setDetailsFor] = useState<RosterEntry | null>(null)
  const [viewFor, setViewFor] = useState<RosterEntry | null>(null)

  // Enroll form state
  const [enName, setEnName] = useState('')
  const [enPhone, setEnPhone] = useState('')
  const [enEmail, setEnEmail] = useState('')
  const [enHq, setEnHq] = useState('')
  const [enStates, setEnStates] = useState('')
  const [enSpec, setEnSpec] = useState('')
  const [enRate, setEnRate] = useState('3000')

  // Fill-details form state
  const [fdPhone, setFdPhone] = useState('')
  const [fdEmail, setFdEmail] = useState('')
  const [fdHq, setFdHq] = useState('')
  const [fdStates, setFdStates] = useState('')
  const [fdSpec, setFdSpec] = useState('')
  const [fdRate, setFdRate] = useState('3000')
  const [fdPan, setFdPan] = useState('')
  const [fdAadhar, setFdAadhar] = useState('')
  const [fdAddress, setFdAddress] = useState('')

  const openFillDetails = (f: RosterEntry) => {
    setDetailsFor(f)
    setFdPhone(f.phone); setFdEmail(f.email); setFdHq(f.hq); setFdStates(f.states.join(', '))
    setFdSpec(f.specialty ?? ''); setFdRate(String(f.ratePerCamp ?? 3000))
    setFdPan(f.pan ?? ''); setFdAadhar(f.aadhar ?? ''); setFdAddress(f.address ?? '')
  }

  const handleSaveEnroll = () => {
    if (!enName.trim()) return
    const states = enStates.split(',').map((s) => s.trim()).filter(Boolean)
    if (isDiet) {
      om.addDietEnrollment({ name: enName, phone: enPhone, email: enEmail, hq: enHq, states, specialty: enSpec || 'Clinical nutrition', ratePerCamp: Number(enRate) || 3000 })
    } else {
      om.addFoEnrollment({ name: enName, phone: enPhone, email: enEmail, hq: enHq, states })
    }
    setEnName(''); setEnPhone(''); setEnEmail(''); setEnHq(''); setEnStates(''); setEnSpec(''); setEnRate('3000')
    setEnrollOpen(false)
  }

  const handleSaveDetails = () => {
    if (!detailsFor) return
    const states = fdStates.split(',').map((s) => s.trim()).filter(Boolean)
    if (detailsFor.real) {
      om.saveRealPersonDetails(detailsFor.id, { phone: fdPhone, email: fdEmail, hq: fdHq, pan: fdPan, aadhar: fdAadhar, address: fdAddress })
    } else if (isDiet) {
      om.saveDietDetails(detailsFor.id, { phone: fdPhone, email: fdEmail, hq: fdHq, states, specialty: fdSpec || 'Clinical nutrition', ratePerCamp: Number(fdRate) || 3000, pan: fdPan, aadhar: fdAadhar, address: fdAddress } as Partial<DietitianEnrollment>)
    } else {
      om.saveFoDetails(detailsFor.id, { phone: fdPhone, email: fdEmail, hq: fdHq, states, pan: fdPan, aadhar: fdAadhar, address: fdAddress } as Partial<FoEnrollment>)
    }
    setDetailsFor(null)
  }

  const handleApprove = (f: RosterEntry) => {
    if (!f.detailsComplete) return
    if (isDiet) om.submitDietitianForInterview(f.id)
    else om.approveFoEnroll(f.id)
  }

  const handleReject = (f: RosterEntry) => {
    if (!window.confirm(`Reject this ${subjLabel} enrollment application?`)) return
    if (isDiet) om.omInterviewDecision(f.id, 'REJECTED', 'Rejected at roster stage', 'Ops Manager')
    else om.rejectFoEnroll(f.id)
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 rounded-xl border p-3.5 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div>
          <div className="text-[14px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{title}</div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
            {roster.length} {isDiet ? 'dietitians' : 'FOs'} · {pendingCount} pending enrollment · fill details &amp; approve
          </div>
        </div>
        <Button onClick={() => setEnrollOpen(true)}><FiUserPlus size={13} /> {enrollLabel}</Button>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {[isDiet ? 'Dietitian' : 'Field Officer', 'HQ · States', 'Contact', 'Status', 'Details', ''].map((h) => (
                  <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roster.map((f) => (
                <tr key={f.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0" style={{ background: stringToColor(f.name) }}>{initials(f.name)}</div>
                      <div className="min-w-0">
                        <div className="font-bold truncate" style={{ color: 'var(--qms-text)' }}>{f.name}</div>
                        <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                          {f.id}{f.real ? ` · ${subjLabel}` : ' · applicant'}{isDiet && f.specialty ? ` · ${f.specialty}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div style={{ color: 'var(--qms-text-soft)' }}>{f.hq || '—'}</div>
                    <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{f.states.join(', ')}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-[12px]" style={{ color: 'var(--qms-text-soft)' }}>{f.phone || '—'}</div>
                    <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{f.email}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${STATUS_COLOR[f.status]}22`, color: STATUS_COLOR[f.status] }}>{f.status}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: f.detailsComplete ? 'var(--success-soft)' : 'var(--danger-soft)', color: f.detailsComplete ? 'var(--success)' : 'var(--danger)' }}>
                      {f.detailsComplete ? <FiCheck size={9} /> : <FiX size={9} />} {f.detailsComplete ? 'DETAILS OK' : 'DETAILS PENDING'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1.5 whitespace-nowrap">
                      {f.real ? (
                        <Button size="sm" variant="outline" onClick={() => setViewFor(f)}><FiEye size={12} /> View</Button>
                      ) : f.status === 'PENDING' ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openFillDetails(f)}><FiEdit3 size={12} /> Fill details</Button>
                          <Button size="sm" onClick={() => handleApprove(f)} disabled={!f.detailsComplete}><FiCheck size={12} /> Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReject(f)}><FiX size={12} /></Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => openFillDetails(f)}><FiEdit3 size={12} /> Details</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {roster.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No {isDiet ? 'dietitians' : 'FOs'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enroll new */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{isDiet ? 'Enroll new Dietitian' : 'Enroll new Field Officer'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Full name *</label>
              <Input value={enName} onChange={(e) => setEnName(e.target.value)} placeholder={isDiet ? 'Dr Anita Sharma' : 'Ravi Sharma'} />
            </div>
            <div><label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Phone</label><Input value={enPhone} onChange={(e) => setEnPhone(e.target.value)} /></div>
            <div><label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Email</label><Input value={enEmail} onChange={(e) => setEnEmail(e.target.value)} /></div>
            <div><label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>HQ city</label><Input value={enHq} onChange={(e) => setEnHq(e.target.value)} /></div>
            <div><label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>States (comma-separated)</label><Input value={enStates} onChange={(e) => setEnStates(e.target.value)} placeholder="MH, GJ" /></div>
            {isDiet && (
              <>
                <div><label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Specialty</label><Input value={enSpec} onChange={(e) => setEnSpec(e.target.value)} placeholder="Clinical nutrition / Diabetes" /></div>
                <div><label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Rate per camp (₹)</label><Input type="number" min={0} value={enRate} onChange={(e) => setEnRate(e.target.value)} /></div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>Cancel</Button>
            <Button disabled={!enName.trim()} onClick={handleSaveEnroll}><FiUserPlus size={13} /> Add to pipeline</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fill / edit details */}
      <Dialog open={!!detailsFor} onOpenChange={(o) => !o && setDetailsFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{isDiet ? 'Dietitian' : 'FO'} details — {detailsFor?.name}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div><label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Phone</label><Input value={fdPhone} onChange={(e) => setFdPhone(e.target.value)} /></div>
            <div><label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Email</label><Input value={fdEmail} onChange={(e) => setFdEmail(e.target.value)} /></div>
            <div><label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>HQ city</label><Input value={fdHq} onChange={(e) => setFdHq(e.target.value)} /></div>
            <div><label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>States</label><Input value={fdStates} onChange={(e) => setFdStates(e.target.value)} /></div>
            {isDiet && (
              <>
                <div><label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Specialty</label><Input value={fdSpec} onChange={(e) => setFdSpec(e.target.value)} /></div>
                <div><label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Rate per camp (₹)</label><Input type="number" value={fdRate} onChange={(e) => setFdRate(e.target.value)} /></div>
              </>
            )}
            <div><label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>PAN (masked)</label><Input value={fdPan} onChange={(e) => setFdPan(e.target.value)} placeholder="XXXXX1234A" /></div>
            <div><label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Aadhar (masked)</label><Input value={fdAadhar} onChange={(e) => setFdAadhar(e.target.value)} placeholder="XXXX-XXXX-1234" /></div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Address</label>
              <Textarea value={fdAddress} onChange={(e) => setFdAddress(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsFor(null)}>Cancel</Button>
            <Button onClick={handleSaveDetails}>Save details</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View drawer (real staff) */}
      <SideDrawer open={!!viewFor} title={viewFor ? `${isDiet ? 'Dietitian' : 'FO'} · ${viewFor.name}` : ''} onClose={() => setViewFor(null)}>
        {viewFor && (
          <div className="space-y-3">
            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ background: stringToColor(viewFor.name) }}>{initials(viewFor.name)}</div>
                <div>
                  <div className="text-[15px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{viewFor.name}</div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{viewFor.id} · {viewFor.status}{isDiet && viewFor.specialty ? ` · ${viewFor.specialty}` : ''}</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)' }}>
              <div className="text-[11px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Contact &amp; base</div>
              <div className="text-[13px] flex items-center gap-1.5 mb-0.5" style={{ color: 'var(--qms-text)' }}><FiPhone size={12} /> {viewFor.phone || '—'}</div>
              <div className="text-[13px] flex items-center gap-1.5 mb-0.5" style={{ color: 'var(--qms-text)' }}><FiMail size={12} /> {viewFor.email || '—'}</div>
              <div className="text-[13px] flex items-center gap-1.5" style={{ color: 'var(--qms-text)' }}><FiMapPin size={12} /> {viewFor.hq || '—'} · {viewFor.states.join(', ')}</div>
            </div>
            {isDiet && (
              <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)' }}>
                <div className="text-[11px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Remuneration</div>
                <div className="text-lg font-extrabold" style={{ color: 'var(--qms-text)' }}>₹{(viewFor.ratePerCamp ?? 3000).toLocaleString('en-IN')} <span className="text-[11px] font-medium" style={{ color: 'var(--qms-text-muted)' }}>/ camp</span></div>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Plus travel reimbursement per camp · approved by OM · Diet</div>
              </div>
            )}
            {!isDiet && (
              <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)' }}>
                <div className="text-[11px] mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Performance</div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[`${viewFor.campsPerDay ?? 2} camps/day`, `Occupancy ${viewFor.occupancyPct ?? '—'}%`, `Efficiency ${viewFor.efficiencyPct ?? '—'}%`, `Feedback ${viewFor.feedbackAvg ?? '—'}`].map((chip) => (
                    <span key={chip} className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>{chip}</span>
                  ))}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                  Devices: {(viewFor.machinesAssigned ?? []).map((id) => devices.find((d) => d.id === id)?.name ?? id).join(', ') || 'none'}
                </div>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => { const f = viewFor; setViewFor(null); if (f) openFillDetails(f) }}>
              <FiEdit3 size={12} /> Edit details
            </Button>
          </div>
        )}
      </SideDrawer>
    </div>
  )
}

export default RosterTab
