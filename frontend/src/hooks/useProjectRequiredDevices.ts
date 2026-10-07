import { useTestMastersByIds } from '@/features/test-master/hooks/useTestMastersByIds'
import type { TestConsumptionLineItem } from '@/features/test-master/testMaster.types'
import type { ProjectPopulatedTest } from '@/types/project.types'

// Derives required devices from Project.tests[] -> TestMaster.consumption — same data that
// gates FO allocation, not a separate "camp package" concept.
export function useProjectRequiredDevices(projectTests: (ProjectPopulatedTest | string)[], enabled: boolean) {
  // GET /projects populates tests[] into objects, not bare ids — normalize either shape.
  const testIds = projectTests.map((t) => (typeof t === 'string' ? t : t._id)).filter((id): id is string => !!id)
  const { items: tests, isLoading, isError } = useTestMastersByIds(testIds, enabled)

  const byId = new Map<string, TestConsumptionLineItem>()
  for (const test of tests) {
    for (const line of test?.consumption ?? []) {
      if (line.item?.type === 'device' && line.item.id) {
        byId.set(line.item.id, line.item)
      }
    }
  }
  const devices = [...byId.values()].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))

  return { devices, isLoading: enabled && isLoading, isError: enabled && isError }
}
