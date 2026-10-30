export const CAMP_TIME_SLOTS = {
  SLOT_9_1: '9am-1pm',
  SLOT_10_2: '10am-2pm',
  SLOT_11_3: '11am-3pm',
  SLOT_6_10: '6pm-10pm',
} as const

export type CampTimeSlotValue = (typeof CAMP_TIME_SLOTS)[keyof typeof CAMP_TIME_SLOTS]

export const CAMP_TIME_SLOT_LABEL: Record<CampTimeSlotValue, string> = {
  '9am-1pm': '9 AM – 1 PM',
  '10am-2pm': '10 AM – 2 PM',
  '11am-3pm': '11 AM – 3 PM',
  '6pm-10pm': '6 PM – 10 PM',
}

export const CAMP_TIME_SLOT_VALUES = Object.values(CAMP_TIME_SLOTS)
