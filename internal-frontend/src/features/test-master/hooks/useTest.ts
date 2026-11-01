import { useGetEntity } from '@/hooks/useGetEntity'
import { testService } from '@/features/test-master/test.service'
import { testKeys } from '@/features/test-master/hooks/useTests'

export const useTest = (id: string | undefined) => useGetEntity(testKeys.detail, testService.getTest, id)
