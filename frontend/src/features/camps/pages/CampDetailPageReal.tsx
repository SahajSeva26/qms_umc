import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useCampReal } from '@/features/camps/hooks/useCampReal'
import { useCreateCamp } from '@/features/camps/hooks/useCreateCamp'
import { useUpdateCamp } from '@/features/camps/hooks/useUpdateCamp'
import { useCampRefNames } from '@/features/camps/hooks/useCampRefNames'
import { useCampPickerData } from '@/features/camps/hooks/useCampPickerData'
import { useCampCandidateRoles } from '@/features/camps/hooks/useCampCandidateRoles'
import { useCampDraft } from '@/features/camps/hooks/useCampDraft'
import { campRefId, saveErrorMessage } from '@/features/camps/campsReal.utils'
import { usePermission } from '@/hooks/usePermission'
import CampSummaryHeader from '@/features/camps/components/CampSummaryHeader'
import CampStageMovePanel from '@/features/camps/components/CampStageMovePanel'
import CampStageHistoryList from '@/features/camps/components/CampStageHistoryList'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import TenantPicker from '@/components/ui/TenantPicker'
import type { BillingType, CampEntity, CampType } from '@/types/campReal.types'

const TYPE_OPTIONS: { value: CampType; label: string }[] = [
  { value: 'screening', label: 'Screening' },
  { value: 'diet', label: 'Diet' },
  { value: 'lab', label: 'Lab' },
]

const BILLING_OPTIONS: { value: BillingType; label: string }[] = [
  { value: 'billable', label: 'Billable' },
  { value: 'void', label: 'Void' },
]

// Move-stage requires camp:manage/tenant:manage only — camp:update alone can write
// the camp but can't change its status (PATCH /camps/:id/stage guards more strictly).
const CAMP_WRITE_PERMISSIONS = ['camp:update', 'camp:manage', 'tenant:manage']
const CAMP_STAGE_PERMISSIONS = ['camp:manage', 'tenant:manage']

// tenant/division/project/status are locked after create; status only moves via
// the stage-transition action. fo/date are locked together once status leaves 'requested'.
const CampDetailPageReal = () => {
  const { id } = useParams<{ id: string }>()
  const isCreateMode = !id
  const navigate = useNavigate()
  const { hasAnyPermission } = usePermission()
  const canWrite = hasAnyPermission(CAMP_WRITE_PERMISSIONS)
  const canMoveStage = hasAnyPermission(CAMP_STAGE_PERMISSIONS)

  const { data, isLoading, error } = useCampReal(id)
  const camp = data?.data ?? null

  const { doctorName, divisionName, projectName } = useCampRefNames({
    doctors: !isCreateMode,
    divisions: !isCreateMode,
    projects: !isCreateMode,
  })

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/camps')}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to camps
      </button>

      {!isCreateMode && isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading camp…
        </div>
      )}

      {!isCreateMode && error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load camp. Please try again.
        </div>
      )}

      {(isCreateMode || (camp && !isLoading)) && (
        <>
          <CampSummaryHeader
            camp={camp}
            isCreateMode={isCreateMode}
            doctorName={doctorName}
            divisionName={divisionName}
            projectName={projectName}
          />

          {!isCreateMode && camp && (
            <CampStageMovePanel camp={camp} canWrite={canWrite} canMoveStage={canMoveStage} />
          )}

          {!isCreateMode && camp && <CampStageHistoryList camp={camp} />}

          {/* key={camp?.id ?? 'create'} forces a fresh draft per record so a background
              refetch (e.g. from Move Stage above) never clobbers an in-progress edit. */}
          <CampForm key={camp?.id ?? 'create'} camp={camp} isCreateMode={isCreateMode} canWrite={canWrite} />
        </>
      )}
    </div>
  )
}

interface CampFormProps {
  camp: CampEntity | null
  isCreateMode: boolean
  canWrite: boolean
}

const CampForm = ({ camp, isCreateMode, canWrite }: CampFormProps) => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const { draft, setField } = useCampDraft(camp)
  const { tenant, division, project, doctor, type, billingType, patientExpectation, fo, mr, asm, rsm, date, slotStart, slotEnd, city, state, latitude, longitude, devices, notes } = draft

  const setTenant = (v: string) => setField('tenant', v)
  const setDivision = (v: string) => setField('division', v)
  const setProject = (v: string) => setField('project', v)
  const setDoctor = (v: string) => setField('doctor', v)
  const setType = (v: CampType) => setField('type', v)
  const setBillingType = (v: BillingType) => setField('billingType', v)
  const setPatientExpectation = (v: string) => setField('patientExpectation', v)
  const setFo = (v: string) => setField('fo', v)
  const setMr = (v: string) => setField('mr', v)
  const setAsm = (v: string) => setField('asm', v)
  const setRsm = (v: string) => setField('rsm', v)
  const setDate = (v: string) => setField('date', v)
  const setSlotStart = (v: string) => setField('slotStart', v)
  const setSlotEnd = (v: string) => setField('slotEnd', v)
  const setCity = (v: string) => setField('city', v)
  const setState = (v: string) => setField('state', v)
  const setLatitude = (v: string) => setField('latitude', v)
  const setLongitude = (v: string) => setField('longitude', v)
  const setDevices = (v: string) => setField('devices', v)
  const setNotes = (v: string) => setField('notes', v)

  const { tenants, divisions, doctors } = useCampPickerData(tenant, isCreateMode)

  // Scopes FO/MR/ASM/RSM candidates: create mode's picked Company, or edit mode's loaded camp.tenant.
  const effectiveTenant = tenant || campRefId(camp?.tenant) || ''

  const { foRoles, mrRoles, asmRoles, rsmRoles, roleLabel, setMrOpened, setAsmOpened, setRsmOpened } =
    useCampCandidateRoles(effectiveTenant, camp)

  const doctorLabel = (id: string) => doctors.find((d) => d.id === id)?.name ?? id

  const createCamp = useCreateCamp()
  const updateCamp = useUpdateCamp(id ?? '')

  const [formError, setFormErrorState] = useState<string | null>(null)

  const handleSave = () => {
    const lat = Number(latitude)
    const lng = Number(longitude)
    const patientExpectationNum = patientExpectation ? Number(patientExpectation) : undefined
    const deviceList = devices.split(',').map((d) => d.trim()).filter(Boolean)

    if (isCreateMode) {
      if (!tenant) { setFormErrorState('Company is required'); return }
      if (!division) { setFormErrorState('Division is required'); return }
      if (!doctor) { setFormErrorState('Doctor is required'); return }
      if (!date) { setFormErrorState('Date is required'); return }
      if (!slotStart || !slotEnd) { setFormErrorState('Time slot (start and end) is required'); return }
      if (!city.trim()) { setFormErrorState('City is required'); return }
      if (!state.trim()) { setFormErrorState('State is required'); return }
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) { setFormErrorState('Latitude must be a number between -90 and 90'); return }
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) { setFormErrorState('Longitude must be a number between -180 and 180'); return }

      setFormErrorState(null)
      createCamp.mutate(
        {
          tenant,
          division,
          project: project || undefined,
          doctor,
          type,
          billingType,
          patientExpectation: patientExpectationNum,
          fo: fo || undefined,
          mr: mr || undefined,
          asm: asm || undefined,
          rsm: rsm || undefined,
          date,
          timeSlot: { start: slotStart, end: slotEnd },
          city,
          state,
          coordinates: [lng, lat],
          devices: deviceList,
          notes: notes || undefined,
        },
        {
          onSuccess: (res) => {
            if (res.data?.id) {
              navigate(`/camps/${res.data.id}`)
            }
          },
        },
      )
      return
    }

    if (latitude && (!Number.isFinite(lat) || lat < -90 || lat > 90)) { setFormErrorState('Latitude must be a number between -90 and 90'); return }
    if (longitude && (!Number.isFinite(lng) || lng < -180 || lng > 180)) { setFormErrorState('Longitude must be a number between -180 and 180'); return }

    setFormErrorState(null)
    updateCamp.mutate({
      doctor: doctor || undefined,
      type,
      billingType,
      patientExpectation: patientExpectationNum,
      fo: fo || undefined,
      mr: mr || undefined,
      asm: asm || undefined,
      rsm: rsm || undefined,
      date: date || undefined,
      timeSlot: slotStart && slotEnd ? { start: slotStart, end: slotEnd } : undefined,
      city: city || undefined,
      state: state || undefined,
      coordinates: latitude && longitude ? [lng, lat] : undefined,
      devices: deviceList,
      // Send raw string (not `notes || undefined`) so clearing the textarea to '' actually clears it.
      notes,
    })
  }

  const mutation = isCreateMode ? createCamp : updateCamp

  return (
    <div
      className="rounded-xl border p-5 mb-5"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>
        {isCreateMode ? 'Details' : 'Edit camp'}
      </h2>

      <div className="space-y-4">
        {isCreateMode && (
          <>
            <div>
              <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Company</Label>
              <TenantPicker tenants={tenants} value={tenant} onValueChange={(v) => { setTenant(v); setDivision('') }} />
            </div>
            <div>
              <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Division</Label>
              <Select key={division || 'empty'} value={division || undefined} onValueChange={(v) => setDivision(v ?? '')} disabled={!tenant}>
                <SelectTrigger className="w-full"><SelectValue placeholder={tenant ? 'Select division' : 'Select a company first'} /></SelectTrigger>
                <SelectContent>
                  {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Project (optional)</Label>
              <Input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Project id, optional" />
            </div>
          </>
        )}

        <div>
          <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Doctor</Label>
          {/* key forces a remount on undefined->defined transitions — base-ui's Select
              otherwise keeps treating it as uncontrolled after the first render. */}
          <Select key={doctor || 'empty'} value={doctor || undefined} onValueChange={(v) => setDoctor(v ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select doctor">{(v) => doctorLabel(v as string)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} ({d.pharmaCode})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as CampType)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Billing</Label>
            <Select value={billingType} onValueChange={(v) => setBillingType(v as BillingType)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BILLING_OPTIONS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Patient expectation</Label>
          <Input type="text" inputMode="numeric" value={patientExpectation} onChange={(e) => setPatientExpectation(e.target.value)} placeholder="e.g. 50" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!isCreateMode && !!camp && camp.status !== 'requested'} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Slot start</Label>
              <Input type="text" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} placeholder="09:00" />
            </div>
            <div>
              <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Slot end</Label>
              <Input type="text" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} placeholder="13:00" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>State</Label>
            <Input value={state} onChange={(e) => setState(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Latitude</Label>
            <Input type="text" inputMode="decimal" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="e.g. 29.2183" />
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Longitude</Label>
            <Input type="text" inputMode="decimal" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="e.g. 79.5130" />
          </div>
        </div>
        <p className="text-[11px] -mt-2" style={{ color: 'var(--qms-text-muted)' }}>
          Used to auto-allocate the nearest available field officer if none is picked below.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Field Officer (optional — auto-assigned if blank)
            </Label>
            <Select key={fo || 'empty'} value={fo || undefined} onValueChange={(v) => setFo(v ?? '')} disabled={!isCreateMode && !!camp && camp.status !== 'requested'}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Auto-assign nearest FO">{(v) => roleLabel(v as string)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {foRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>MR (optional)</Label>
            {/* onOpenChange lazy-loads the MR fetch on first open only; never reset once loaded. */}
            <Select key={mr || 'empty'} value={mr || undefined} onValueChange={(v) => setMr(v ?? '')} onOpenChange={(open) => { if (open) setMrOpened(true) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select MR">{(v) => roleLabel(v as string)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {mrRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>ASM (optional)</Label>
            <Select key={asm || 'empty'} value={asm || undefined} onValueChange={(v) => setAsm(v ?? '')} onOpenChange={(open) => { if (open) setAsmOpened(true) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select ASM">{(v) => roleLabel(v as string)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {asmRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>RSM (optional)</Label>
            <Select key={rsm || 'empty'} value={rsm || undefined} onValueChange={(v) => setRsm(v ?? '')} onOpenChange={(open) => { if (open) setRsmOpened(true) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select RSM">{(v) => roleLabel(v as string)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {rsmRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Devices (comma-separated)</Label>
          <Input value={devices} onChange={(e) => setDevices(e.target.value)} placeholder="e.g. bp-monitor, glucometer" />
        </div>

        <div>
          <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      {mutation.isError && (
        <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
          {saveErrorMessage(mutation.error)}
        </div>
      )}
      {mutation.isSuccess && !isCreateMode && (
        <div className="text-xs rounded-xl px-3 py-2 bg-success-soft text-success mt-4">Saved.</div>
      )}
      {formError && (
        <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">{formError}</div>
      )}

      {canWrite ? (
        <Button onClick={handleSave} disabled={mutation.isPending} className="mt-4">
          {mutation.isPending ? 'Saving…' : isCreateMode ? 'Create camp' : 'Save changes'}
        </Button>
      ) : (
        <p className="text-[12px] mt-4" style={{ color: 'var(--qms-text-muted)' }}>
          You have read-only access to this camp.
        </p>
      )}
    </div>
  )
}

export default CampDetailPageReal
