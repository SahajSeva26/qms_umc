import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocationAddressOverlay from './LocationAddressOverlay'
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

describe('LocationAddressOverlay — collapsed pill', () => {
  it('shows "Add address" when value is null', () => {
    render(<LocationAddressOverlay value={null} onChange={vi.fn()} mapHeight={320} />)
    expect(screen.getByRole('button', { name: /add address/i })).toBeInTheDocument()
  })

  it('shows a one-line address summary when required fields are complete', () => {
    render(<LocationAddressOverlay value={makeValue()} onChange={vi.fn()} mapHeight={320} />)
    expect(screen.getByRole('button', { name: /221 baker street.*mumbai.*maharashtra.*400001/i })).toBeInTheDocument()
  })

  it('shows a partial summary (not a blanket "Add address") when some but not all required fields are filled', () => {
    render(<LocationAddressOverlay value={makeValue({ city: '', state: '', pincode: '' })} onChange={vi.fn()} mapHeight={320} />)
    expect(screen.getByRole('button', { name: /221 baker street/i })).toBeInTheDocument()
  })
})

describe('LocationAddressOverlay — expand/collapse', () => {
  it('expands the real address form on click and collapses it again via the close control', async () => {
    const user = userEvent.setup()
    render(<LocationAddressOverlay value={makeValue()} onChange={vi.fn()} mapHeight={320} />)

    const toggle = screen.getByRole('button', { name: /221 baker street/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByDisplayValue('221 Baker Street')).not.toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByDisplayValue('221 Baker Street')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /collapse address panel/i }))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByDisplayValue('221 Baker Street')).not.toBeInTheDocument()
  })

  it('expands via keyboard (Enter) on the disclosure button', async () => {
    const user = userEvent.setup()
    render(<LocationAddressOverlay value={makeValue()} onChange={vi.fn()} mapHeight={320} />)

    const toggle = screen.getByRole('button', { name: /221 baker street/i })
    toggle.focus()
    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByDisplayValue('221 Baker Street')).toBeInTheDocument()
  })

  it('aria-controls on the toggle matches the expanded panel\'s id', async () => {
    const user = userEvent.setup()
    render(<LocationAddressOverlay value={makeValue()} onChange={vi.fn()} mapHeight={320} />)

    const toggle = screen.getByRole('button', { name: /221 baker street/i })
    const controlsId = toggle.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()

    await user.click(toggle)
    expect(document.getElementById(controlsId!)).toBeInTheDocument()
  })

  it('editing a field in the expanded form calls the same onChange the below-map version used', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<LocationAddressOverlay value={makeValue()} onChange={onChange} mapHeight={320} />)

    await user.click(screen.getByRole('button', { name: /221 baker street/i }))
    const cityInput = screen.getByDisplayValue('Mumbai')
    await user.type(cityInput, 'X')

    const firstCall = onChange.mock.calls[0]?.[0]
    expect(firstCall).toEqual(expect.objectContaining({ city: 'MumbaiX', addressLine1: '221 Baker Street' }))
  })
})

describe('LocationAddressOverlay — disabled flow', () => {
  it('stays expandable when disabled, and a pre-filled address stays visible with its own inputs disabled', async () => {
    const user = userEvent.setup()
    render(<LocationAddressOverlay value={makeValue()} onChange={vi.fn()} disabled mapHeight={320} />)

    const toggle = screen.getByRole('button', { name: /221 baker street/i })
    expect(toggle).not.toBeDisabled()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    const addressInput = screen.getByDisplayValue('221 Baker Street')
    expect(addressInput).toBeDisabled()
    const cityInput = screen.getByDisplayValue('Mumbai')
    expect(cityInput).toBeDisabled()
  })
})

describe('LocationAddressOverlay — expanded card height budget', () => {
  it('reserves less height for the card when no status banner is present', () => {
    render(<LocationAddressOverlay value={makeValue()} onChange={vi.fn()} mapHeight={320} reserveStatusBannerSpace={false} />)
    // Panel isn't mounted until expanded; numeric budget is asserted below.
    expect(screen.getByRole('button', { name: /221 baker street/i })).toBeInTheDocument()
  })

  it('gives the expanded card a smaller max-height when reserveStatusBannerSpace is true than when it is false — covers both the loading AND error banner cases, which share this one flag', async () => {
    const user = userEvent.setup()

    const { unmount } = render(<LocationAddressOverlay value={makeValue()} onChange={vi.fn()} mapHeight={320} reserveStatusBannerSpace={false} />)
    await user.click(screen.getByRole('button', { name: /221 baker street/i }))
    const panelWithoutBanner = document.querySelector('[id]')?.closest('div[style*="max-height"]') as HTMLElement
    const maxHeightWithoutBanner = parseInt(panelWithoutBanner.style.maxHeight, 10)
    unmount()

    const user2 = userEvent.setup()
    render(<LocationAddressOverlay value={makeValue()} onChange={vi.fn()} mapHeight={320} reserveStatusBannerSpace />)
    await user2.click(screen.getByRole('button', { name: /221 baker street/i }))
    const panelWithBanner = document.querySelector('[id]')?.closest('div[style*="max-height"]') as HTMLElement
    const maxHeightWithBanner = parseInt(panelWithBanner.style.maxHeight, 10)

    expect(maxHeightWithBanner).toBeLessThan(maxHeightWithoutBanner)
    // The card must never claim the map's full height — MapCanvas's own pill row shares that space.
    expect(maxHeightWithoutBanner).toBeLessThan(320)
    expect(maxHeightWithBanner).toBeLessThan(320)
  })
})
