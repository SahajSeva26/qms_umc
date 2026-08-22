import { useCreateEntity } from '@/hooks/useCreateEntity'
import { divisionService } from '@/features/crm/divisions/division.service'
import { divisionKeys } from '@/features/crm/divisions/hooks/useDivisions'
import type { CreateDivisionPayload } from '@/features/crm/crm.types'

export const useCreateDivision = () =>
  useCreateEntity((payload: CreateDivisionPayload) => divisionService.createDivision(payload), divisionKeys.all)
