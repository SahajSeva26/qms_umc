import { useTestMastersByIds } from '@/features/test-master/hooks/useTestMastersByIds'
import type { TestConsumptionLineItem } from '@/features/test-master/testMaster.types'
import type { ProjectPopulatedTest } from '@/types/project.types'

// Derives "devices this project's camps will need" straight from real data — a project's own
// tests[] (TestMaster ids), each test's consumption[] narrowed to items of type 'device'. No
// separate "camp package"/template concept exists (or is needed): this is the same consumption
// data that already gates FO allocation (camp.service.ts's rolesHoldingAllDevices) and drives
// stock deduction at test-recording time, just surfaced here for the booking form to show up front.
export function useProjectRequiredDevices(projectTests: (ProjectPopulatedTest | string)[], enabled: boolean) {
  // GET /projects populates tests[] into {_id,code,name,therapy} (same pattern as
  // tenant/division/lead) — normalize either shape down to the bare id this hook needs.
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
