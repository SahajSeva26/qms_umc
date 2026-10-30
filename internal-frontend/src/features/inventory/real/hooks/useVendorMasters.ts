import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { vendorMasterService } from '@/features/inventory/real/vendorMaster.service'
import type { SearchVendorMasterQuery } from '@/types/vendorMaster.types'

export const vendorMasterKeys = createEntityKeys<SearchVendorMasterQuery>('vendor-masters')

export const useVendorMasters = (query: SearchVendorMasterQuery, enabled = true) =>
  useEntityQuery(vendorMasterKeys, (q) => vendorMasterService.searchVendorMasters(q), query, { enabled })
