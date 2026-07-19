import { useState } from 'react'
import { FiUsers, FiActivity, FiFileText, FiImage, FiSend, FiMail, FiMessageCircle, FiStar, FiCheckCircle, FiBriefcase } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'
import type { Camp, CampCloseOut } from '@/types/camp.types'
import { getDoctor } from '@/features/camps/camps.utils'
import { CLIENTS } from '@/types/client.types'

interface CloseOutCampModalProps {
  open: boolean
  onClose: () => void
  camp: Camp
}

// Mirrors camps-manager.js's RISK_BANDS table exactly (line ~177-182).
const RISK_BANDS = [
  { id: 'NORMAL', label: 'Normal', color: '#10b981' },
  { id: 'MILD', label: 'Mild', color: '#3b6dff' },
  { id: 'MODERATE', label: 'Moderate', color: '#f59e0b' },
  { id: 'SEVERE', label: 'Severe', color: '#f43f5e' },
] as const

type RiskBandId = (typeof RISK_BANDS)[number]['id']

// Minimal inline 1-5 star rating row — no shared star-rating component
// exists anywhere in components/ui yet.
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <FiStar
            size={18}
            style={{
              color: n <= Math.round(value) ? 'var(--warning)' : 'var(--qms-text-soft)',
              fill: n <= Math.round(value) ? 'var(--warning)' : 'none',
            }}
          />
        </button>
      ))}
    </div>
  )
}

// Mirrors window.closeCampLifecycle (camps-manager.js:449-628) — the
// close-out summary modal shown when moving a LIVE camp to CLOSED.
const CloseOutCampModal = ({ open, onClose, camp }: CloseOutCampModalProps) => {
  const doctor = getDoctor(camp.doctorId)
  const client = CLIENTS.find((c) => c.id === camp.clientId)

  const co = camp.closeOut || ({} as CampCloseOut)
  const initialPatients = camp.patientsDone || camp.patientsExpected || 0
  const initialMale = co.male ?? Math.round(initialPatients * 0.55)
  const initialFemale = co.female ?? Math.max(0, initialPatients - initialMale)

  const [patients, setPatients] = useState(initialPatients)
  const [male, setMale] = useState(initialMale)
  const [female, setFemale] = useState(initialFemale)
  const [riskBands, setRiskBands] = useState<Record<RiskBandId, number>>({
    NORMAL: co.riskBands?.NORMAL || 0,
    MILD: co.riskBands?.MILD || 0,
    MODERATE: co.riskBands?.MODERATE || 0,
    SEVERE: co.riskBands?.SEVERE || 0,
  })
  const [rxCount, setRxCount] = useState(camp.rxCount || 0)
  const [feedback, setFeedback] = useState(camp.feedback || 4.5)
  const [foRating, setFoRating] = useState(camp.foRating || 4.5)
  const [docRating, setDocRating] = useState(4.5)
  const [photos, setPhotos] = useState<string[]>(['', '', '', ''])
  const [mailDoctor, setMailDoctor] = useState(true)
  const [mailClient, setMailClient] = useState(true)
  const [mailPatients, setMailPatients] = useState(false)
  const [notes, setNotes] = useState('')

  const setRiskBand = (id: RiskBandId, value: number) => {
    setRiskBands((prev) => ({ ...prev, [id]: value }))
  }

  const handlePhotoChange = (idx: number, url: string) => {
    setPhotos((prev) => prev.map((p, i) => (i === idx ? url : p)))
  }

  const handleSave = () => {
    // Sanity: gender totals (soft warning, not a hard block — matches
    // camps-manager.js:593-595).
    if (male + female > patients + 1) {
      const proceed = window.confirm('Male + Female totals exceed total patients done. Save anyway?')
      if (!proceed) return
    }
    const riskTotal = Object.values(riskBands).reduce((a, b) => a + b, 0)
    if (riskTotal !== patients && riskTotal > 0) {
      const proceed = window.confirm(`Risk-band total (${riskTotal}) ≠ Patients done (${patients}). Save anyway?`)
      if (!proceed) return
    }

    const closeOut: CampCloseOut & Record<string, unknown> = {
      male,
      female,
      riskBands,
      // Not yet on the narrow CampCloseOut type — rxCount/feedback/foRating/
      // docRating/photos/notes/mail flags/closedAt will need a type extension
      // in a later pass.
      patientsDone: patients,
      rxCount,
      feedback,
      foRating,
      docRating,
      photos: photos.filter(Boolean),
      notes,
      mailDoctor,
      mailClient,
      mailPatients,
      closedAt: new Date().toISOString(),
    }

    console.log('CampCloseOut', closeOut)

    toast.info('UI only — wiring comes next pass')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FiCheckCircle size={16} style={{ color: 'var(--success)' }} />
            Close-out summary
          </DialogTitle>
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{camp.id} · {camp.type}</p>
        </DialogHeader>

        <div className="space-y-4 text-[13px]">
          <div>
            <div className="flex items-center gap-1.5 text-[12px] font-bold mb-2" style={{ color: 'var(--qms-text)' }}>
              <FiUsers size={13} /> Patient summary
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="text-[11px] font-bold" style={{ color: 'var(--qms-text-muted)' }}>Patients done</span>
                <Input type="number" min={0} value={patients} onChange={(e) => setPatients(parseInt(e.target.value, 10) || 0)} />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold" style={{ color: 'var(--qms-text-muted)' }}>Male</span>
                <Input type="number" min={0} value={male} onChange={(e) => setMale(parseInt(e.target.value, 10) || 0)} />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold" style={{ color: 'var(--qms-text-muted)' }}>Female</span>
                <Input type="number" min={0} value={female} onChange={(e) => setFemale(parseInt(e.target.value, 10) || 0)} />
              </label>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[12px] font-bold mb-2" style={{ color: 'var(--qms-text)' }}>
              <FiActivity size={13} /> Risk-band bifurcation
            </div>
            <div className="grid grid-cols-4 gap-2">
              {RISK_BANDS.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border p-2"
                  style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}
                >
                  <div className="text-[11px] font-bold mb-1" style={{ color: r.color }}>{r.label}</div>
                  <Input
                    type="number"
                    min={0}
                    value={riskBands[r.id]}
                    onChange={(e) => setRiskBand(r.id, parseInt(e.target.value, 10) || 0)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[12px] font-bold mb-2" style={{ color: 'var(--qms-text)' }}>
              <FiFileText size={13} /> Rx &amp; ratings
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Rx prescriptions issued</label>
                <Input type="number" min={0} value={rxCount} onChange={(e) => setRxCount(parseInt(e.target.value, 10) || 0)} />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Patient feedback (out of 5)</label>
                <StarRating value={feedback} onChange={setFeedback} />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--qms-text-muted)' }}>FO rating from pharma (out of 5)</label>
                <StarRating value={foRating} onChange={setFoRating} />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Doctor rating from pharma (out of 5)</label>
                <StarRating value={docRating} onChange={setDocRating} />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[12px] font-bold mb-2" style={{ color: 'var(--qms-text)' }}>
              <FiImage size={13} /> Camp photos
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i}>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Photo {i + 1}</label>
                  <Input
                    value={photos[i]}
                    onChange={(e) => handlePhotoChange(i, e.target.value)}
                    placeholder="https://..."
                    className="text-[12px]"
                  />
                </div>
              ))}
            </div>
            <div className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
              Paste a photo URL (camp banner, doctor + patients, devices in use, group photo).
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[12px] font-bold mb-2" style={{ color: 'var(--qms-text)' }}>
              <FiSend size={13} /> Thank-you communications
            </div>
            <div
              className="rounded-lg border p-3 space-y-2"
              style={{ borderColor: 'var(--success-soft)', background: 'var(--success-soft)' }}
            >
              <label className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: 'var(--qms-text)' }}>
                <input type="checkbox" checked={mailDoctor} onChange={(e) => setMailDoctor(e.target.checked)} />
                <FiMail size={13} style={{ color: 'var(--success)' }} />
                Send thank-you email to <b>{doctor?.name || 'doctor'}</b>
              </label>
              <label className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: 'var(--qms-text)' }}>
                <input type="checkbox" checked={mailClient} onChange={(e) => setMailClient(e.target.checked)} />
                <FiBriefcase size={13} style={{ color: 'var(--qms-brand)' }} />
                Send camp report to <b>{client?.name || 'client'}</b>
              </label>
              <label className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: 'var(--qms-text)' }}>
                <input type="checkbox" checked={mailPatients} onChange={(e) => setMailPatients(e.target.checked)} />
                <FiMessageCircle size={13} style={{ color: '#25D366' }} />
                Send thank-you WhatsApp to patients
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Closing notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Highlights, issues, follow-ups..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="font-semibold">
            <FiCheckCircle size={14} /> Close camp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CloseOutCampModal
