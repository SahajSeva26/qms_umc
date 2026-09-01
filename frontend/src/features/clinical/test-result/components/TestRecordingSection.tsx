import { useTestMastersByIds } from '@/features/test-master/hooks/useTestMastersByIds'
import { useTestResults } from '@/features/clinical/test-result/hooks/useTestResults'
import TestResultForm from '@/features/clinical/test-result/components/TestResultForm'
import type { CampEntity } from '@/types/campReal.types'

interface TestRecordingSectionProps {
  camp: CampEntity
  screeningId: string
}

// Derives "which TestMaster catalog tests are configured for this camp's
// project" from Project.tests[] (the same field the Project wizard's own
// test-chip picker writes to) — no separate Project fetch. camp.project now
// arrives already populated with `tests` (camp.service.ts's
// `select: 'name status tests'`), so this reads it directly off the Camp
// record the caller already has. Camp.project.tests is only a list of ids —
// the backend doesn't include each test's name/config/campType — so
// useTestMastersByIds still resolves those ids into full records for
// rendering. A test's own campType is then checked against this camp's own
// type before it's shown, mirroring the backend's own save-time rejection.
const TestRecordingSection = ({ camp, screeningId }: TestRecordingSectionProps) => {
  // Only the populated form of camp.project carries `tests` — a raw string
  // id would mean this component was reached with un-populated camp data.
  const campProject = typeof camp.project === 'object' ? camp.project : undefined
  const testMasterIds = campProject?.tests ?? []

  // Every hook call stays unconditional, same as before this change —
  // "no populated project" / "no ids yet" are expressed via `enabled`, never
  // by returning early before this call.
  const { items: testMasters, isLoading: isTestMastersLoading, isError: isTestMastersError } = useTestMastersByIds(
    testMasterIds,
    !!campProject && testMasterIds.length > 0,
  )

  const { data: resultsData } = useTestResults({ screening: screeningId, limit: String(testMasterIds.length || 1) }, testMasterIds.length > 0)
  const recordedTypeIds = new Set((resultsData?.data?.items ?? []).map((r) => r.type?.id).filter(Boolean))

  if (typeof camp.project === 'string') {
    return <EmptyState text="The camp's test set is unavailable — reload the camp." />
  }

  if (!campProject) {
    return <EmptyState text="This camp has no linked project — no test set is configured to record against." />
  }

  if (testMasterIds.length === 0) {
    return <EmptyState text="No tests are configured for this camp's project." />
  }

  if (isTestMastersError) {
    return <EmptyState text="Couldn't load one or more tests in this camp's test set." />
  }

  if (isTestMastersLoading) {
    return <EmptyState text="Loading tests…" />
  }

  const applicableTests = testMasters.filter((test) => test.campType === camp.type)

  if (applicableTests.length === 0) {
    return <EmptyState text="No tests are configured for this camp type." />
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Record test results</h2>
      <div className="grid grid-cols-2 gap-2.5">
        {applicableTests.map((tm) =>
          recordedTypeIds.has(tm.id) ? (
            <div key={tm.id} className="rounded-lg border p-3 text-[12px]" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
              <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{tm.name}</span> — already recorded
            </div>
          ) : (
            <TestResultForm key={tm.id} screeningId={screeningId} testMaster={tm} />
          ),
        )}
      </div>
    </div>
  )
}

const EmptyState = ({ text }: { text: string }) => (
  <div className="rounded-xl border p-3.5 text-[13px]" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
    {text}
  </div>
)

export default TestRecordingSection
