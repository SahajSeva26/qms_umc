import { ASSIGNMENTS, REPS, TARGETS } from '@/types/salesdash.types'

// Read-only shared surface over CRM Sales' static rep/target data — kept as
// a hook so the call site keeps the same shape/options/isLoading/error fields.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for call-site compatibility
export const useSalesDataShared = (_options?: { enabled?: boolean }) => {
  return {
    reps: REPS,
    targets: TARGETS,
    assignments: ASSIGNMENTS,
    approvals: [],
    activityFeed: [],
    meetings: [],
    isLoading: false,
    error: null,
  }
}
