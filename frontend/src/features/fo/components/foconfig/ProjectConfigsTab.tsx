import { useEffect, useMemo, useState } from 'react'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { useProjectsDataShared } from '@/hooks/useProjectsDataShared'
import { useFoConfig } from '@/features/fo/hooks/useFoConfig'
import type { FoProjectConfig, PatientFieldDef, PhotoRequirement } from '@/features/fo/foConfig.types'

const PATIENT_FIELD_TYPES: PatientFieldDef['type'][] = ['text', 'number', 'tel', 'email', 'date', 'time', 'select', 'textarea', 'radio', 'file', 'signature', 'qr']

type EditableConfig = FoProjectConfig & { isNew?: boolean }

const ProjectConfigsTab = () => {
  const { projects } = useProjectsDataShared()
  const { projectConfigs, tests, saveProjectConfig, deleteProjectConfig, getProjectConfigOrBlank } = useFoConfig()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Blank in-memory defaults for projects that have no saved config yet,
  // keyed by projectId — filled in lazily by the effect below the first time
  // a not-yet-configured project is selected.
  const [blanks, setBlanks] = useState<Record<string, FoProjectConfig>>({})
  // Local edit buffer for the selected project's config, so field edits
  // render immediately without waiting for the save round-trip.
  const [draft, setDraft] = useState<EditableConfig | null>(null)

  const configuredIds = useMemo(() => new Set(projectConfigs.map((c) => c.projectId)), [projectConfigs])

  // Auto-select the first project once projects have loaded, without
  // synchronously setting state from within an effect body.
  const selectedProject = projects.find((p) => p.id === selectedId) ?? (!selectedId ? projects[0] : undefined) ?? null

  const existingConfig = selectedProject ? projectConfigs.find((c) => c.projectId === selectedProject.id) : undefined
  const blankConfig = selectedProject ? blanks[selectedProject.id] : undefined
  const baseConfig: EditableConfig | null = selectedProject
    ? existingConfig
      ? { ...existingConfig, isNew: false }
      : blankConfig
        ? { ...blankConfig, isNew: true }
        : null
    : null

  useEffect(() => {
    if (!selectedProject || existingConfig || blanks[selectedProject.id]) return
    let cancelled = false
    getProjectConfigOrBlank(selectedProject).then((blank) => {
      if (!cancelled) setBlanks((prev) => ({ ...prev, [selectedProject.id]: blank }))
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id, existingConfig])

  const cfg = draft && draft.projectId === selectedProject?.id ? draft : baseConfig

  const persist = async (patch: Partial<FoProjectConfig>) => {
    if (!selectedProject || !cfg) return
    setDraft({ ...cfg, ...patch })
    await saveProjectConfig(selectedProject.id, patch)
  }

  const handleReset = async () => {
    if (!selectedProject) return
    if (!window.confirm('Reset this project to defaults? The saved config will be deleted.')) return
    await deleteProjectConfig(selectedProject.id)
    setDraft(null)
    toast.success('Project config reset to defaults')
  }

  const handleSave = async () => {
    if (!selectedProject || !cfg) return
    const rest: Partial<EditableConfig> = { ...cfg }
    delete rest.isNew
    await saveProjectConfig(selectedProject.id, rest)
    toast.success('Project config saved')
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      <div className="w-full lg:w-[320px] shrink-0 rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="px-3.5 py-3 border-b" style={{ borderColor: 'var(--qms-border)' }}>
          <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>
            Projects · {projects.length}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
            {configuredIds.size} configured
          </div>
        </div>
        <div className="max-h-[560px] overflow-y-auto">
          {projects.length === 0 && (
            <div className="px-3.5 py-6 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No projects in master.</div>
          )}
          {projects.map((p) => {
            const isConfigured = configuredIds.has(p.id)
            const isSelected = selectedId === p.id
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className="w-full text-left px-3.5 py-2.5 border-b flex items-center justify-between gap-2 transition-colors"
                style={{ borderColor: 'var(--qms-border)', background: isSelected ? 'var(--qms-surface-strong)' : 'transparent' }}
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>{p.name}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{p.type || p.therapy || '—'}</div>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={isConfigured
                    ? { background: 'color-mix(in oklch, var(--qms-teal), transparent 85%)', color: 'var(--qms-teal)' }
                    : { background: 'color-mix(in oklch, var(--qms-brand), transparent 88%)', color: 'var(--qms-brand)' }}
                >
                  {isConfigured ? 'configured' : 'defaults'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 min-w-0 w-full space-y-4">
        {!selectedProject && (
          <div className="rounded-xl border p-8 text-center text-[13px]" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
            Select a project to configure.
          </div>
        )}

        {selectedProject && cfg && (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>{selectedProject.name}</h2>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={cfg.isNew
                    ? { background: 'color-mix(in oklch, var(--qms-brand), transparent 88%)', color: 'var(--qms-brand)' }
                    : { background: 'color-mix(in oklch, var(--qms-teal), transparent 85%)', color: 'var(--qms-teal)' }}
                >
                  {cfg.isNew ? 'unsaved defaults' : 'configured'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!cfg.isNew && (
                  <Button variant="outline" size="sm" onClick={handleReset}>Reset</Button>
                )}
                <Button size="sm" onClick={handleSave}>Save config</Button>
              </div>
            </div>

            <TopSettingsCard cfg={cfg} onChange={persist} />
            <PatientFieldsCard cfg={cfg} onChange={persist} />
            <TestsCard cfg={cfg} allTests={tests} onChange={persist} />
            <ConsentCard cfg={cfg} onChange={persist} />
            <SetupPhotosCard cfg={cfg} onChange={persist} />
            <AdditionalPhotosCard cfg={cfg} onChange={persist} />
            <DelayReasonsCard cfg={cfg} onChange={persist} />
          </>
        )}
      </div>
    </div>
  )
}

const Card = ({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) => (
  <div className="rounded-xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
    <div className="flex items-center justify-between gap-3 mb-3">
      <h3 className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{title}</h3>
      {action}
    </div>
    {children}
  </div>
)

const TopSettingsCard = ({ cfg, onChange }: { cfg: EditableConfig; onChange: (patch: Partial<FoProjectConfig>) => void }) => (
  <Card title="Check-in & reporting settings">
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
      <Field label="Check-in radius (m)">
        <Input type="number" value={cfg.checkinRadiusM ?? 300} onChange={(e) => onChange({ checkinRadiusM: Number(e.target.value) || 0 })} />
      </Field>
      <Field label="TAT (hrs)">
        <Input type="number" value={cfg.tatHours ?? 24} onChange={(e) => onChange({ tatHours: Number(e.target.value) || 0 })} />
      </Field>
      <Field label="Face match">
        <Select value={cfg.faceMatch ? 'On' : 'Off'} onValueChange={(v) => onChange({ faceMatch: v === 'On' })}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="On">On</SelectItem><SelectItem value="Off">Off</SelectItem></SelectContent>
        </Select>
      </Field>
      <Field label="Report mandatory on close">
        <Select value={cfg.mandatoryReportOnClose ? 'Yes' : 'No'} onValueChange={(v) => onChange({ mandatoryReportOnClose: v === 'Yes' })}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
        </Select>
      </Field>
    </div>
  </Card>
)

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-[11px] font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--qms-text-muted)' }}>{label}</label>
    {children}
  </div>
)

const PatientFieldsCard = ({ cfg, onChange }: { cfg: EditableConfig; onChange: (patch: Partial<FoProjectConfig>) => void }) => {
  const fields = cfg.patientFields ?? []

  const updateField = (idx: number, patch: Partial<PatientFieldDef>) => {
    const next = fields.map((f, i) => (i === idx ? { ...f, ...patch } : f))
    onChange({ patientFields: next })
  }

  const removeField = (idx: number) => onChange({ patientFields: fields.filter((_, i) => i !== idx) })

  const addField = () => onChange({ patientFields: [...fields, { id: 'newfield', label: 'New field', type: 'text', required: false }] })

  return (
    <Card
      title={`Patient fields (${fields.length})`}
      action={<Button size="sm" variant="outline" onClick={addField}><FiPlus size={13} /> Add field</Button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr>
              {['ID', 'Label', 'Type', 'Required', 'Options', ''].map((h) => (
                <th key={h} className="text-left font-semibold px-2 py-1.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((f, idx) => (
              <tr key={idx} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                <td className="px-2 py-1.5"><Input value={f.id} onChange={(e) => updateField(idx, { id: e.target.value })} /></td>
                <td className="px-2 py-1.5"><Input value={f.label} onChange={(e) => updateField(idx, { label: e.target.value })} /></td>
                <td className="px-2 py-1.5">
                  <Select value={f.type} onValueChange={(v) => updateField(idx, { type: v as PatientFieldDef['type'] })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PATIENT_FIELD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-1.5">
                  <Select value={f.required ? 'Yes' : 'No'} onValueChange={(v) => updateField(idx, { required: v === 'Yes' })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={(f.options ?? []).join(',')}
                    onChange={(e) => updateField(idx, { options: e.target.value ? e.target.value.split(',').map((s) => s.trim()) : [] })}
                    placeholder="for select/radio: a,b,c"
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button onClick={() => removeField(idx)} style={{ color: 'var(--danger)' }}><FiTrash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

const TestsCard = ({ cfg, allTests, onChange }: { cfg: EditableConfig; allTests: { id: string; name: string }[]; onChange: (patch: Partial<FoProjectConfig>) => void }) => {
  const testIds = cfg.tests ?? []
  const testMap = new Map(allTests.map((t) => [t.id, t]))
  const available = allTests.filter((t) => !testIds.includes(t.id))

  const addTest = (id: string | null) => {
    if (!id) return
    onChange({ tests: [...testIds, id] })
  }

  const removeTest = (id: string) => onChange({ tests: testIds.filter((t) => t !== id) })

  return (
    <Card
      title={`Tests in this project (${testIds.length})`}
      action={
        <Select value="" onValueChange={addTest}>
          <SelectTrigger className="w-56"><SelectValue placeholder="+ add test from master…" /></SelectTrigger>
          <SelectContent>
            {available.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.id})</SelectItem>)}
          </SelectContent>
        </Select>
      }
    >
      {testIds.length === 0 && (
        <div className="text-[13px] py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>No tests configured. Pick from the dropdown above.</div>
      )}
      {testIds.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr>
                {['Test', 'Unit', 'Ref range', 'Rules', ''].map((h) => (
                  <th key={h} className="text-left font-semibold px-2 py-1.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {testIds.map((tid) => {
                const t = testMap.get(tid)
                if (!t) {
                  return (
                    <tr key={tid} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                      <td colSpan={5} className="px-2 py-1.5">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                          {tid} · MISSING IN TEST MASTER
                        </span>
                        <button onClick={() => removeTest(tid)} className="ml-2" style={{ color: 'var(--danger)' }}><FiTrash2 size={14} className="inline" /></button>
                      </td>
                    </tr>
                  )
                }
                const full = t as unknown as { id: string; name: string; unit?: string; refRange?: string; rules?: unknown[] }
                return (
                  <tr key={tid} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                    <td className="px-2 py-1.5">
                      <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{full.name}</div>
                      <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{full.id}</div>
                    </td>
                    <td className="px-2 py-1.5" style={{ color: 'var(--qms-text-soft)' }}>{full.unit || '—'}</td>
                    <td className="px-2 py-1.5" style={{ color: 'var(--qms-text-soft)' }}>{full.refRange || '—'}</td>
                    <td className="px-2 py-1.5" style={{ color: 'var(--qms-text-soft)' }}>{(full.rules ?? []).length} rule(s)</td>
                    <td className="px-2 py-1.5 text-center">
                      <button onClick={() => removeTest(tid)} style={{ color: 'var(--danger)' }}><FiTrash2 size={14} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

const ConsentCard = ({ cfg, onChange }: { cfg: EditableConfig; onChange: (patch: Partial<FoProjectConfig>) => void }) => {
  const consent = cfg.consent
  const updateConsent = (patch: Partial<FoProjectConfig['consent']>) => onChange({ consent: { ...consent, ...patch } })
  return (
    <Card title="Consent">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <Field label="Primary method">
          <Select value={consent.type} onValueChange={(v) => updateConsent({ type: v as FoProjectConfig['consent']['type'] })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="signature">signature</SelectItem>
              <SelectItem value="otp">otp</SelectItem>
              <SelectItem value="upload">upload</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Mandatory">
          <Select value={consent.mandatory ? 'Yes' : 'No'} onValueChange={(v) => updateConsent({ mandatory: v === 'Yes' })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
          </Select>
        </Field>
        <Field label="Enable OTP backup">
          <Select value={consent.otpEnabled ? 'Yes' : 'No'} onValueChange={(v) => updateConsent({ otpEnabled: v === 'Yes' })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
          </Select>
        </Field>
        <Field label="Allow upload">
          <Select value={consent.uploadEnabled ? 'Yes' : 'No'} onValueChange={(v) => updateConsent({ uploadEnabled: v === 'Yes' })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
          </Select>
        </Field>
      </div>
    </Card>
  )
}

const PhotosCard = ({
  title, list, onChange, defaultRequired,
}: {
  title: string
  list: PhotoRequirement[]
  onChange: (list: PhotoRequirement[]) => void
  defaultRequired: boolean
}) => {
  const update = (idx: number, patch: Partial<PhotoRequirement>) => onChange(list.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  const remove = (idx: number) => onChange(list.filter((_, i) => i !== idx))
  const add = () => onChange([...list, { id: 'photo', label: 'New photo', required: defaultRequired }])

  return (
    <Card title={title} action={<Button size="sm" variant="outline" onClick={add}><FiPlus size={13} /> Add</Button>}>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr>
              {['ID', 'Label', 'Required', ''].map((h) => (
                <th key={h} className="text-left font-semibold px-2 py-1.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((p, idx) => (
              <tr key={idx} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                <td className="px-2 py-1.5"><Input value={p.id} onChange={(e) => update(idx, { id: e.target.value })} /></td>
                <td className="px-2 py-1.5"><Input value={p.label} onChange={(e) => update(idx, { label: e.target.value })} /></td>
                <td className="px-2 py-1.5">
                  <Select value={p.required ? 'Yes' : 'No'} onValueChange={(v) => update(idx, { required: v === 'Yes' })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button onClick={() => remove(idx)} style={{ color: 'var(--danger)' }}><FiTrash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

const SetupPhotosCard = ({ cfg, onChange }: { cfg: EditableConfig; onChange: (patch: Partial<FoProjectConfig>) => void }) => (
  <PhotosCard
    title={`Setup photos (${(cfg.setupPhotos ?? []).length}) · always mandatory`}
    list={cfg.setupPhotos ?? []}
    onChange={(list) => onChange({ setupPhotos: list })}
    defaultRequired={true}
  />
)

const AdditionalPhotosCard = ({ cfg, onChange }: { cfg: EditableConfig; onChange: (patch: Partial<FoProjectConfig>) => void }) => (
  <PhotosCard
    title={`Additional photos (${(cfg.additionalPhotos ?? []).length}) · optional`}
    list={cfg.additionalPhotos ?? []}
    onChange={(list) => onChange({ additionalPhotos: list })}
    defaultRequired={false}
  />
)

const DelayReasonsCard = ({ cfg, onChange }: { cfg: EditableConfig; onChange: (patch: Partial<FoProjectConfig>) => void }) => (
  <Card title="Delay reasons (used on late check-in)">
    <Textarea
      rows={4}
      value={(cfg.delayReasons ?? []).join('\n')}
      onChange={(e) => onChange({ delayReasons: e.target.value.split('\n') })}
    />
    <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>One reason per line</p>
  </Card>
)

export default ProjectConfigsTab
