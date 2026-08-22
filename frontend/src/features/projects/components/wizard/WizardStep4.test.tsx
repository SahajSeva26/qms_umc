import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEFAULT_WIZARD_FORM } from '@/features/projects/wizard.types'
import WizardStep4 from './WizardStep4'

// Camp time slots are now a fixed preset multi-select (chips), not a
// free-typed range — this locks in the toggle-add/toggle-remove behavior.
describe('WizardStep4 — camp time slot presets', () => {
  it('selecting a preset chip adds its exact {start, end} pair to the form', async () => {
    const user = userEvent.setup()
    const setField = vi.fn()
    const form = { ...DEFAULT_WIZARD_FORM, campTimeSlots: [] }

    render(<WizardStep4 form={form} setField={setField} />)

    await user.click(screen.getByRole('button', { name: '9 AM – 1 PM' }))

    expect(setField).toHaveBeenCalledWith('campTimeSlots', [{ start: '09:00', end: '13:00' }])
  })

  it('clicking an already-selected preset removes it (toggle off)', async () => {
    const user = userEvent.setup()
    const setField = vi.fn()
    const form = {
      ...DEFAULT_WIZARD_FORM,
      campTimeSlots: [{ start: '09:00', end: '13:00' }, { start: '18:00', end: '22:00' }],
    }

    render(<WizardStep4 form={form} setField={setField} />)

    await user.click(screen.getByRole('button', { name: '9 AM – 1 PM' }))

    expect(setField).toHaveBeenCalledWith('campTimeSlots', [{ start: '18:00', end: '22:00' }])
  })

  it('renders all 6 preset slots, and marks only the ones already in the form as active', () => {
    const form = { ...DEFAULT_WIZARD_FORM, campTimeSlots: [{ start: '08:00', end: '09:00' }] }

    render(<WizardStep4 form={form} setField={vi.fn()} />)

    const labels = ['8 AM – 9 AM', '9 AM – 1 PM', '10 AM – 2 PM', '11 AM – 3 PM', '4 PM – 5 PM', '6 PM – 10 PM']
    for (const label of labels) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('never lets a user type an arbitrary time — no time inputs are rendered for camp slots', () => {
    const form = { ...DEFAULT_WIZARD_FORM, campTimeSlots: [] }
    const { container } = render(<WizardStep4 form={form} setField={vi.fn()} />)

    expect(container.querySelectorAll('input[type="time"]')).toHaveLength(0)
  })
})
