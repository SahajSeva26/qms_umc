import { useState } from 'react'
import { FiCheck, FiChevronLeft, FiChevronRight, FiSave, FiVideo } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { CLIENTS, DIVISIONS } from '@/types/client.types'
import { SLOTS } from '@/types/camp.types'
import { useProjectsDataShared } from '@/hooks/useProjectsDataShared'
import { usePeopleData } from '@/hooks/usePeopleData'
import { DOCTORS, CAMP_TYPES } from '@/features/camps/camps.mock'
import type { CampType } from '@/types/camp.types'

interface CampWizardProps {
  open: boolean
  onClose: () => void
}

// Invented list (prototype's C.SPECIALTIES) — matches the specialties already
// present across camps.mock.ts's DOCTORS records plus a catch-all.
const SPECIALTIES = ['Cardiologist', 'Endocrinologist', 'GP', 'Orthopedic', 'Pulmonologist', 'Neurologist', 'Gynecologist', 'Others']

const NEW_DOCTOR_VALUE = '__new__'
const TODAY_ISO = new Date().toISOString().slice(0, 10)

interface NewDoctorDraft {
  code: string
  name: string
  specialty: string
  phone: string
  city: string
  state: string
  pincode: string
  email: string
  gmap: string
}

const emptyNewDoctor: NewDoctorDraft = { code: '', name: '', specialty: SPECIALTIES[0], phone: '', city: '', state: '', pincode: '', email: '', gmap: '' }

const STEPS = ['Doctor', 'Project & Type', 'Slot & FO', 'Devices & Confirm']

const CampWizard = ({ open, onClose }: CampWizardProps) => {
  const { projects } = useProjectsDataShared()
  const { people: fos } = usePeopleData('Field Officer')
  const { devices } = usePeopleData()

  const [step, setStep] = useState(0)

  const [doctorId, setDoctorId] = useState('')
  const [newDoctor, setNewDoctor] = useState<NewDoctorDraft>(emptyNewDoctor)

  const [clientId, setClientId] = useState(CLIENTS[0]?.id ?? '')
  const [divisionId, setDivisionId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [mrName, setMrName] = useState('')
  const [asmName] = useState('') // auto-derived once MR master data exists
  const [rsmRegion] = useState('') // auto-derived once MR master data exists
  const [type, setType] = useState<CampType>('Screening')
  const [teleConsult, setTeleConsult] = useState(false)
  const [teleChannel, setTeleChannel] = useState<'VIDEO' | 'IVR'>('VIDEO')
  const [patientsExpected, setPatientsExpected] = useState(50)

  const [date, setDate] = useState(TODAY_ISO)
  const [slot, setSlot] = useState(SLOTS[1]?.id ?? SLOTS[0]?.id ?? '')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [foId, setFoId] = useState('')

  const [devicesAllocated, setDevicesAllocated] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [consentUrl, setConsentUrl] = useState('')

  const resetAndClose = () => {
    setStep(0)
    setDoctorId('')
    setNewDoctor(emptyNewDoctor)
    setClientId(CLIENTS[0]?.id ?? '')
    setDivisionId('')
    setProjectId('')
    setMrName('')
    setType('Screening')
    setTeleConsult(false)
    setTeleChannel('VIDEO')
    setPatientsExpected(50)
    setDate(TODAY_ISO)
    setSlot(SLOTS[1]?.id ?? SLOTS[0]?.id ?? '')
    setCity('')
    setState('')
    setFoId('')
    setDevicesAllocated([])
    setNotes('')
    setConsentUrl('')
    onClose()
  }

  const divisionsOf = DIVISIONS.filter((d) => d.clientId === clientId)
  const projectsOf = projects.filter((p) => p.clientId === clientId)

  const handleClientChange = (v: string | null) => {
    setClientId(v ?? '')
    setDivisionId('')
    setProjectId('')
    setMrName('')
  }

  const toggleDevice = (id: string) => {
    setDevicesAllocated((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }

  const handleNext = () => {
    if (step === 0) {
      if (!doctorId) { toast.error('Pick or add a doctor'); return }
      if (doctorId === NEW_DOCTOR_VALUE && !newDoctor.name.trim()) { toast.error('Add at least the doctor name'); return }
    }
    if (step === 1 && !clientId) { toast.error('Pick a client'); return }
    if (step === 2 && date) {
      // TODO: wire the full QMS_BOOKING.evaluate()/isPrivileged() engine from
      // booking-window.js (lead time / window days / monthly cutoff / role
      // bypass) in a later pass. For now, only the back-dated hint below is shown.
      if (date < TODAY_ISO) {
        toast.info('Back-dated camp — for a camp that already took place')
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const handleBack = () => setStep((s) => Math.max(s - 1, 0))

  const handleSave = () => {
    const finalDoctorId = doctorId === NEW_DOCTOR_VALUE ? `doc-${Date.now()}` : doctorId
    const camp = {
      date,
      slot,
      type,
      status: 'CONFIRMED' as const,
      clientId,
      projectId: projectId || null,
      divisionId: divisionId || null,
      mrId: null,
      mrName: mrName || '',
      asmName: asmName || '',
      rsmRegion: rsmRegion || '',
      doctorId: finalDoctorId,
      newDoctor: doctorId === NEW_DOCTOR_VALUE ? newDoctor : null,
      city,
      state,
      foId: foId || '',
      patientsExpected,
      patientsDone: 0,
      devicesAllocated: devicesAllocated.slice(),
      rxCount: 0,
      feedback: 0,
      foRating: 0,
      teleConsult,
      teleChannel: teleConsult ? teleChannel : '',
      consentUrl: consentUrl || '',
      notes: notes || '',
    }
    // eslint-disable-next-line no-console
    console.log('Camp would be booked with shape:', camp)
    toast.success('Camp would be booked here — wiring comes next pass')
    resetAndClose()
  }

  const selectedDoctor = DOCTORS.find((d) => d.id === doctorId)
  const selectedClient = CLIENTS.find((c) => c.id === clientId)
  const selectedSlot = SLOTS.find((s) => s.id === slot)
  const selectedFo = fos.find((f) => f.id === foId)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book new camp</DialogTitle>
        </DialogHeader>

        {/* Step bar */}
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className="rounded-lg border px-2.5 py-2 text-left"
              style={{
                borderColor: step === i ? 'var(--qms-brand)' : 'var(--qms-border)',
                background: step === i ? 'rgba(59,109,255,.06)' : 'var(--qms-surface)',
              }}
            >
              <div className="flex items-center gap-1 text-[10.5px] font-bold" style={{ color: step >= i ? 'var(--qms-brand)' : 'var(--qms-text-muted)' }}>
                <span>{i < step ? <FiCheck size={11} /> : String(i + 1).padStart(2, '0')}</span>
                <span>Step {i + 1}</span>
              </div>
              <div className="text-[11.5px] font-semibold mt-0.5" style={{ color: 'var(--qms-text)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Step 0 — Doctor */}
        {step === 0 && (
          <div className="space-y-3">
            <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Doctor</div>
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Pick from database or add new</label>
              <Select value={doctorId} onValueChange={(v) => setDoctorId(v as string)}>
                <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="— Select doctor —" /></SelectTrigger>
                <SelectContent>
                  {DOCTORS.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name} · {d.specialty} · {d.city}</SelectItem>
                  ))}
                  <SelectItem value={NEW_DOCTOR_VALUE}>+ Add new doctor…</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {doctorId === NEW_DOCTOR_VALUE && (
              <>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Add new doctor:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Pharma doctor code</label>
                    <Input value={newDoctor.code} onChange={(e) => setNewDoctor((p) => ({ ...p, code: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Doctor name</label>
                    <Input value={newDoctor.name} onChange={(e) => setNewDoctor((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Specialty</label>
                    <Select value={newDoctor.specialty} onValueChange={(v) => setNewDoctor((p) => ({ ...p, specialty: v as string }))}>
                      <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Mobile</label>
                    <Input value={newDoctor.phone} onChange={(e) => setNewDoctor((p) => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>City</label>
                    <Input value={newDoctor.city} onChange={(e) => setNewDoctor((p) => ({ ...p, city: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>State</label>
                    <Input value={newDoctor.state} onChange={(e) => setNewDoctor((p) => ({ ...p, state: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Pincode</label>
                    <Input value={newDoctor.pincode} onChange={(e) => setNewDoctor((p) => ({ ...p, pincode: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Email</label>
                    <Input value={newDoctor.email} onChange={(e) => setNewDoctor((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Google Maps link</label>
                    <Input value={newDoctor.gmap} onChange={(e) => setNewDoctor((p) => ({ ...p, gmap: e.target.value }))} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 1 — Project & Type */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Project &amp; type</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Pharma client</label>
                <Select value={clientId} onValueChange={handleClientChange}>
                  <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLIENTS.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Division</label>
                <Select value={divisionId || '__any__'} onValueChange={(v) => { setDivisionId(v === '__any__' ? '' : (v as string)); setMrName('') }}>
                  <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">— Any division —</SelectItem>
                    {divisionsOf.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} · {d.therapy}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Linked project (optional)</label>
                <Select value={projectId || '__standalone__'} onValueChange={(v) => setProjectId(v === '__standalone__' ? '' : (v as string))}>
                  <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__standalone__">— Standalone (no project) —</SelectItem>
                    {projectsOf.map((p) => <SelectItem key={p.id} value={p.id}>{p.id} · {p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Medical Rep (MR) — camp booked on doctor&apos;s behalf</label>
                <Input value={mrName} onChange={(e) => setMrName(e.target.value)} placeholder="MR name" className="text-[13px]" />
              </div>
              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>ASM (auto)</label>
                {/* Populates once MR master data exists — no MR-id-compatible master yet, so this stays empty/readonly. */}
                <Input value={asmName} readOnly placeholder="— select an MR —" className="text-[13px]" style={{ background: 'var(--qms-surface-strong)' }} />
              </div>
              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>RSM region (auto)</label>
                {/* Populates once MR master data exists — no MR-id-compatible master yet, so this stays empty/readonly. */}
                <Input value={rsmRegion} readOnly placeholder="— select an MR —" className="text-[13px]" style={{ background: 'var(--qms-surface-strong)' }} />
              </div>
              <div className="sm:col-span-2 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                ASM &amp; RSM region are derived from the selected MR&apos;s hierarchy.
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Camp type</label>
                <div className="flex flex-wrap gap-2">
                  {CAMP_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className="text-[12px] font-semibold px-3 py-1.5 rounded-full border"
                      style={type === t.id
                        ? { borderColor: t.color, background: `${t.color}1a`, color: t.color }
                        : { borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <label
                className="sm:col-span-2 flex items-center gap-2 cursor-pointer px-2.5 py-2 rounded-lg border"
                style={{ borderColor: 'var(--qms-border)', background: teleConsult ? 'rgba(124,58,237,.06)' : 'transparent' }}
              >
                <input type="checkbox" checked={teleConsult} onChange={(e) => setTeleConsult(e.target.checked)} />
                <FiVideo size={14} style={{ color: '#7c3aed' }} />
                <span className="text-[12.5px] font-semibold" style={{ color: 'var(--qms-text)' }}>Teleconsultation camp</span>
                <span className="text-[11px] ml-auto" style={{ color: 'var(--qms-text-muted)' }}>
                  remote · no physical site{type === 'Diet' ? ' · online nutritional assessment + diet plan' : ''}
                </span>
              </label>

              {teleConsult && (
                <div>
                  <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Delivery channel</label>
                  <Select value={teleChannel} onValueChange={(v) => setTeleChannel(v as 'VIDEO' | 'IVR')}>
                    <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIDEO">Online video call</SelectItem>
                      <SelectItem value="IVR">IVR / telecall</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Patients expected</label>
                <Input type="number" min={1} value={patientsExpected} onChange={(e) => setPatientsExpected(parseInt(e.target.value, 10) || 0)} className="text-[13px]" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Slot & FO */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Slot &amp; FO</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-[13px]" />
                {date && date < TODAY_ISO && (
                  <div className="text-[11px] mt-1" style={{ color: 'var(--warning)' }}>Back-dated camp — for a camp that already took place</div>
                )}
              </div>
              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Time slot</label>
                <Select value={slot} onValueChange={(v) => setSlot(v as string)}>
                  <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SLOTS.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>City</label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} className="text-[13px]" />
              </div>
              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>State</label>
                <Input value={state} onChange={(e) => setState(e.target.value)} className="text-[13px]" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Field Officer</label>
                <Select value={foId || '__auto__'} onValueChange={(v) => setFoId(v === '__auto__' ? '' : (v as string))}>
                  <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__auto__">— Auto-assign later —</SelectItem>
                    {fos.map((f) => <SelectItem key={f.id} value={f.id}>{f.name} · {f.hq || ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Devices & Confirm */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Devices to allocate</div>
            <div className="flex flex-wrap gap-2">
              {devices.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDevice(d.id)}
                  className="text-[12px] font-semibold px-3 py-1.5 rounded-full border"
                  style={devicesAllocated.includes(d.id)
                    ? { borderColor: 'var(--qms-brand)', background: 'rgba(59,109,255,.1)', color: 'var(--qms-brand)' }
                    : { borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
                >
                  {d.name}
                </button>
              ))}
            </div>

            <div className="text-[12px] font-bold uppercase tracking-wide pt-2" style={{ color: 'var(--qms-text-muted)' }}>Review &amp; confirm</div>
            <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1.5 text-[12.5px] rounded-lg border p-3" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}>
              <div style={{ color: 'var(--qms-text-muted)' }}>Doctor</div>
              <div style={{ color: 'var(--qms-text)' }}>{doctorId === NEW_DOCTOR_VALUE ? (newDoctor.name || '— new doctor —') : (selectedDoctor?.name ?? '—')}</div>
              <div style={{ color: 'var(--qms-text-muted)' }}>Client</div>
              <div style={{ color: 'var(--qms-text)' }}>{selectedClient?.name ?? '—'}</div>
              <div style={{ color: 'var(--qms-text-muted)' }}>MR</div>
              <div style={{ color: 'var(--qms-text)' }}>{mrName || '— not set —'}</div>
              <div style={{ color: 'var(--qms-text-muted)' }}>ASM (auto)</div>
              <div style={{ color: 'var(--qms-text)' }}>{asmName || '—'}</div>
              <div style={{ color: 'var(--qms-text-muted)' }}>RSM region (auto)</div>
              <div style={{ color: 'var(--qms-text)' }}>{rsmRegion || '—'}</div>
              <div style={{ color: 'var(--qms-text-muted)' }}>Type</div>
              <div style={{ color: 'var(--qms-text)' }}>{type}</div>
              <div style={{ color: 'var(--qms-text-muted)' }}>Date / slot</div>
              <div style={{ color: 'var(--qms-text)' }}>{date} · {selectedSlot?.label ?? slot}</div>
              <div style={{ color: 'var(--qms-text-muted)' }}>City / state</div>
              <div style={{ color: 'var(--qms-text)' }}>{city || '—'} / {state || '—'}</div>
              <div style={{ color: 'var(--qms-text-muted)' }}>FO</div>
              <div style={{ color: 'var(--qms-text)' }}>{selectedFo?.name ?? 'Auto-assign'}</div>
              <div style={{ color: 'var(--qms-text-muted)' }}>Patients expected</div>
              <div style={{ color: 'var(--qms-text)' }}>{patientsExpected}</div>
              <div style={{ color: 'var(--qms-text-muted)' }}>Devices</div>
              <div style={{ color: 'var(--qms-text)' }}>{devicesAllocated.length || 'none yet'}</div>
            </div>

            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Notes</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-[13px]" />
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Consent path</label>
              <Input value={consentUrl} onChange={(e) => setConsentUrl(e.target.value)} className="text-[13px]" />
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-between items-center">
          <div className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>Step {step + 1} of {STEPS.length}</div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={handleBack}><FiChevronLeft size={14} /> Back</Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={handleNext}>Next <FiChevronRight size={14} /></Button>
            ) : (
              <Button onClick={handleSave}><FiSave size={14} /> Book camp</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CampWizard
