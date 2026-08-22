import { useCreateEntity } from '@/hooks/useCreateEntity'
import { campsRealService } from '@/features/camps/campsReal.service'
import { campRealKeys } from '@/features/camps/hooks/useCampsReal'
import type { CreateCampPayload } from '@/features/camps/campReal.types'

export const useCreateCamp = () => useCreateEntity((payload: CreateCampPayload) => campsRealService.createCamp(payload), campRealKeys.all)
