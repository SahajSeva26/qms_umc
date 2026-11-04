import { useCreateEntity } from '@/hooks/useCreateEntity'
import { brandService } from '@/features/crm/brands/brand.service'
import { brandKeys } from '@/features/crm/brands/hooks/useBrands'
import type { CreateBrandPayload } from '@/types/brand.types'

export const useCreateBrand = () =>
  useCreateEntity((payload: CreateBrandPayload) => brandService.createBrand(payload), brandKeys.all)
