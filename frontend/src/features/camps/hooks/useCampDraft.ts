import { useReducer } from 'react'
import { campRefId } from '@/features/camps/campsReal.utils'
import type { BillingType, CampEntity, CampType } from '@/types/campReal.types'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import { CAMP_TIME_SLOT_VALUES } from '@/types/campTimeSlot.constants'

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
  date: string
  timeSlot: CampTimeSlotValue | ''
  city: string
  state: string
  latitude: string
  longitude: string
  /** Selected InventoryMaster device ObjectIds — comma-joined for the shared SET_FIELD string reducer, split back into an array at submit time. */
  devices: string
  notes: string
}

type CampDraftField = keyof CampDraft
type CampDraftFieldValue<F extends CampDraftField> = CampDraft[F]
type CampDraftAction = { [F in CampDraftField]: { type: 'SET_FIELD'; field: F; value: CampDraftFieldValue<F> } }[CampDraftField]

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
    date: camp?.date ? camp.date.slice(0, 10) : '',
    timeSlot: camp?.timeSlot && (CAMP_TIME_SLOT_VALUES as string[]).includes(camp.timeSlot) ? camp.timeSlot : '',
    city: camp?.city ?? '',
    state: camp?.state ?? '',
    latitude: camp?.coordinates && camp.coordinates.length === 2 ? String(camp.coordinates[1]) : '',
    longitude: camp?.coordinates && camp.coordinates.length === 2 ? String(camp.coordinates[0]) : '',
    // camp.devices is always populated sub-docs on a fetched camp, never bare
    // id strings — .join() alone would have produced "[object Object]" here.
    devices: (camp?.devices ?? []).map((d) => d._id).join(', '),
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

  const setField = <F extends CampDraftField>(field: F, value: CampDraftFieldValue<F>) =>
    dispatch({ type: 'SET_FIELD', field, value } as CampDraftAction)

  return { draft, setField }
}
