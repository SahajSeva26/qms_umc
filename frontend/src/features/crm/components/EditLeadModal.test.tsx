import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { LeadEntity, UpdateLeadPayload } from '@/types/crm.types'

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchTenants: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 't-1', code: 'qms', name: 'QMS', type: 'platform' }], count: 1 } })),
    searchRoles: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

vi.mock('@/features/contacts/contacts.service', () => ({
  contactsService: {
    searchContacts: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

function leadFixture(overrides: Partial<LeadEntity> = {}): LeadEntity {
  return {
    id: 'lead-1',
    code: 'ld-000001',
    tenant: 't-1',
    division: { _id: 'div-1', name: 'Div', code: 'div-1', therapy: [] } as unknown as LeadEntity['division'],
    contactPerson: 'contact-1',
    salesPerson: 'role-1',
    focusTherapy: ['cardiology'],
    focusTherapyDoctor: ['cp'],
    title: 'STALE-TITLE',
    problemStatement: 'STALE-PROBLEM',
    numberOfMRS: 3,
    currentlyDoing: ['nothing'],
    notes: 'stale notes',
    projectType: 'screening',
    offers: [{ code: 'offer-1', subOffer: '', reason: 'because' }],
    estimatedValue: 1000,
    followUpDate: '2026-05-01T00:00:00.000Z',
    confidence: 40,
    status: 'new',
    stageHistory: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

async function renderModal(lead: LeadEntity, onSave = vi.fn<(payload: UpdateLeadPayload) => Promise<unknown>>(), onClose = vi.fn()) {
  const EditLeadModal = (await import('./EditLeadModal')).default
  const queryClient = makeQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <EditLeadModal lead={lead} onSave={onSave} onClose={onClose} />
    </QueryClientProvider>,
  )
  await screen.findByText(/edit lead/i)
  return { onSave, onClose }
}

describe('EditLeadModal — partial update payload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saving without touching any field omits title/problemStatement/notes — never resends a stale snapshot to clobber a concurrent edit', async () => {
    const user = userEvent.setup()
    const { onSave } = await renderModal(leadFixture())

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(onSave).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[0]
    })
    expect(payload).not.toHaveProperty('title')
    expect(payload).not.toHaveProperty('problemStatement')
    expect(payload).not.toHaveProperty('notes')
  })

  it('editing title directly includes only title in the payload', async () => {
    const user = userEvent.setup()
    const { onSave } = await renderModal(leadFixture({ title: 'OLD-TITLE' }))

    const titleInput = screen.getByDisplayValue('OLD-TITLE')
    await user.clear(titleInput)
    await user.type(titleInput, 'NEW-TITLE')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(onSave).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[0]
    })
    expect(payload.title).toBe('NEW-TITLE')
    expect(payload).not.toHaveProperty('notes')
    expect(payload).not.toHaveProperty('problemStatement')
  })

  // notes already has an `|| undefined` guard in the payload builder — that
  // only folds an emptied string to undefined, it does not by itself stop an
  // untouched, populated notes value from being resent. Proves the gate covers it too.
  it('editing notes directly includes only notes, leaving the untouched title (misleading || undefined guard) out', async () => {
    const user = userEvent.setup()
    const { onSave } = await renderModal(leadFixture({ title: 'STALE-TITLE', notes: 'old notes' }))

    const notesBoxes = screen.getAllByPlaceholderText(/internal notes/i)
    await user.clear(notesBoxes[0])
    await user.type(notesBoxes[0], 'new notes')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(onSave).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[0]
    })
    expect(payload.notes).toBe('new notes')
    expect(payload).not.toHaveProperty('title')
  })
})

describe('EditLeadModal — revert-to-original omits the field', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('editing title then reverting to its exact original value omits title from the payload', async () => {
    const user = userEvent.setup()
    const { onSave } = await renderModal(leadFixture({ title: 'STALE-TITLE' }))

    const titleInput = screen.getByDisplayValue('STALE-TITLE')
    await user.clear(titleInput)
    await user.type(titleInput, 'TEMP-TITLE')
    await user.clear(titleInput)
    await user.type(titleInput, 'STALE-TITLE')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(onSave).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[0]
    })
    expect(payload).not.toHaveProperty('title')
  })

  it('editing title to a genuinely new value still includes it (control case)', async () => {
    const user = userEvent.setup()
    const { onSave } = await renderModal(leadFixture({ title: 'STALE-TITLE' }))

    const titleInput = screen.getByDisplayValue('STALE-TITLE')
    await user.clear(titleInput)
    await user.type(titleInput, 'GENUINELY-NEW-TITLE')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(onSave).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[0]
    })
    expect(payload.title).toBe('GENUINELY-NEW-TITLE')
  })

  it('removing then re-adding the same focus therapy chip (array field) reverts to original and omits focusTherapy', async () => {
    const user = userEvent.setup()
    const { onSave } = await renderModal(leadFixture({ focusTherapy: ['Cardiology'] }))

    await user.click(screen.getByRole('button', { name: /remove cardiology/i }))
    await user.click(screen.getByRole('button', { name: /add a therapy area/i }))
    await user.click(await screen.findByRole('button', { name: /^cardiology$/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(onSave).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[0]
    })
    expect(payload).not.toHaveProperty('focusTherapy')
  })

  it('editing an offer sub-detail then reverting it (object-array field) omits offers from the payload', async () => {
    const user = userEvent.setup()
    const { onSave } = await renderModal(
      leadFixture({ offers: [{ code: 'screening_camp', subOffer: 'sub-a', reason: 'because' }] }),
    )

    const subOfferInput = screen.getByDisplayValue('sub-a')
    await user.clear(subOfferInput)
    await user.type(subOfferInput, 'sub-temp')
    await user.clear(subOfferInput)
    await user.type(subOfferInput, 'sub-a')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(onSave).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[0]
    })
    expect(payload).not.toHaveProperty('offers')
  })

  it('editing an offer sub-detail to a genuinely new value still includes offers (control case)', async () => {
    const user = userEvent.setup()
    const { onSave } = await renderModal(
      leadFixture({ offers: [{ code: 'screening_camp', subOffer: 'sub-a', reason: 'because' }] }),
    )

    const subOfferInput = screen.getByDisplayValue('sub-a')
    await user.clear(subOfferInput)
    await user.type(subOfferInput, 'sub-genuinely-new')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(onSave).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[0]
    })
    expect(payload.offers).toEqual([{ code: 'screening_camp', subOffer: 'sub-genuinely-new', reason: 'because' }])
  })
})
