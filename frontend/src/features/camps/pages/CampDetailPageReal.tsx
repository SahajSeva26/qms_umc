import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useCampReal } from '@/features/camps/hooks/useCampReal'
import { useCreateCamp } from '@/features/camps/hooks/useCreateCamp'
import { useUpdateCamp } from '@/features/camps/hooks/useUpdateCamp'
import { useMoveCampStage } from '@/features/camps/hooks/useMoveCampStage'
import { useAllocateFo } from '@/features/camps/hooks/useAllocateFo'
import { useCampRefNames } from '@/features/camps/hooks/useCampRefNames'
import { campRefId, campRefName } from '@/features/camps/campsReal.utils'
import { usePermission } from '@/hooks/usePermission'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useDivisions } from '@/features/crm/hooks/useDivisions'
import { useDoctors } from '@/features/doctors/hooks/useDoctors'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import CampStatusPillReal from '@/features/camps/components/CampStatusPillReal'
import { CAMP_TRANSITION_MAP } from '@/types/campReal.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { BillingType, CampStatus, CampType } from '@/types/campReal.types'

const TYPE_OPTIONS: { value: CampType; label: string }[] = [
  { value: 'screening', label: 'Screening' },
  { value: 'diet', label: 'Diet' },
  { value: 'lab', label: 'Lab' },
]

const BILLING_OPTIONS: { value: BillingType; label: string }[] = [
  { value: 'billable', label: 'Billable' },
  { value: 'void', label: 'Void' },
]

// Real per-action route guards (camp.routes.ts):
// - PUT /camps/:id (Save)        -> camp:update, camp:manage, tenant:manage
// - POST /camps/:id/allocate     -> camp:update, camp:manage, tenant:manage
// - PATCH /camps/:id/stage       -> camp:manage, tenant:manage ONLY (no camp:update)
// A camp:search-only actor (e.g. an FO) can legitimately land on this page in
// edit mode (they can see their own assigned camps) but the backend 403s any
// write, so the whole edit form is read-only for that case. camp:update was
// previously missing from CAMP_WRITE_PERMISSIONS entirely — found via a
// 2026-07-24 test sweep: a real Camp Coordinator (camp:update, no
// camp:manage) was wrongly shown "read-only" even though a direct PUT from
// that same session succeeded with 200. Move-stage stays gated more strictly
// since the backend itself never accepts camp:update for that action.
const CAMP_WRITE_PERMISSIONS = ['camp:update', 'camp:manage', 'tenant:manage']
const CAMP_STAGE_PERMISSIONS = ['camp:manage', 'tenant:manage']

// camp.controller.ts's Zod-validation-failure branch (create + update) responds
// with { message: 'Validation Error', data: { fields: { <field>: '<reason>' } } }
// instead of a specific top-level message — reading only response.data.message
// (as every other error box in this file does) surfaces just the generic
// "Validation Error" string and silently drops the actual per-field reason.
// Since 'Project (optional)' (below) is a raw free-text Input rather than a
// picker, and patientExpectation has a server-side >=0 floor, this is the one
// save path where a typo'd/out-of-range value routinely triggers exactly that
// shape. Fall back to the plain message for every other error (403, 409, network).
function saveErrorMessage(err: unknown): string {
  const response = (err as { response?: { data?: { message?: string; data?: { fields?: Record<string, string> } } } })
    ?.response
  const fields = response?.data?.data?.fields
  if (fields && Object.keys(fields).length > 0) {
    return Object.entries(fields)
      .map(([field, reason]) => `${field}: ${reason}`)
      .join('; ')
  }
  return response?.data?.message || 'Failed to save changes.'
}

// Combined create-flow + edit page, mirrors GeoProfileDetailPage.tsx's shape
// (single-page form, not a multi-step wizard — the old mock CampWizard's
// 4-step flow was built against fields with no real backend equivalent).
// Per camp.validators.ts / camp.service.ts:
// - tenant/division/project/status are NOT editable after create (status only
//   moves via the dedicated stage-transition action below).
// - fo is optional on create — the backend auto-assigns the nearest free FO
//   from `coordinates` if omitted, and creation fails outright (422/409) if
//   none can be resolved. Supplying `fo` explicitly overrides the auto-pick.
// - fo/date are locked together once status leaves 'requested' — edits to
//   either 409 on a non-requested camp.
const CampDetailPageReal = () => {
  const { id } = useParams<{ id: string }>()
  const isCreateMode = !id
  const navigate = useNavigate()
  const { hasAnyPermission } = usePermission()
  const canWrite = hasAnyPermission(CAMP_WRITE_PERMISSIONS)
  const canMoveStage = hasAnyPermission(CAMP_STAGE_PERMISSIONS)

  const { data, isLoading, error } = useCampReal(id)
  const camp = data?.data ?? null

  const { data: tenantsData } = useTenants({})
  const tenants = tenantsData?.data?.items ?? []

  const [tenant, setTenant] = useState('')
  const { data: divisionsData } = useDivisions({ tenantId: tenant || undefined, limit: '200' })
  const divisions = divisionsData?.data?.items ?? []

  const { data: doctorsData } = useDoctors({ limit: '1000' })
  const doctors = doctorsData?.data?.items ?? []

  // Active-only + a real limit (backend defaults to 10 with no query params —
  // was silently truncating the fo/mr/asm/rsm pickers to whatever 10 roles
  // happened to sort first, and offering inactive roles as if assignable).
  // A camp's ALREADY-assigned role is merged back in below (via
  // assignableRoles) even if it's since gone inactive or fallen outside this
  // list, so an existing assignment always still resolves a real label
  // instead of silently rendering the "unassigned" placeholder.
  const { data: rolesData } = useRoles({ status: 'active', limit: '500' })
  const roles = rolesData?.data?.items ?? []
  const assignableRoles: { id: string; name: string; code: string }[] = useMemo(() => {
    const byId = new Map(roles.map((r) => [r.id, { id: r.id, name: r.name, code: r.code }]))
    for (const value of [camp?.fo, camp?.mr, camp?.asm, camp?.rsm]) {
      const refId = campRefId(value)
      if (refId && !byId.has(refId)) {
        const name = campRefName(value)
        byId.set(refId, { id: refId, name: name ?? refId, code: name ? 'inactive' : 'unavailable' })
      }
    }
    return Array.from(byId.values())
  }, [roles, camp])
  // SelectValue's default rendering just echoes the raw `value` prop back as
  // text (a bare Mongo ObjectId) unless given a render-fn child that maps
  // id->label — GeoProfileDetailPage.tsx's Role select already does this
  // (`roleName`); these 5 Selects on this page were missing it entirely, so
  // once the `key`-remount fix above finally let them display a value at
  // all, they showed raw ids instead of names. Found live via a 2026-07-24
  // verification pass.
  const doctorLabel = (id: string) => doctors.find((d) => d.id === id)?.name ?? id
  const roleLabel = (id: string) => assignableRoles.find((r) => r.id === id)?.name ?? id

  const { doctorName, divisionName, projectName } = useCampRefNames()

  const createCamp = useCreateCamp()
  const updateCamp = useUpdateCamp(id ?? '')
  const moveStage = useMoveCampStage(id ?? '')
  const allocateFo = useAllocateFo(id ?? '')

  const [division, setDivision] = useState('')
  const [project, setProject] = useState('')
  const [doctor, setDoctor] = useState('')
  const [type, setType] = useState<CampType>('screening')
  const [billingType, setBillingType] = useState<BillingType>('billable')
  const [patientExpectation, setPatientExpectation] = useState('')
  const [fo, setFo] = useState('')
  const [mr, setMr] = useState('')
  const [asm, setAsm] = useState('')
  const [rsm, setRsm] = useState('')
  const [date, setDate] = useState('')
  const [slotStart, setSlotStart] = useState('')
  const [slotEnd, setSlotEnd] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [devices, setDevices] = useState('')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const [stageTo, setStageTo] = useState<CampStatus | ''>('')
  const [stageReason, setStageReason] = useState('')
  const [stageError, setStageError] = useState<string | null>(null)

  useEffect(() => {
    if (camp && !isCreateMode) {
      setDivision(campRefId(camp.division) ?? '')
      setProject(campRefId(camp.project) ?? '')
      setDoctor(campRefId(camp.doctor) ?? '')
      setType(camp.type)
      setBillingType(camp.billingType)
      setPatientExpectation(String(camp.patientExpectation ?? ''))
      setFo(campRefId(camp.fo) ?? '')
      setMr(campRefId(camp.mr) ?? '')
      setAsm(campRefId(camp.asm) ?? '')
      setRsm(campRefId(camp.rsm) ?? '')
      setDate(camp.date ? camp.date.slice(0, 10) : '')
      setSlotStart(camp.timeSlot?.start ?? '')
      setSlotEnd(camp.timeSlot?.end ?? '')
      setCity(camp.city)
      setState(camp.state)
      if (camp.coordinates && camp.coordinates.length === 2) {
        setLongitude(String(camp.coordinates[0]))
        setLatitude(String(camp.coordinates[1]))
      }
      setDevices((camp.devices ?? []).join(', '))
      setNotes(camp.notes ?? '')
    }
  }, [camp, isCreateMode])

  const legalNextStatuses = camp ? CAMP_TRANSITION_MAP[camp.status] : []

  const handleSave = () => {
    const lat = Number(latitude)
    const lng = Number(longitude)
    const patientExpectationNum = patientExpectation ? Number(patientExpectation) : undefined
    const deviceList = devices.split(',').map((d) => d.trim()).filter(Boolean)

    if (isCreateMode) {
      if (!tenant) { setFormError('Company is required'); return }
      if (!division) { setFormError('Division is required'); return }
      if (!doctor) { setFormError('Doctor is required'); return }
      if (!date) { setFormError('Date is required'); return }
      if (!slotStart || !slotEnd) { setFormError('Time slot (start and end) is required'); return }
      if (!city.trim()) { setFormError('City is required'); return }
      if (!state.trim()) { setFormError('State is required'); return }
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) { setFormError('Latitude must be a number between -90 and 90'); return }
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) { setFormError('Longitude must be a number between -180 and 180'); return }

      setFormError(null)
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

    if (latitude && (!Number.isFinite(lat) || lat < -90 || lat > 90)) { setFormError('Latitude must be a number between -90 and 90'); return }
    if (longitude && (!Number.isFinite(lng) || lng < -180 || lng > 180)) { setFormError('Longitude must be a number between -180 and 180'); return }

    setFormError(null)
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
      // NOT `notes || undefined`: this is a partial-update PATCH-style payload
      // against an EXISTING record, so an omitted key means "leave untouched"
      // (camp.service.ts's set() only overwrites when the key is present).
      // Using the falsy `||` here silently dropped `notes` from the request
      // whenever the user cleared the textarea (empty string is falsy), so
      // the stale note stayed in the DB even though the UI reported "Saved."
      // Send the raw string always so an explicit '' actually clears it.
      notes,
    })
  }

  const handleMoveStage = () => {
    if (!stageTo) { setStageError('Pick a stage to move to'); return }
    if (!stageReason.trim()) { setStageError('Reason is required'); return }
    setStageError(null)
    moveStage.mutate({ to: stageTo, reason: stageReason }, { onSuccess: () => { setStageTo(''); setStageReason('') } })
  }

  const mutation = isCreateMode ? createCamp : updateCamp

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
          <div
            className="rounded-xl border p-5 mb-5"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            {isCreateMode ? (
              <div className="text-lg font-bold" style={{ color: 'var(--qms-text)' }}>New camp</div>
            ) : (
              camp && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>
                      {doctorName(camp.doctor)} · {divisionName(camp.division)}
                    </div>
                    <div className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
                      {camp.city}, {camp.state} · {new Date(camp.date).toLocaleDateString()}
                    </div>
                    {camp.project && (
                      <div className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
                        Project: {projectName(camp.project)}
                      </div>
                    )}
                  </div>
                  <CampStatusPillReal status={camp.status} />
                </div>
              )
            )}
          </div>

          {!isCreateMode && camp && (
            <div
              className="rounded-xl border p-5 mb-5"
              style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
            >
              <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>Move stage</h2>
              {legalNextStatuses.length === 0 ? (
                <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
                  This camp is in a terminal status — no further transitions are possible.
                </p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                      Move to
                    </Label>
                    <Select value={stageTo || undefined} onValueChange={(v) => setStageTo(v as CampStatus)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select next stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {legalNextStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                      Reason
                    </Label>
                    <Textarea value={stageReason} onChange={(e) => setStageReason(e.target.value)} placeholder="Required" />
                  </div>
                  {stageError && (
                    <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">{stageError}</div>
                  )}
                  {moveStage.isError && (
                    <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                      {(moveStage.error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to move stage.'}
                    </div>
                  )}
                  <Button onClick={handleMoveStage} disabled={moveStage.isPending || !canMoveStage} title={!canMoveStage ? 'You do not have permission to change this camp\'s stage' : undefined}>
                    {moveStage.isPending ? 'Moving…' : 'Move stage'}
                  </Button>
                </div>
              )}

              {!camp.fo && canWrite && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--qms-border)' }}>
                  <p className="text-[12px] mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    No field officer assigned yet.
                  </p>
                  <Button variant="outline" onClick={() => allocateFo.mutate()} disabled={allocateFo.isPending}>
                    {allocateFo.isPending ? 'Allocating…' : 'Auto-allocate nearest FO'}
                  </Button>
                  {allocateFo.isError && (
                    <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-2">
                      {(allocateFo.error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not allocate an FO.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Backend renamed stageHistory[].createdBy (a bare roleId string) to
              stageHistory[].actor: {roleId, name, email} — a resolved snapshot
              of who made each transition, captured at that moment. Found via a
              2026-07-24 test sweep that the backend side was correct end-to-end
              but this page never rendered stageHistory at all, so the data had
              nowhere to show up. */}
          {!isCreateMode && camp && camp.stageHistory.length > 0 && (
            <div
              className="rounded-xl border p-5 mb-5"
              style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
            >
              <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>Stage history</h2>
              <div className="space-y-3">
                {[...camp.stageHistory].reverse().map((entry, i) => (
                  <div
                    key={i}
                    className="text-[13px] pb-3"
                    style={i < camp.stageHistory.length - 1 ? { borderBottom: '1px solid var(--qms-border)' } : undefined}
                  >
                    <div style={{ color: 'var(--qms-text)' }}>
                      <span className="font-semibold">{entry.from}</span> → <span className="font-semibold">{entry.to}</span>
                    </div>
                    <div className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
                      {entry.actor?.name || entry.actor?.email || entry.actor?.roleId || 'Unknown actor'}
                      {' · '}
                      {new Date(entry.createdAt).toLocaleString()}
                    </div>
                    {entry.reason && (
                      <div className="text-[12px] mt-1 italic" style={{ color: 'var(--qms-text-muted)' }}>
                        “{entry.reason}”
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    <Select value={tenant || undefined} onValueChange={(v) => { setTenant(v ?? ''); setDivision('') }}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select company" /></SelectTrigger>
                      <SelectContent>
                        {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Division</Label>
                    <Select value={division || undefined} onValueChange={(v) => setDivision(v ?? '')} disabled={!tenant}>
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
                {/* key={doctor || 'empty'} forces a fresh mount once the real value
                    loads — same base-ui controlled/uncontrolled lock-in already
                    fixed on GeoProfileDetailPage.tsx's Type/Status selects
                    (useControlled.mjs decides controlled-vs-uncontrolled from
                    whether `value` is defined on the VERY FIRST render and never
                    revisits it; doctor/fo/mr/asm/rsm all start as '' before the
                    async camp fetch resolves). Found on this page too via a
                    2026-07-24 live-verification pass after the GeoProfile fix. */}
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
                  {/* key={fo || 'empty'}: same base-ui controlled/uncontrolled
                      lock-in fix as the Doctor select above, applied to all 4 of
                      fo/mr/asm/rsm — found live via a 2026-07-24 verification pass:
                      all 5 of this page's Selects showed a permanent placeholder
                      instead of the loaded value, even for actively-assigned roles. */}
                  <Select key={fo || 'empty'} value={fo || undefined} onValueChange={(v) => setFo(v ?? '')} disabled={!isCreateMode && !!camp && camp.status !== 'requested'}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Auto-assign nearest FO">{(v) => roleLabel(v as string)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {assignableRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>MR (optional)</Label>
                  <Select key={mr || 'empty'} value={mr || undefined} onValueChange={(v) => setMr(v ?? '')}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select MR">{(v) => roleLabel(v as string)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {assignableRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>ASM (optional)</Label>
                  <Select key={asm || 'empty'} value={asm || undefined} onValueChange={(v) => setAsm(v ?? '')}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select ASM">{(v) => roleLabel(v as string)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {assignableRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>RSM (optional)</Label>
                  <Select key={rsm || 'empty'} value={rsm || undefined} onValueChange={(v) => setRsm(v ?? '')}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select RSM">{(v) => roleLabel(v as string)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {assignableRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
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
        </>
      )}
    </div>
  )
}

export default CampDetailPageReal
