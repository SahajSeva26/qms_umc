import { useCreateEntity } from '@/hooks/useCreateEntity'
import { vendorMasterService } from '@/features/inventory/real/vendorMaster.service'
import { vendorMasterKeys } from '@/features/inventory/real/hooks/useVendorMasters'
import type { CreateVendorMasterPayload } from '@/types/vendorMaster.types'

export const useCreateVendorMaster = () =>
  useCreateEntity((payload: CreateVendorMasterPayload) => vendorMasterService.createVendorMaster(payload), vendorMasterKeys.all)
