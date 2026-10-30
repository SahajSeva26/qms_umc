import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { vendorMasterService } from '@/features/inventory/real/vendorMaster.service'
import { vendorMasterKeys } from '@/features/inventory/real/hooks/useVendorMasters'
import type { UpdateVendorMasterPayload } from '@/types/vendorMaster.types'

export const useUpdateVendorMaster = (id: string) =>
  useUpdateEntity((payload: UpdateVendorMasterPayload) => vendorMasterService.updateVendorMaster(id, payload), [vendorMasterKeys.all])
