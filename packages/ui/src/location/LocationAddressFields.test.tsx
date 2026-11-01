import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocationAddressFields from './LocationAddressFields'
import type { LocationValue } from '@qms/core'

function makeValue(overrides: Partial<LocationValue> = {}): LocationValue {
  return {
    addressLine1: '221 Baker Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    country: 'India',
    coordinates: [72.8, 19.07],
    ...overrides,
  }
}

// Re-renders with each onChange's result, like a real caller would — needed whenever a test
// exercises more than one keystroke/event in sequence (otherwise the Input stays pinned to the
// original `value` prop and later events are evaluated against stale state, not what the user
// actually typed so far).
function Controlled({ initial, onChange }: { initial: LocationValue; onChange: (v: LocationValue) => void }) {
  const [value, setValue] = useState(initial)
  return <LocationAddressFields value={value} onChange={(v) => { setValue(v); onChange(v) }} />
}

describe('LocationAddressFields', () => {
  it('renders all fields with their current values', () => {
    render(<LocationAddressFields value={makeValue()} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('221 Baker Street')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Mumbai')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Maharashtra')).toBeInTheDocument()
    expect(screen.getByDisplayValue('400001')).toBeInTheDocument()
    expect(screen.getByDisplayValue('India')).toBeInTheDocument()
  })

  it('calls onChange with a merged value when a field is edited', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<LocationAddressFields value={makeValue()} onChange={onChange} />)

    const city = screen.getByDisplayValue('Mumbai')
    await user.type(city, 'X')

    // Controlled by `value`, which this test never re-renders with the merged
    // result, so only the first onChange call reflects the original `current`.
    const firstCall = onChange.mock.calls[0]?.[0]
    expect(firstCall).toEqual(expect.objectContaining({ city: 'MumbaiX', addressLine1: '221 Baker Street', state: 'Maharashtra' }))
  })

  it('shows "Complete the address below" when a required field is blank', () => {
    render(<LocationAddressFields value={makeValue({ city: '' })} onChange={vi.fn()} />)
    const notice = screen.getByText(/complete the address below/i)
    expect(notice).toBeInTheDocument()
    expect(notice.textContent).toMatch(/city/i)
  })

  it('does NOT show the notice when only country is blank', () => {
    render(<LocationAddressFields value={makeValue({ country: undefined })} onChange={vi.fn()} />)
    expect(screen.queryByText(/complete the address below/i)).not.toBeInTheDocument()
  })

  it('hides the notice entirely when all four required fields are filled', () => {
    render(<LocationAddressFields value={makeValue()} onChange={vi.fn()} />)
    expect(screen.queryByText(/complete the address below/i)).not.toBeInTheDocument()
  })

  it('does not show the notice at all when value is null (nothing picked yet)', () => {
    render(<LocationAddressFields value={null} onChange={vi.fn()} />)
    expect(screen.queryByText(/complete the address below/i)).not.toBeInTheDocument()
  })

  it('shows the labelled "Map location" hint alongside the missing-fields notice when both are present', () => {
    render(<LocationAddressFields value={makeValue({ city: '' })} onChange={vi.fn()} locationHint="Dehene, Maharashtra, India" />)
    expect(screen.getByText(/map location/i)).toBeInTheDocument()
    expect(screen.getByText('Dehene, Maharashtra, India')).toBeInTheDocument()
  })

  it('does NOT show the location hint when the address is already complete, even if one was supplied', () => {
    render(<LocationAddressFields value={makeValue()} onChange={vi.fn()} locationHint="221 Baker Street, Mumbai" />)
    expect(screen.queryByText(/map location/i)).not.toBeInTheDocument()
  })

  it('does not show the location hint block at all when none was supplied, even with missing fields', () => {
    render(<LocationAddressFields value={makeValue({ city: '' })} onChange={vi.fn()} />)
    expect(screen.queryByText(/map location/i)).not.toBeInTheDocument()
  })

  it('clearing the Country input calls onChange with country: undefined, never "", once blurred', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Controlled initial={makeValue()} onChange={onChange} />)

    const country = screen.getByDisplayValue('India')
    await user.clear(country)
    await user.tab() // blur — trimming/undefined-collapse only happens on blur now, not every keystroke
    const lastCall = onChange.mock.calls.at(-1)?.[0]
    expect(lastCall.country).toBeUndefined()
    expect(lastCall.country).not.toBe('')
  })

  // Regression test for the P2 finding: addressLine2/locality/country used to call .trim() on
  // EVERY keystroke's onChange, so typing "Near " (trailing space, about to type the next word)
  // silently had the space stripped before the next character could be typed — making multi-word
  // input in these three fields impossible to type naturally.
  it('typing a multi-word value into Address line 2 keeps the space between words while still typing (not trimmed mid-keystroke)', async () => {
    const user = userEvent.setup()
    render(<Controlled initial={makeValue({ addressLine2: undefined })} onChange={vi.fn()} />)

    const input = screen.getByLabelText(/address line 2/i)
    await user.type(input, 'Near City Mall')

    expect(input).toHaveValue('Near City Mall')
  })

  it('does not trim/collapse Locality to undefined while the field is still focused and mid-edit', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Controlled initial={makeValue({ locality: undefined })} onChange={onChange} />)

    const input = screen.getByLabelText(/locality/i)
    await user.type(input, 'Andheri ')

    // Still focused — onBlur hasn't fired, so onChange must have been called with the raw,
    // untrimmed value (including the trailing space), never collapsed to undefined mid-typing.
    const lastCall = onChange.mock.calls.at(-1)?.[0]
    expect(lastCall.locality).toBe('Andheri ')
  })

  it('trims and collapses Locality to undefined only once the field is blurred', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Controlled initial={makeValue({ locality: undefined })} onChange={onChange} />)

    const input = screen.getByLabelText(/locality/i)
    await user.type(input, '   ')
    await user.tab()

    const lastCall = onChange.mock.calls.at(-1)?.[0]
    expect(lastCall.locality).toBeUndefined()
  })
})
