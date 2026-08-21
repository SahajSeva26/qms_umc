import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { divisionService } from '@/features/crm/divisions/division.service'
import { divisionKeys } from '@/features/crm/divisions/hooks/useDivisions'
import type { UpdateDivisionPayload } from '@/types/crm.types'

export const useUpdateDivision = (id: string) =>
  useUpdateEntity((payload: UpdateDivisionPayload) => divisionService.updateDivision(id, payload), [divisionKeys.detail(id), divisionKeys.all])
