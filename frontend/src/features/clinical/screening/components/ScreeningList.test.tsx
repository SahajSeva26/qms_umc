import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PatientEntity } from '@/features/clinical/patient/patient.types'
import type { ScreeningEntity } from '@/features/clinical/screening/screening.types'

vi.mock('@/features/clinical/screening/screening.service', () => ({
  screeningService: {
    searchScreenings: vi.fn(),
    getScreening: vi.fn(),
    createScreening: vi.fn(),
    updateScreening: vi.fn(),
    moveScreeningStage: vi.fn(),
  },
}))
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

const screening: ScreeningEntity = {
  id: 's-1',
  tenant: null,
  patient: { id: 'p-9', code: 'pat-000009', firstName: 'Existing', lastName: 'Patient', mobile: '1111111111' },
  camp: null,
  performedBy: null,
  symptoms: [],
  referral: false,
  consent: null,
  status: 'pending',
  stageHistory: [],
  createdAt: '',
  updatedAt: '',
}

async function renderList(onOpen = vi.fn()) {
  const ScreeningList = (await import('./ScreeningList')).default
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <ScreeningList campId="camp-1" canWrite onOpen={onOpen} />
    </QueryClientProvider>,
  )
}

describe('ScreeningList', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('lists the current page and shows the real total count, not the loaded-page length', async () => {
    const { screeningService } = await import('@/features/clinical/screening/screening.service')
    vi.mocked(screeningService.searchScreenings).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [screening], count: 47 },
    })

    await renderList()

    expect(await screen.findByText('47 screenings', {}, { timeout: 15000 })).toBeInTheDocument()
    expect(screeningService.searchScreenings).toHaveBeenCalledWith(expect.objectContaining({ camp: 'camp-1', page: '1', limit: '20' }))
  }, 15000)

  it('does not fetch every screening at the camp just to open the picker — only the paginated page query fires until "New screening" is used', async () => {
    const { screeningService } = await import('@/features/clinical/screening/screening.service')
    vi.mocked(screeningService.searchScreenings).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })

    await renderList()

    await waitFor(() => expect(screeningService.searchScreenings).toHaveBeenCalled())
    const calls = vi.mocked(screeningService.searchScreenings).mock.calls
    expect(calls.every(([q]) => q.limit !== '0')).toBe(true)
  })

  it('blocks creating a duplicate screening for a patient already screened at this camp, without ever calling createScreening', async () => {
    const { screeningService } = await import('@/features/clinical/screening/screening.service')
    const { patientService } = await import('@/features/clinical/patient/patient.service')
    vi.mocked(screeningService.searchScreenings).mockImplementation(async (q) => {
      if (q.patient) return { success: true, message: '', data: { items: [screening], count: 1 } }
      return { success: true, message: '', data: { items: [], count: 0 } }
    })
    vi.mocked(patientService.searchPatients).mockResolvedValue({ success: true, message: '', data: { items: [patient], count: 1 } })

    const user = userEvent.setup()
    await renderList()

    await user.click(screen.getByRole('button', { name: /new screening/i }))
    await user.type(screen.getByPlaceholderText(/search by mobile or name/i), '9876543210')
    const resultButton = await screen.findByText(/Rahul Sharma/i)
    await user.click(resultButton)

    expect(await screen.findByText(/already been screened at this camp/i)).toBeInTheDocument()
    expect(screeningService.createScreening).not.toHaveBeenCalled()
    expect(screeningService.searchScreenings).toHaveBeenCalledWith(expect.objectContaining({ patient: 'p-1', limit: '1' }))
  })

  it('creates a screening when the point-check finds no existing screening for this patient at this camp', async () => {
    const { screeningService } = await import('@/features/clinical/screening/screening.service')
    const { patientService } = await import('@/features/clinical/patient/patient.service')
    vi.mocked(screeningService.searchScreenings).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    vi.mocked(patientService.searchPatients).mockResolvedValue({ success: true, message: '', data: { items: [patient], count: 1 } })
    vi.mocked(screeningService.createScreening).mockResolvedValue({ success: true, message: '', data: screening })

    const user = userEvent.setup()
    await renderList()

    await user.click(screen.getByRole('button', { name: /new screening/i }))
    await user.type(screen.getByPlaceholderText(/search by mobile or name/i), '9876543210')
    const resultButton = await screen.findByText(/Rahul Sharma/i)
    await user.click(resultButton)

    await waitFor(() => expect(screeningService.createScreening).toHaveBeenCalledWith({ patient: 'p-1', camp: 'camp-1' }))
  })
})
