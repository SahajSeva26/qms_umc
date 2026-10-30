import { describe, it, expect } from 'vitest'
import { getAllowedStageActions } from '@/types/inventoryRequest.types'

// A pure-function test over the exact transition-map mirror confirmed
// against inventory-request.service.ts's moveStage. Table-driven over
// representative (type, status, canManage) tuples — including the reversal
// and terminal cases that are easy to miss if only "happy path" transitions
// are tested.
describe('getAllowedStageActions', () => {
  it('refill/rejected/manager: includes the reopen path (requested)', () => {
    expect(getAllowedStageActions('refill', 'rejected', true)).toEqual(['requested'])
  })

  it('refill/requested/non-manager: cancelled only, NOT received (received only valid from approved)', () => {
    expect(getAllowedStageActions('refill', 'requested', false)).toEqual(['cancelled'])
  })

  it('refill/approved/non-manager: received and cancelled', () => {
    expect(getAllowedStageActions('refill', 'approved', false)).toEqual(['received', 'cancelled'])
  })

  it('return/requested/non-manager: cancelled only', () => {
    expect(getAllowedStageActions('return', 'requested', false)).toEqual(['cancelled'])
  })

  it('return/approved/non-manager: empty (terminal, no self-service move possible)', () => {
    expect(getAllowedStageActions('return', 'approved', false)).toEqual([])
  })

  it('refill/received/manager: empty (terminal even for a manager)', () => {
    expect(getAllowedStageActions('refill', 'received', true)).toEqual([])
  })

  it('return/approved/manager: also empty — return has no outgoing transitions once approved, even for a manager', () => {
    expect(getAllowedStageActions('return', 'approved', true)).toEqual([])
  })

  it('refill/requested/manager: the full valid set, no narrowing', () => {
    expect(getAllowedStageActions('refill', 'requested', true)).toEqual(['approved', 'rejected', 'cancelled'])
  })
})
