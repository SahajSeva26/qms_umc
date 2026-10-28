import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MutationStatusBanner from '@/components/ui/MutationStatusBanner'

// A concurrent double-submit race can surface a raw MongoDB driver error
// instead of the app's friendly message — tested as a deterministic rendering case since the real race is flaky to reproduce.
function errorMutation(message: string) {
  return {
    isError: true,
    isSuccess: false,
    error: { response: { data: { message } } },
  }
}

describe('MutationStatusBanner', () => {
  it('substitutes the friendly fallback for a raw MongoDB duplicate-key error', () => {
    render(
      <MutationStatusBanner
        mutation={errorMutation('E11000 duplicate key error collection: qms.inventorymasters index: code_1 dup key: { code: "race-test-123" }')}
        errorFallback="Could not save the item — try again."
      />,
    )
    expect(screen.getByText('Could not save the item — try again.')).toBeInTheDocument()
    expect(screen.queryByText(/E11000/i)).not.toBeInTheDocument()
  })

  it('still shows the backend\'s own friendly message for a normal (non-raw-driver) error', () => {
    render(
      <MutationStatusBanner
        mutation={errorMutation('An inventory item with this code already exists.')}
        errorFallback="Could not save the item — try again."
      />,
    )
    expect(screen.getByText('An inventory item with this code already exists.')).toBeInTheDocument()
  })

  it('falls back when there is no backend message at all', () => {
    render(
      <MutationStatusBanner
        mutation={{ isError: true, isSuccess: false, error: {} }}
        errorFallback="Could not save the item — try again."
      />,
    )
    expect(screen.getByText('Could not save the item — try again.')).toBeInTheDocument()
  })
})
