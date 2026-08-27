import { useGetEntity } from '@/hooks/useGetEntity'
import { testService } from '@/features/tests/test.service'
import { testKeys } from '@/features/tests/hooks/useTests'

export const useTest = (id: string | undefined) => useGetEntity(testKeys.detail, testService.getTest, id)
