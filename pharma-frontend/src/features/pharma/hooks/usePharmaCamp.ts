import { useGetEntity } from '@/hooks/useGetEntity'
import { pharmaCampsService } from '@/features/pharma/pharmaCamps.service'

const keyFor = (id: string) => ['pharma-camp', id] as const

// GET /camps/:id for the Camp Dossier (drawer + standalone page) — a single camp by id,
// independent of usePharmaMyCamps' own paginated list. Mirrors internal-frontend's
// usePharmaCamp.ts.
export const usePharmaCamp = (id: string | undefined) => useGetEntity(keyFor, pharmaCampsService.getCamp, id)
