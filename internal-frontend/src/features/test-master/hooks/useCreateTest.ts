import { useCreateEntity } from '@/hooks/useCreateEntity'
import { testService } from '@/features/test-master/test.service'
import { testKeys } from '@/features/test-master/hooks/useTests'
import type { CreateTestPayload } from '@/features/test-master/testMaster.types'

export const useCreateTest = () => useCreateEntity((payload: CreateTestPayload) => testService.createTest(payload), testKeys.all)
