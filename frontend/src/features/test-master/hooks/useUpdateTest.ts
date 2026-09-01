import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { testService } from '@/features/test-master/test.service'
import { testKeys } from '@/features/test-master/hooks/useTests'
import type { UpdateTestPayload } from '@/features/test-master/testMaster.types'

// Invalidates both the list and the detail cache entry — the edit modal
// reads from testKeys.detail(id) (via useTest), so invalidating only
// testKeys.all would leave a stale detail entry behind after a save.
export const useUpdateTest = (id: string) =>
  useUpdateEntity((payload: UpdateTestPayload) => testService.updateTest(id, payload), [testKeys.all, testKeys.detail(id)])
