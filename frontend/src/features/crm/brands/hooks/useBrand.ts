import { useGetEntity } from '@/hooks/useGetEntity'
import { brandService } from '@/features/crm/brands/brand.service'
import { brandKeys } from '@/features/crm/brands/hooks/useBrands'

export const useBrand = (id: string | undefined) => useGetEntity(brandKeys.detail, brandService.getBrand, id)
