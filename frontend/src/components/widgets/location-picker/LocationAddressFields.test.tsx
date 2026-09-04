import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocationAddressFields from './LocationAddressFields'
import type { LocationValue } from '@/types/location.types'

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

    // The component is a controlled display of the `value` prop, which this
    // test never re-renders with the merged result — so only the FIRST
    // onChange call (built from the still-original `current`) is meaningful
    // to assert against; later calls compound against the same stale prop.
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

  it('clearing the Country input calls onChange with country: undefined, never ""', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<LocationAddressFields value={makeValue()} onChange={onChange} />)

    const country = screen.getByDisplayValue('India')
    await user.clear(country)
    // Blur commits the trim-and-normalize — the component reads e.target.value on each keystroke,
    // so the last keystroke of clearing already produces ''.
    const lastCall = onChange.mock.calls.at(-1)?.[0]
    expect(lastCall.country).toBeUndefined()
    expect(lastCall.country).not.toBe('')
  })
})
