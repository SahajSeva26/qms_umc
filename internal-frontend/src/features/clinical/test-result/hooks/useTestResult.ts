import { useGetEntity } from '@/hooks/useGetEntity'
import { testResultService } from '@/features/clinical/test-result/testResult.service'
import { testResultKeys } from '@/features/clinical/test-result/hooks/useTestResults'

export const useTestResult = (id: string | undefined) => useGetEntity(testResultKeys.detail, testResultService.getTestResult, id)
