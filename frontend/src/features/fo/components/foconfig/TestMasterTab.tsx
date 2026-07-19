import { useEffect, useState } from 'react'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { useFoConfig } from '@/features/fo/hooks/useFoConfig'
import type { FoTestDef, RuleLevel, RuleOp, TestInputType, TestRule } from '@/features/fo/foConfig.types'
import AddTestModal from '@/features/fo/components/foconfig/AddTestModal'

const INPUT_TYPES: TestInputType[] = ['number', 'text', 'select', 'positive_negative', 'multiselect']
const RULE_LEVELS: RuleLevel[] = ['critical', 'high', 'borderline', 'normal', 'low', 'info']
const RULE_OPS: RuleOp[] = ['>', '>=', '<', '<=', '=', 'between', 'eq_text']

interface TestMasterTabProps {
  selectedTestId: string | null
  onSelectTest: (id: string) => void
}

const TestMasterTab = ({ selectedTestId, onSelectTest }: TestMasterTabProps) => {
  const { tests, saveTest, deleteTest } = useFoConfig()
  // Local edit buffer for the selected test, tagged with the (id, updatedAt)
  // snapshot it was seeded from — reseeded from the master record at render
  // time whenever selection changes or a save lands, without a setState-in-
  // effect resync.
  const [edit, setEdit] = useState<{ seedKey: string; value: FoTestDef } | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  // Auto-select the first test once tests have loaded, without synchronously
  // setting state from within an effect body.
  const selectedTest = tests.find((t) => t.id === selectedTestId) ?? (!selectedTestId ? tests[0] : undefined) ?? null
  useEffect(() => {
    if (!selectedTestId && tests.length > 0) onSelectTest(tests[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTestId, tests])

  const seedKey = selectedTest ? `${selectedTest.id}:${selectedTest.updatedAt ?? ''}` : ''
  const draft = selectedTest ? (edit && edit.seedKey === seedKey ? edit.value : selectedTest) : null
  const setDraft = (value: FoTestDef | null | ((prev: FoTestDef | null) => FoTestDef | null)) => {
    const resolved = typeof value === 'function' ? value(draft) : value
    if (resolved) setEdit({ seedKey, value: resolved })
  }

  const handleAddTest = async (def: FoTestDef) => {
    await saveTest(def)
    onSelectTest(def.id)
    setAddOpen(false)
    toast.success(`Test ${def.id} added`)
  }

  const handleFieldChange = (patch: Partial<FoTestDef>) => setDraft((prev) => (prev ? { ...prev, ...patch } : prev))

  const handleSave = async () => {
    if (!draft) return
    await saveTest(draft)
    toast.success('Test saved')
  }

  const handleDelete = async () => {
    if (!draft) return
    if (!window.confirm(`Delete test "${draft.name}"? This cannot be undone.`)) return
    await deleteTest(draft.id)
    toast.success('Test deleted')
  }

  const addRule = async () => {
    if (!draft) return
    const nextRules: TestRule[] = [...(draft.rules ?? []), { level: 'normal', op: '>=', value: 0, message: '' }]
    const next = { ...draft, rules: nextRules }
    setDraft(next)
    await saveTest(next)
  }

  const updateRule = (idx: number, patch: Partial<TestRule>) => {
    if (!draft) return
    const nextRules = (draft.rules ?? []).map((r, i) => (i === idx ? { ...r, ...patch } : r))
    setDraft({ ...draft, rules: nextRules })
  }

  const removeRule = async (idx: number) => {
    if (!draft) return
    const nextRules = (draft.rules ?? []).filter((_, i) => i !== idx)
    const next = { ...draft, rules: nextRules }
    setDraft(next)
    await saveTest(next)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      <div className="w-full lg:w-[320px] shrink-0 rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="px-3.5 py-3 border-b flex items-center justify-between gap-2" style={{ borderColor: 'var(--qms-border)' }}>
          <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>
            Tests · {tests.length}
          </div>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}><FiPlus size={13} /> New</Button>
        </div>
        <div className="max-h-[560px] overflow-y-auto">
          {tests.map((t) => {
            const isSelected = selectedTestId === t.id
            return (
              <button
                key={t.id}
                onClick={() => onSelectTest(t.id)}
                className="w-full text-left px-3.5 py-2.5 border-b flex items-center justify-between gap-2 transition-colors"
                style={{ borderColor: 'var(--qms-border)', background: isSelected ? 'var(--qms-surface-strong)' : 'transparent' }}
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>{t.name} · {t.unit || '—'}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{t.id} · {(t.rules ?? []).length} rule(s)</div>
                </div>
                {t.system && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>system</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 min-w-0 w-full space-y-4">
        {!draft && (
          <div className="rounded-xl border p-8 text-center text-[13px]" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
            Select a test to edit.
          </div>
        )}

        {draft && (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <h2 className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>{draft.name} · {draft.id}</h2>
                <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{draft.unit || '—'} · {draft.refRange || '—'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={handleDelete}><FiTrash2 size={13} /> Delete</Button>
                <Button size="sm" onClick={handleSave}>Save</Button>
              </div>
            </div>

            <div className="rounded-xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                <FieldLabel label="Display name">
                  <Input value={draft.name} onChange={(e) => handleFieldChange({ name: e.target.value })} />
                </FieldLabel>
                <FieldLabel label="Short name">
                  <Input value={draft.shortName ?? ''} onChange={(e) => handleFieldChange({ shortName: e.target.value })} />
                </FieldLabel>
                <FieldLabel label="Unit">
                  <Input value={draft.unit ?? ''} onChange={(e) => handleFieldChange({ unit: e.target.value })} />
                </FieldLabel>
                <FieldLabel label="Reference range">
                  <Input value={draft.refRange ?? ''} onChange={(e) => handleFieldChange({ refRange: e.target.value })} />
                </FieldLabel>
                <FieldLabel label="Input type">
                  <Select value={draft.inputType} onValueChange={(v) => handleFieldChange({ inputType: v as TestInputType })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INPUT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldLabel>
                <FieldLabel label="Min">
                  <Input type="number" value={draft.min ?? ''} onChange={(e) => handleFieldChange({ min: e.target.value === '' ? null : Number(e.target.value) })} />
                </FieldLabel>
                <FieldLabel label="Max">
                  <Input type="number" value={draft.max ?? ''} onChange={(e) => handleFieldChange({ max: e.target.value === '' ? null : Number(e.target.value) })} />
                </FieldLabel>
                <div className="sm:col-span-2" style={{ gridColumn: 'span 2' }}>
                  <FieldLabel label="Options (comma-separated)">
                    <Input
                      value={(draft.options ?? []).join(',')}
                      onChange={(e) => handleFieldChange({ options: e.target.value ? e.target.value.split(',').map((s) => s.trim()) : [] })}
                    />
                  </FieldLabel>
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
              <div className="flex items-center justify-between gap-3 mb-1">
                <h3 className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>Interpretation rules ({(draft.rules ?? []).length})</h3>
                <Button size="sm" variant="outline" onClick={addRule}><FiPlus size={13} /> Add rule</Button>
              </div>
              <p className="text-[11px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>Rules are evaluated top to bottom. First matching rule wins.</p>

              {/* NOTE: the prototype's own rule editor has no "To" field, even
                  though its interpretation engine requires one for `between`
                  rules (only reachable via hand-authored seed data, e.g. the
                  FBS/BMI tests). Added here deliberately so between-operator
                  rules are actually editable in this admin UI — a real fix,
                  not a faithful-but-broken port. */}
              <div className="space-y-2">
                {(draft.rules ?? []).map((rule, idx) => (
                  <div key={idx} className="grid gap-2 items-center" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr)) auto' }}>
                    <Select value={rule.level} onValueChange={(v) => updateRule(idx, { level: v as RuleLevel })}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>{RULE_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={rule.op} onValueChange={(v) => updateRule(idx, { op: v as RuleOp })}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>{RULE_OPS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input placeholder="Value" value={rule.value ?? ''} onChange={(e) => updateRule(idx, { value: e.target.value })} />
                    <Input placeholder="From" type="number" value={rule.from ?? ''} onChange={(e) => updateRule(idx, { from: e.target.value === '' ? undefined : Number(e.target.value) })} />
                    <Input placeholder="To" type="number" value={rule.to ?? ''} onChange={(e) => updateRule(idx, { to: e.target.value === '' ? undefined : Number(e.target.value) })} />
                    <Input placeholder="Message" className="col-span-2" style={{ gridColumn: 'span 2' }} value={rule.message} onChange={(e) => updateRule(idx, { message: e.target.value })} />
                    <button onClick={() => removeRule(idx)} style={{ color: 'var(--danger)' }}><FiTrash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <AddTestModal open={addOpen} onClose={() => setAddOpen(false)} onSave={handleAddTest} />
    </div>
  )
}

const FieldLabel = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-[11px] font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--qms-text-muted)' }}>{label}</label>
    {children}
  </div>
)

export default TestMasterTab
