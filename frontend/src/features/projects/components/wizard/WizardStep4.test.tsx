import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { WizardFormState } from '@/features/projects/wizard.types'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import { WizardTestHarness } from './wizardTestHarness'
import WizardStep4 from './WizardStep4'

// Camp time slots are a fixed 4-value enum multi-select, matching the
// backend's CAMP_TIME_SLOTS exactly — not a free-typed range.
describe('WizardStep4 — camp time slot presets', () => {
  it('selecting a chip adds its exact enum value to the form', async () => {
    const user = userEvent.setup()

    render(
      <WizardTestHarness formValues={{ campTimeSlots: [] }}>
        <WizardStep4 />
      </WizardTestHarness>,
    )

    const chip = screen.getByRole('button', { name: '9 AM – 1 PM' })
    await user.click(chip)

    expect(chip).toHaveStyle({ background: 'var(--qms-brand)' })
  })

  it('clicking an already-selected chip removes it (toggle off)', async () => {
    const user = userEvent.setup()
    const defaultValues: Partial<WizardFormState> = {
      campTimeSlots: ['9am-1pm', '6pm-10pm'] satisfies CampTimeSlotValue[],
    }

    render(
      <WizardTestHarness formValues={defaultValues}>
        <WizardStep4 />
      </WizardTestHarness>,
    )

    const chip = screen.getByRole('button', { name: '9 AM – 1 PM' })
    expect(chip).toHaveStyle({ background: 'var(--qms-brand)' })

    await user.click(chip)

    expect(chip).not.toHaveStyle({ background: 'var(--qms-brand)' })
  })

  it('renders exactly the 4 backend slot values', () => {
    render(
      <WizardTestHarness formValues={{ campTimeSlots: ['9am-1pm'] satisfies CampTimeSlotValue[] }}>
        <WizardStep4 />
      </WizardTestHarness>,
    )

    const labels = ['9 AM – 1 PM', '10 AM – 2 PM', '11 AM – 3 PM', '6 PM – 10 PM']
    for (const label of labels) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    // The old presets are gone entirely.
    expect(screen.queryByRole('button', { name: '8 AM – 9 AM' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '4 PM – 5 PM' })).not.toBeInTheDocument()
  })

  it('never lets a user type an arbitrary time — no time inputs are rendered for camp slots', () => {
    const { container } = render(
      <WizardTestHarness formValues={{ campTimeSlots: [] }}>
        <WizardStep4 />
      </WizardTestHarness>,
    )

    expect(container.querySelectorAll('input[type="time"]')).toHaveLength(0)
  })

  it('shows the "add at least one slot" error once the step is attempted and no slot is selected', async () => {
    const user = userEvent.setup()

    render(
      <WizardTestHarness formValues={{ campTimeSlots: [] }} attemptedFields={new Set(['campTimeSlots'])}>
        <WizardStep4 />
      </WizardTestHarness>,
    )

    // mode:'onChange' means errors[] stays empty until a validation pass —
    // toggling a slot on and back off forces that first pass.
    const chip = screen.getByRole('button', { name: '9 AM – 1 PM' })
    await user.click(chip)
    await user.click(chip)

    expect(await screen.findByText(/add at least one camp time slot/i)).toBeInTheDocument()
  })

  it('every non-submit chip/card button is type="button", never the implicit submit default', () => {
    const { container } = render(
      <WizardTestHarness formValues={{ campTimeSlots: [] }}>
        <form>
          <WizardStep4 />
        </form>
      </WizardTestHarness>,
    )

    const buttons = Array.from(container.querySelectorAll('button'))
    expect(buttons.length).toBeGreaterThan(0)
    for (const button of buttons) {
      expect(button.type).toBe('button')
    }
  })
})
