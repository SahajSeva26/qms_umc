import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { testResultService } from '@/features/clinical/test-result/testResult.service'
import { testResultKeys } from '@/features/clinical/test-result/hooks/useTestResults'
import type { UpdateTestResultPayload } from '@/features/clinical/test-result/testResult.types'

export const useUpdateTestResult = (id: string) =>
  useUpdateEntity(
    (payload: UpdateTestResultPayload) => testResultService.updateTestResult(id, payload),
    [testResultKeys.all, testResultKeys.detail(id)],
  )
