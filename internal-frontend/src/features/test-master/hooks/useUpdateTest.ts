import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { testService } from '@/features/test-master/test.service'
import { testKeys } from '@/features/test-master/hooks/useTests'
import type { UpdateTestPayload } from '@/features/test-master/testMaster.types'

// Invalidates both list and detail cache entries — the edit modal reads
// testKeys.detail(id) directly, which testKeys.all alone wouldn't refresh.
export const useUpdateTest = (id: string) =>
  useUpdateEntity((payload: UpdateTestPayload) => testService.updateTest(id, payload), [testKeys.all, testKeys.detail(id)])
