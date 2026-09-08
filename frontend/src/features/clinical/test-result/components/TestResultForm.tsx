import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FieldLabel from '@/components/ui/FieldLabel'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useCreateTestResult } from '@/features/clinical/test-result/hooks/useCreateTestResult'
import type { TestEntity, TestMasterConfigInput } from '@/features/test-master/testMaster.types'
import type { TestResultInterpretation } from '@/features/clinical/test-result/testResult.types'
import { getApiErrorMessage } from '@/utils/apiError'

const INTERPRETATION_OPTIONS: TestResultInterpretation[] = ['NORMAL', 'LOW', 'HIGH', 'CRITICAL', 'INVALID']

interface TestResultFormProps {
  screeningId: string
  testMaster: TestEntity
}

// config.inputs[] is a list, but backend Test.result is a single {key,value,unit} —
// only the first input ever drives the recorded result if more than one exists.
const TestResultForm = ({ screeningId, testMaster }: TestResultFormProps) => {
  const input: TestMasterConfigInput | undefined = testMaster.config?.inputs?.[0]
  const [value, setValue] = useState('')
  const [interpretation, setInterpretation] = useState<TestResultInterpretation | ''>('')
  const createMutation = useCreateTestResult()
  // useId avoids collisions across the multiple TestResultForm cards rendered side by side.
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
        // Backend result.unit is required (z.string().min(1)) with no way to omit it;
        // '' 400s, so unit-less/boolean inputs fall back to this literal instead.
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
          {getApiErrorMessage(createMutation.error, 'Could not record this test.')}
        </div>
      )}

      <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending || !value.trim()}>
        {createMutation.isPending ? 'Recording…' : 'Record result'}
      </Button>
    </div>
  )
}

export default TestResultForm
