import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PatientEntity } from '@/features/clinical/patient/patient.types'

vi.mock('@/features/clinical/patient/patient.service', () => ({
  patientService: { searchPatients: vi.fn(), getPatient: vi.fn(), createPatient: vi.fn(), updatePatient: vi.fn() },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

const patient: PatientEntity = {
  id: 'p-1',
  code: 'pat-000001',
  firstName: 'Rahul',
  lastName: 'Sharma',
  dateOfBirth: '1985-06-15',
  gender: 'male',
  mobile: '9876543210',
  createdBy: null,
  createdAt: '',
  updatedAt: '',
}

async function renderPicker(onChange = vi.fn()) {
  const PatientPicker = (await import('./PatientPicker')).default
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <PatientPicker value="" label="" onChange={onChange} />
    </QueryClientProvider>,
  )
  return { onChange }
}

describe('PatientPicker', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows an empty-query hint before typing, not a "no matches" state', async () => {
    await renderPicker()

    const input = screen.getByPlaceholderText(/search by mobile or name/i)
    await userEvent.setup().click(input)

    expect(screen.getByText(/start typing/i)).toBeInTheDocument()
  }, 15000)

  it('searches by mobile when the query is all digits, and selecting a result calls onChange', async () => {
    const { patientService } = await import('@/features/clinical/patient/patient.service')
    vi.mocked(patientService.searchPatients).mockResolvedValue({ success: true, message: '', data: { items: [patient], count: 1 } })

    const user = userEvent.setup()
    const { onChange } = await renderPicker()

    await user.type(screen.getByPlaceholderText(/search by mobile or name/i), '9876543210')

    await waitFor(() => expect(patientService.searchPatients).toHaveBeenCalledWith(expect.objectContaining({ mobile: '9876543210' })))
    const resultButton = await screen.findByText(/Rahul Sharma · pat-000001 · 9876543210/i)
    await user.click(resultButton)

    expect(onChange).toHaveBeenCalledWith('p-1', 'Rahul Sharma · pat-000001 · 9876543210')
  })

  it('searches by name when the query is not all digits', async () => {
    const { patientService } = await import('@/features/clinical/patient/patient.service')
    vi.mocked(patientService.searchPatients).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })

    const user = userEvent.setup()
    await renderPicker()

    await user.type(screen.getByPlaceholderText(/search by mobile or name/i), 'Rahul')

    await waitFor(() => expect(patientService.searchPatients).toHaveBeenCalledWith(expect.objectContaining({ name: 'Rahul' })))
  })

  it('offers "Register new patient" once a search has run, and opens the registration form', async () => {
    const { patientService } = await import('@/features/clinical/patient/patient.service')
    vi.mocked(patientService.searchPatients).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })

    const user = userEvent.setup()
    await renderPicker()

    await user.type(screen.getByPlaceholderText(/search by mobile or name/i), 'Nobody')
    const registerOption = await screen.findByText(/register new patient/i)
    await user.click(registerOption)

    expect(await screen.findByRole('heading', { name: /register new patient/i })).toBeInTheDocument()
  })

  it('excludes already-screened patient ids from results', async () => {
    const { patientService } = await import('@/features/clinical/patient/patient.service')
    const patient2: PatientEntity = { ...patient, id: 'p-2', firstName: 'Other' }
    vi.mocked(patientService.searchPatients).mockResolvedValue({ success: true, message: '', data: { items: [patient, patient2], count: 2 } })

    const PatientPicker = (await import('./PatientPicker')).default
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <PatientPicker value="" label="" onChange={vi.fn()} excludeIds={['p-1']} />
      </QueryClientProvider>,
    )

    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/search by mobile or name/i), 'a')

    expect(await screen.findByText(/Other Sharma/i)).toBeInTheDocument()
    expect(screen.queryByText(/^Rahul Sharma/i)).not.toBeInTheDocument()
  })

  it('does not offer "Register new patient" when the only match was excluded — a real patient exists, excluding it must never look like a not-found case', async () => {
    const { patientService } = await import('@/features/clinical/patient/patient.service')
    vi.mocked(patientService.searchPatients).mockResolvedValue({ success: true, message: '', data: { items: [patient], count: 1 } })

    const PatientPicker = (await import('./PatientPicker')).default
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <PatientPicker value="" label="" onChange={vi.fn()} excludeIds={['p-1']} />
      </QueryClientProvider>,
    )

    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/search by mobile or name/i), '9876543210')

    await waitFor(() => expect(patientService.searchPatients).toHaveBeenCalled())
    expect(screen.queryByText(/^Rahul Sharma/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/register new patient/i)).not.toBeInTheDocument()
  })
})
