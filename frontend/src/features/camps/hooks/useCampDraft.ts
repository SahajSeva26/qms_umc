import { useReducer } from 'react'
import { campRefId } from '@/features/camps/campsReal.utils'
import type { BillingType, CampEntity, CampType } from '@/types/campReal.types'

export interface CampDraft {
  tenant: string
  division: string
  project: string
  doctor: string
  type: CampType
  billingType: BillingType
  patientExpectation: string
  fo: string
  mr: string
  asm: string
  rsm: string
  date: string
  slotStart: string
  slotEnd: string
  city: string
  state: string
  latitude: string
  longitude: string
  devices: string
  notes: string
}

type CampDraftAction = { type: 'SET_FIELD'; field: keyof CampDraft; value: string }

function buildInitialDraft(camp: CampEntity | null): CampDraft {
  return {
    tenant: '',
    division: campRefId(camp?.division) ?? '',
    project: campRefId(camp?.project) ?? '',
    doctor: campRefId(camp?.doctor) ?? '',
    type: camp?.type ?? 'screening',
    billingType: camp?.billingType ?? 'billable',
    patientExpectation: camp ? String(camp.patientExpectation ?? '') : '',
    fo: campRefId(camp?.fo) ?? '',
    mr: campRefId(camp?.mr) ?? '',
    asm: campRefId(camp?.asm) ?? '',
    rsm: campRefId(camp?.rsm) ?? '',
    date: camp?.date ? camp.date.slice(0, 10) : '',
    slotStart: camp?.timeSlot?.start ?? '',
    slotEnd: camp?.timeSlot?.end ?? '',
    city: camp?.city ?? '',
    state: camp?.state ?? '',
    latitude: camp?.coordinates && camp.coordinates.length === 2 ? String(camp.coordinates[1]) : '',
    longitude: camp?.coordinates && camp.coordinates.length === 2 ? String(camp.coordinates[0]) : '',
    devices: (camp?.devices ?? []).join(', '),
    notes: camp?.notes ?? '',
  }
}

function campDraftReducer(state: CampDraft, action: CampDraftAction): CampDraft {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    default:
      return state
  }
}

// CampForm remounts fresh per record via key={camp?.id ?? 'create'}.
export const useCampDraft = (camp: CampEntity | null) => {
  const [draft, dispatch] = useReducer(campDraftReducer, camp, buildInitialDraft)

  const setField = (field: keyof CampDraft, value: string) => dispatch({ type: 'SET_FIELD', field, value })

  return { draft, setField }
}
