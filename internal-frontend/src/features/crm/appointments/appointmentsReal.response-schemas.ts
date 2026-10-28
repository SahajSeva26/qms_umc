import { z } from 'zod'

// Runtime contract check for GET /appointments/:id and PATCH .../stage.
// Populated-ref fields aren't deep-validated — refName/refId/unwrapId
// already handle either a bare id string or an object gracefully.
const AppointmentStageHistoryEntrySchema = z.object({
  nextSteps: z.string().optional(),
}).passthrough()

const AppointmentEntitySchema = z.object({
  id: z.string(),
  code: z.string(),
  status: z.enum(['planned', 'done', 'cancelled']),
  stageHistory: z.array(AppointmentStageHistoryEntrySchema),
}).passthrough()

export const AppointmentDetailResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: AppointmentEntitySchema,
}).passthrough()

// PATCH .../stage returns the same AppointmentEntity shape as GET :id.
export const MoveAppointmentStageResponseSchema = AppointmentDetailResponseSchema
