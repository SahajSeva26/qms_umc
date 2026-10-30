import { useGetEntity } from '@/hooks/useGetEntity'
import { divisionService } from '@/features/crm/divisions/division.service'
import { divisionKeys } from '@/features/crm/divisions/hooks/useDivisions'

export const useDivision = (id: string | undefined) => useGetEntity(divisionKeys.detail, divisionService.getDivision, id)
