import { useCreateEntity } from '@/hooks/useCreateEntity'
import { testService } from '@/features/tests/test.service'
import { testKeys } from '@/features/tests/hooks/useTests'
import type { CreateTestPayload } from '@/types/test.types'

export const useCreateTest = () => useCreateEntity((payload: CreateTestPayload) => testService.createTest(payload), testKeys.all)
