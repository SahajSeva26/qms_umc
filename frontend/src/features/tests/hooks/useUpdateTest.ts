import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { testService } from '@/features/tests/test.service'
import { testKeys } from '@/features/tests/hooks/useTests'
import type { UpdateTestPayload } from '@/types/test.types'

// Invalidates both the list and the detail cache entry — the edit modal
// reads from testKeys.detail(id) (via useTest), so invalidating only
// testKeys.all would leave a stale detail entry behind after a save.
export const useUpdateTest = (id: string) =>
  useUpdateEntity((payload: UpdateTestPayload) => testService.updateTest(id, payload), [testKeys.all, testKeys.detail(id)])
