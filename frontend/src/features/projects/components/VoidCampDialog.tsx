import { useState } from 'react'
import { FiFileText, FiExternalLink, FiCheck, FiAlertTriangle } from 'react-icons/fi'
import type { ProjectEntity } from '@/types/project.types'
import { allowedCampTypesForProjectTypes } from '@/types/project.types'
import type { CampType } from '@/types/campReal.types'
import { CAMP_TYPE_LABEL } from '@/types/campReal.types'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import { CAMP_TIME_SLOT_LABEL, CAMP_TIME_SLOT_VALUES } from '@/types/campTimeSlot.constants'
import type { LocationValue } from '@/types/location.types'
import { createEmptyLocationValue } from '@/types/location.types'
import { useCampsReal } from '@/features/camps/hooks/useCampsReal'
import { useVoidCamp } from '@/features/camps/hooks/useVoidCamp'
import { useApproveVoidCamp } from '@/features/camps/hooks/useApproveVoidCamp'
import { voidCampFormSchema } from '@/features/projects/schemas/voidCamp.schemas'
// Cross-feature imports, flagged and deliberately deferred — see md-files/TODO.md
// "Promote camp/inventory pickers to a shared widget surface" for the full note.
import CampDoctorSearchPicker from '@/features/camps/components/CampDoctorSearchPicker'
import CampMrPicker from '@/features/camps/components/CampMrPicker'
import InventoryMasterMultiPicker from '@/features/inventory/real/components/InventoryMasterMultiPicker'
import LocationPicker from '@/components/widgets/location-picker/LocationPicker'
import LocationAddressFields from '@/components/widgets/location-picker/LocationAddressFields'
import CampStatusPillReal from '@/components/widgets/camp/CampStatusPillReal'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePagination } from '@/hooks/usePagination'
import PaginationControls from '@/components/ui/PaginationControls'
import { EMPTY_ARRAY } from '@/utils/emptyArray'
import type { CampEntity } from '@/types/campReal.types'

const VOID_CAMPS_PAGE_SIZE = 10

interface VoidCampDialogProps {
  project: ProjectEntity
  onClose: () => void
}

// WF-4 (CLAUDE.md) — "Camp done without PO → Add void camp → Upline approval → PO received →
// Admin maps PO → Reconciled." Matches the prototype's own per-project "Add void camp" placement
// (projects-manager.js openVoidCamp), but wires the REAL two-step backend flow instead of the
// prototype's single combined add+approve step: POST /camps/void-camp lands the camp in
// `requested`; a separate PATCH .../approve-void (camp:manage OR tenant:manage) moves it to
// `closed` with its own reason, recorded in real stage history — not a free-text "approved by" field.
const ApproveRow = ({ camp }: { camp: CampEntity }) => {
  const [reasonOpen, setReasonOpen] = useState(false)
  const [reason, setReason] = useState('')
  const approve = useApproveVoidCamp(camp.id)

  const handleApprove = async () => {
    if (!reason.trim()) return
    try {
      await approve.mutateAsync({ reason: reason.trim() })
      setReasonOpen(false)
      setReason('')
    } catch {
      // no-op: mutation's own error surfaces via approve.isError below
    }
  }

  const mailUrl = typeof camp.meta?.mailUrl === 'string' ? camp.meta.mailUrl : null

  return (
    <div className="rounded-lg border p-2.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-bold" style={{ color: 'var(--qms-text)' }}>{camp.code}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
            {new Date(camp.date).toLocaleDateString('en-IN')} · {CAMP_TYPE_LABEL[camp.type]}
          </div>
        </div>
        <CampStatusPillReal status={camp.status} />
      </div>

      {mailUrl && (
        <a
          href={mailUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-semibold mt-1.5 hover:underline"
          style={{ color: 'var(--qms-brand)' }}
        >
          <FiExternalLink size={10} /> Confirmation mail
        </a>
      )}

      {camp.status === 'requested' && (
        <div className="mt-2">
          {!reasonOpen ? (
            <Button size="sm" onClick={() => setReasonOpen(true)}>
              <FiCheck size={12} /> Approve
            </Button>
          ) : (
            <div className="space-y-1.5">
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Approval reason — e.g. mail verified, cost owner confirmed"
                rows={2}
                className="text-[12px]"
                autoFocus
              />
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => { setReasonOpen(false); setReason('') }}>Cancel</Button>
                <Button size="sm" onClick={handleApprove} disabled={approve.isPending || !reason.trim()}>
                  {approve.isPending ? 'Approving…' : 'Confirm approval'}
                </Button>
              </div>
              {approve.isError && <p className="text-[11px] text-danger">Could not approve — try again.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const VoidCampDialog = ({ project, onClose }: VoidCampDialogProps) => {
  const tenant = typeof project.tenant === 'string' ? project.tenant : project.tenant?._id
  const division = typeof project.division === 'string' ? project.division : project.division?._id
  const allowedTypes = allowedCampTypesForProjectTypes(project.type)

  const { page: voidCampsPage, setPage: setVoidCampsPage, totalPages: voidCampsTotalPages } = usePagination(VOID_CAMPS_PAGE_SIZE)
  const { data, isLoading, error, refetch } = useCampsReal({
    project: project.id, billingType: 'void', limit: String(VOID_CAMPS_PAGE_SIZE), page: String(voidCampsPage),
  })
  const voidCamps = data?.data?.items ?? EMPTY_ARRAY
  const voidCampsCount = data?.data?.count ?? 0

  const voidCamp = useVoidCamp()

  const [type, setType] = useState<CampType | ''>(allowedTypes[0] ?? '')
  const [doctorId, setDoctorId] = useState('')
  const [doctorLabel, setDoctorLabel] = useState('')
  const [mrId, setMrId] = useState('')
  const [mrLabel, setMrLabel] = useState('')
  const [date, setDate] = useState('')
  const [timeSlot, setTimeSlot] = useState<CampTimeSlotValue | ''>('')
  const [location, setLocation] = useState<LocationValue>(createEmptyLocationValue('India'))
  const [patientExpectation, setPatientExpectation] = useState('')
  const [deviceIds, setDeviceIds] = useState<string[]>([])
  const [deviceLabels, setDeviceLabels] = useState<Record<string, string>>({})
  const [mailUrl, setMailUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!tenant || !division) {
      setFormError('This project has no resolved client/division — cannot record a void camp.')
      return
    }
    // Validates the FULL location contract the backend requires (addressLine1 + coordinates, not
    // just city/state/pincode) — catches a manually-typed address with no map pin selected before
    // it reaches the backend as a 400.
    const result = voidCampFormSchema.safeParse({ type, doctorId, date, timeSlot, location, mailUrl })
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? 'Please complete the required fields.')
      return
    }
    setFormError(null)
    try {
      await voidCamp.mutateAsync({
        tenant,
        division,
        project: project.id,
        doctor: result.data.doctorId,
        type: result.data.type as CampType,
        patientExpectation: patientExpectation ? Number(patientExpectation) : undefined,
        mr: mrId || undefined,
        date: result.data.date,
        timeSlot: result.data.timeSlot as CampTimeSlotValue,
        location: result.data.location,
        devices: deviceIds.length ? deviceIds : undefined,
        notes: notes.trim() || undefined,
        meta: { mailUrl: result.data.mailUrl },
      })
      // Reset the form, keep the dialog open — the existing-void-camps list above updates via refetch.
      setDoctorId(''); setDoctorLabel('')
      setMrId(''); setMrLabel('')
      setDate(''); setTimeSlot(''); setLocation(createEmptyLocationValue('India'))
      setPatientExpectation(''); setDeviceIds([]); setDeviceLabels({})
      setMailUrl(''); setNotes('')
    } catch {
      // no-op: mutation's own error surfaces via voidCamp.isError below
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--qms-text)' }}>
            <FiFileText size={15} /> Void camps · {project.name}
          </DialogTitle>
        </DialogHeader>
        <p className="text-[12px] -mt-1" style={{ color: 'var(--qms-text-muted)' }}>
          A void camp executes <i>without</i> a PO, on the basis of a pharma confirmation mail and QMS
          management approval. It lands as <b>Requested</b> until approved, then moves to <b>Closed</b>.
        </p>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--qms-text-muted)' }}>
            Existing void camps ({voidCampsCount})
            {!isLoading && !error && voidCampsCount > voidCamps.length && (
              <span className="inline-flex items-center gap-1 normal-case font-semibold" style={{ color: '#d97706' }}>
                <FiAlertTriangle size={11} /> showing {voidCamps.length} of {voidCampsCount}
              </span>
            )}
          </div>
          {isLoading ? (
            <div className="text-[12px] py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>
          ) : error ? (
            <div className="text-[12px] rounded-lg px-3 py-2 bg-danger-soft border border-danger text-danger flex items-center justify-between gap-2">
              Failed to load void camps.
              <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : voidCamps.length === 0 ? (
            <div className="text-[12px] py-4 text-center rounded-lg border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
              No void camps yet.
            </div>
          ) : (
            <div className="space-y-2">
              {voidCamps.map((camp) => <ApproveRow key={camp.id} camp={camp} />)}
              <PaginationControls page={voidCampsPage} totalPages={voidCampsTotalPages(voidCampsCount)} onPageChange={setVoidCampsPage} />
            </div>
          )}
        </div>

        <div className="border-t pt-4" style={{ borderColor: 'var(--qms-border)' }}>
          <div className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--qms-text-muted)' }}>
            Add void camp
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Type *</Label>
                <Select value={type} onValueChange={(v) => setType(v as CampType)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {allowedTypes.map((t) => <SelectItem key={t} value={t}>{CAMP_TYPE_LABEL[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Patient expectation</Label>
                <Input type="text" inputMode="numeric" value={patientExpectation} onChange={(e) => setPatientExpectation(e.target.value)} placeholder="e.g. 50" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Camp date *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Time slot *</Label>
                <Select key={timeSlot || 'empty'} value={timeSlot || undefined} onValueChange={(v) => setTimeSlot(v as CampTimeSlotValue)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select time slot">{(v) => CAMP_TIME_SLOT_LABEL[v as CampTimeSlotValue]}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {CAMP_TIME_SLOT_VALUES.map((slot) => <SelectItem key={slot} value={slot}>{CAMP_TIME_SLOT_LABEL[slot]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Location *</Label>
              <LocationPicker value={location} onChange={setLocation} defaultCountry="India" countryCode="IN" />
              <LocationAddressFields value={location} onChange={setLocation} defaultCountry="India" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Doctor *</Label>
                <CampDoctorSearchPicker value={doctorId} label={doctorLabel} division={division} onChange={(id, l) => { setDoctorId(id); setDoctorLabel(l) }} />
              </div>
              <div>
                <Label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>MR (optional)</Label>
                <CampMrPicker value={mrId} label={mrLabel} tenant={tenant} onChange={(id, l) => { setMrId(id); setMrLabel(l) }} />
              </div>
            </div>

            <div>
              <Label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Devices</Label>
              <InventoryMasterMultiPicker value={deviceIds} labels={deviceLabels} onChange={(ids, labels) => { setDeviceIds(ids); setDeviceLabels(labels) }} type="device" />
            </div>

            <div>
              <Label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Pharma confirmation mail URL *</Label>
              <Input type="text" value={mailUrl} onChange={(e) => setMailUrl(e.target.value)} placeholder="https://mail.google.com/..." />
            </div>

            <div>
              <Label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" rows={2} />
            </div>

            {formError && <p className="text-[12px] text-danger">{formError}</p>}
            {voidCamp.isError && <p className="text-[12px] text-danger">Could not record this void camp — try again.</p>}
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={handleAdd} disabled={voidCamp.isPending} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
            {voidCamp.isPending ? 'Saving…' : 'Add void camp'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default VoidCampDialog
