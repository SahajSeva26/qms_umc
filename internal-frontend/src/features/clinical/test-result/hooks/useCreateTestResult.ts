import { useCreateEntity } from '@/hooks/useCreateEntity'
import { testResultService } from '@/features/clinical/test-result/testResult.service'
import { testResultKeys } from '@/features/clinical/test-result/hooks/useTestResults'
import type { CreateTestResultPayload } from '@/features/clinical/test-result/testResult.types'

export const useCreateTestResult = () =>
  useCreateEntity((payload: CreateTestResultPayload) => testResultService.createTestResult(payload), testResultKeys.all)
