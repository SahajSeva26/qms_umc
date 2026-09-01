import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FieldLabel from '@/components/ui/FieldLabel'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useCreateTestResult } from '@/features/clinical/test-result/hooks/useCreateTestResult'
import type { TestEntity, TestMasterConfigInput } from '@/features/test-master/testMaster.types'
import type { TestResultInterpretation } from '@/features/clinical/test-result/testResult.types'

const INTERPRETATION_OPTIONS: TestResultInterpretation[] = ['NORMAL', 'LOW', 'HIGH', 'CRITICAL', 'INVALID']

interface TestResultFormProps {
  screeningId: string
  testMaster: TestEntity
}

// One dynamic field per TestMaster.config.inputs[] entry — currently this
// only ever renders ONE field per test (config.inputs[] is a list, but the
// backend's Test.result is a single {key,value,unit}, not an array — so if a
// TestMaster ever has more than one config input, only the first drives the
// recorded result). Flagged rather than silently picking one: most catalog
// tests will have exactly one input (e.g. "Blood Sugar Level"), and the
// backend's own result shape doesn't support recording more than one value
// per Test row today.
const TestResultForm = ({ screeningId, testMaster }: TestResultFormProps) => {
  const input: TestMasterConfigInput | undefined = testMaster.config?.inputs?.[0]
  const [value, setValue] = useState('')
  const [interpretation, setInterpretation] = useState<TestResultInterpretation | ''>('')
  const createMutation = useCreateTestResult()
  // Unique per rendered instance — TestRecordingSection renders one
  // TestResultForm per applicable test side by side, so a hardcoded id would
  // collide across cards.
  const valueFieldId = useId()
  const interpretationFieldId = useId()

  if (!input) {
    return (
      <div className="rounded-lg border p-3 text-[12px]" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
        <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{testMaster.name}</span> has no result fields configured
        yet — add one via Test Master before it can be recorded here.
      </div>
    )
  }

  const handleSubmit = () => {
    if (!value.trim()) return
    createMutation.mutate({
      screening: screeningId,
      type: testMaster.id,
      result: {
        key: input.label,
        value,
        // KNOWN BACKEND GAP, not a real fix (see md-files/TODO.md): the
        // backend's result.unit is unconditionally z.string().min(1) — there
        // is no way to omit or null it, even though a config input's own
        // unit is genuinely optional and Boolean fields never collect one at
        // all. Sending '' 400s, so this writes a literal "N/A" into the
        // saved record instead. That's a real, if latent, data-integrity
        // compromise: nothing renders result.unit verbatim today, but any
        // future report/export that does would print "Yes N/A" for a
        // Boolean result. The correct fix is backend (make ResultSchema's
        // unit optional and have the mapper omit it when absent) — revert
        // this fallback once that ships.
        unit: input.unit || 'N/A',
        ...(interpretation ? { interpretation } : {}),
      },
    })
  }

  return (
    <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: 'var(--qms-border)' }}>
      <div className="text-[12.5px] font-bold" style={{ color: 'var(--qms-text)' }}>{testMaster.name}</div>

      <div>
        <FieldLabel htmlFor={valueFieldId}>{input.label}{input.unit ? ` (${input.unit})` : ''}</FieldLabel>
        {input.type === 'select' ? (
          <Select value={value} onValueChange={(v) => setValue(v ?? '')}>
            <SelectTrigger id={valueFieldId} className="w-full text-[13px]"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {(input.options ?? []).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : input.type === 'boolean' ? (
          <Select value={value} onValueChange={(v) => setValue(v ?? '')}>
            <SelectTrigger id={valueFieldId} className="w-full text-[13px]"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={valueFieldId}
            type={input.type === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="text-[13px]"
          />
        )}
      </div>

      <div>
        <FieldLabel htmlFor={interpretationFieldId}>Interpretation (optional)</FieldLabel>
        <Select value={interpretation} onValueChange={(v) => setInterpretation((v as TestResultInterpretation) ?? '')}>
          <SelectTrigger id={interpretationFieldId} className="w-full text-[13px]"><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            {INTERPRETATION_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {createMutation.isError && (
        <div className="text-[11px] rounded-lg px-2.5 py-1.5 bg-danger-soft border border-danger text-danger">
          {(createMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not record this test.'}
        </div>
      )}

      <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending || !value.trim()}>
        {createMutation.isPending ? 'Recording…' : 'Record result'}
      </Button>
    </div>
  )
}

export default TestResultForm
