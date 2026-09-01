import { useTestMastersByIds } from '@/features/test-master/hooks/useTestMastersByIds'
import { useTestResults } from '@/features/clinical/test-result/hooks/useTestResults'
import TestResultForm from '@/features/clinical/test-result/components/TestResultForm'
import type { CampEntity } from '@/types/campReal.types'

interface TestRecordingSectionProps {
  camp: CampEntity
  screeningId: string
}

// Configured tests come from camp.project.tests[] (ids only) — resolved into
// full records via useTestMastersByIds, then filtered to this camp's type.
const TestRecordingSection = ({ camp, screeningId }: TestRecordingSectionProps) => {
  // A raw string id here means camp.project arrived un-populated.
  const campProject = typeof camp.project === 'object' ? camp.project : undefined
  const testMasterIds = campProject?.tests ?? []

  // Hook call stays unconditional; "nothing to fetch yet" is expressed via `enabled`.
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
