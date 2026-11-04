import { useGetEntity } from '@/hooks/useGetEntity'
import { campsRealService } from '@/features/camps/campsReal.service'
import { campRealKeys } from '@/features/camps/hooks/useCampsReal'

export const useCampReal = (id: string | undefined) => useGetEntity(campRealKeys.detail, campsRealService.getCamp, id)
