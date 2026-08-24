import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEFAULT_WIZARD_FORM } from '@/features/projects/wizard.types'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import WizardStep4 from './WizardStep4'

// Camp time slots are a fixed 4-value enum multi-select (chips), matching
// the backend's CAMP_TIME_SLOTS exactly — not a free-typed range.
describe('WizardStep4 — camp time slot presets', () => {
  it('selecting a chip adds its exact enum value to the form', async () => {
    const user = userEvent.setup()
    const setField = vi.fn()
    const form = { ...DEFAULT_WIZARD_FORM, campTimeSlots: [] }

    render(<WizardStep4 form={form} setField={setField} />)

    await user.click(screen.getByRole('button', { name: '9 AM – 1 PM' }))

    expect(setField).toHaveBeenCalledWith('campTimeSlots', ['9am-1pm'])
  })

  it('clicking an already-selected chip removes it (toggle off)', async () => {
    const user = userEvent.setup()
    const setField = vi.fn()
    const form = {
      ...DEFAULT_WIZARD_FORM,
      campTimeSlots: ['9am-1pm', '6pm-10pm'] satisfies CampTimeSlotValue[],
    }

    render(<WizardStep4 form={form} setField={setField} />)

    await user.click(screen.getByRole('button', { name: '9 AM – 1 PM' }))

    expect(setField).toHaveBeenCalledWith('campTimeSlots', ['6pm-10pm'])
  })

  it('renders exactly the 4 backend slot values, and marks only the ones already in the form as active', () => {
    const form = { ...DEFAULT_WIZARD_FORM, campTimeSlots: ['9am-1pm'] satisfies CampTimeSlotValue[] }

    render(<WizardStep4 form={form} setField={vi.fn()} />)

    const labels = ['9 AM – 1 PM', '10 AM – 2 PM', '11 AM – 3 PM', '6 PM – 10 PM']
    for (const label of labels) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    // The old presets are gone entirely.
    expect(screen.queryByRole('button', { name: '8 AM – 9 AM' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '4 PM – 5 PM' })).not.toBeInTheDocument()
  })

  it('never lets a user type an arbitrary time — no time inputs are rendered for camp slots', () => {
    const form = { ...DEFAULT_WIZARD_FORM, campTimeSlots: [] }
    const { container } = render(<WizardStep4 form={form} setField={vi.fn()} />)

    expect(container.querySelectorAll('input[type="time"]')).toHaveLength(0)
  })
})
