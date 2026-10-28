import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { brandService } from '@/features/crm/brands/brand.service'
import { brandKeys } from '@/features/crm/brands/hooks/useBrands'
import type { UpdateBrandPayload } from '@/types/brand.types'

export const useUpdateBrand = (id: string) =>
  useUpdateEntity((payload: UpdateBrandPayload) => brandService.updateBrand(id, payload), [brandKeys.detail(id), brandKeys.all])
