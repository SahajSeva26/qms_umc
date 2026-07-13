import { z } from 'zod'

export const newMeetingSchema = z
  .object({
    type: z.enum(['NEW', 'FOLLOWUP', 'PAYMENT', 'SPOT']),
    pharmaCompanyId: z.string().min(1, 'Select a pharma company'),
    contactName: z.string().trim().min(1, 'Contact name is required'),
    contactRole: z.string().optional(),
    city: z.string().optional(),
    location: z.string().optional(),
    modeOfMeeting: z.enum(['IN_PERSON', 'VIRTUAL']),
    date: z.string().min(1, 'Pick a date'),
    startTime: z.string().min(1, 'Pick a start time'),
    endTime: z.string().min(1, 'Pick an end time'),
    agendaPublic: z.string().trim().min(1, 'Public agenda is required'),
    agendaPrivate: z.string().optional(),
    nextSteps: z.string().optional(),
    linkedLeadId: z.string().optional(),
  })
  // 'HH:mm' strings compare correctly lexicographically
  .refine((v) => v.endTime > v.startTime, { message: 'End time must be after start time', path: ['endTime'] })
  .refine((v) => v.type !== 'FOLLOWUP' || !!v.linkedLeadId?.trim(), {
    message: 'Linked lead id is required for follow-up meetings',
    path: ['linkedLeadId'],
  })

export type NewMeetingValues = z.infer<typeof newMeetingSchema>

export const momSchema = z.object({
  momText: z.string().trim().min(1, 'MOM notes are required'),
  nextSteps: z.string().optional(),
})

export const rescheduleSchema = z
  .object({
    startAt: z.string().min(1, 'Pick a new start'),
    endAt: z.string().min(1, 'Pick a new end'),
    reason: z.string().trim().min(1, 'Reschedule reason is required'),
  })
  .refine((v) => new Date(v.endAt).getTime() > new Date(v.startAt).getTime(), {
    message: 'End must be after start',
    path: ['endAt'],
  })

export const releaseSchema = z.object({
  reason: z.string().trim().min(1, 'Justification is required to release a block'),
})
