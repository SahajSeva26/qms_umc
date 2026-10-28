import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { brandService } from '@/features/crm/brands/brand.service'
import type { SearchBrandQuery } from '@/types/brand.types'

export const brandKeys = createEntityKeys<SearchBrandQuery>('brands', 'brand')

// `enabled` defaults to true; pass false while a caller has nothing to filter
// by yet, so this doesn't fire an unscoped, all-tenants call no one asked for.
export const useBrands = (query: SearchBrandQuery, enabled = true) =>
  useEntityQuery(brandKeys, (q) => brandService.searchBrands(q), query, { enabled })
