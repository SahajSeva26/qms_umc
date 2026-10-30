import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { campsRealService } from '@/features/camps/campsReal.service'
import { campRealKeys } from '@/features/camps/hooks/useCampsReal'
import type { UpdateCampPayload } from '@/types/campReal.types'

export const useUpdateCamp = (id: string) =>
  useUpdateEntity((payload: UpdateCampPayload) => campsRealService.updateCamp(id, payload), [campRealKeys.detail(id), campRealKeys.all])
