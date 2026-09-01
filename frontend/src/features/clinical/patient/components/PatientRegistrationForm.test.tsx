import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/features/clinical/patient/patient.service', () => ({
  patientService: { searchPatients: vi.fn(), getPatient: vi.fn(), createPatient: vi.fn(), updatePatient: vi.fn() },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderForm() {
  const PatientRegistrationForm = (await import('./PatientRegistrationForm')).default
  const onCreated = vi.fn()
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <PatientRegistrationForm open onClose={vi.fn()} onCreated={onCreated} />
    </QueryClientProvider>,
  )
  return { onCreated }
}

describe('PatientRegistrationForm — date of birth single source of truth', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Frozen so the calendar's default displayed month is deterministic —
    // otherwise "September 15th, 2026" only stays clickable on first render
    // while the real system clock happens to be in September 2026.
    vi.setSystemTime(new Date('2026-09-01T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('submits the date picked via the DatePicker as dateOfBirth', async () => {
    // Longer timeout: this drives a real dialog + popover calendar + select
    // through several userEvent steps, which can exceed the 5s default under
    // full-suite CPU contention even though each step itself is fast.
    const { patientService } = await import('@/features/clinical/patient/patient.service')
    vi.mocked(patientService.createPatient).mockResolvedValue({
      success: true,
      message: '',
      data: { id: 'p-1', code: 'pat-000001', firstName: 'Rahul', dateOfBirth: '2026-09-15', gender: 'male', mobile: '9876543210', createdBy: null, createdAt: '', updatedAt: '' },
    })
    const user = userEvent.setup()
    await renderForm()

    await user.type(screen.getByLabelText(/first name/i), 'Rahul')
    await user.type(screen.getByLabelText(/mobile/i), '9876543210')

    await user.click(screen.getByRole('button', { name: /pick a date/i }))
    await user.click(screen.getByRole('button', { name: /September 15th, 2026/i }))

    await user.click(screen.getByLabelText(/gender/i))
    await user.click(await screen.findByRole('option', { name: /^male$/i }))

    await user.click(screen.getByRole('button', { name: /register patient/i }))

    expect(patientService.createPatient).toHaveBeenCalledWith(
      expect.objectContaining({ dateOfBirth: '2026-09-15' }),
    )
  }, 15000)
})
