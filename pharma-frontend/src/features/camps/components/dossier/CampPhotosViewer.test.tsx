import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CampPhotosViewer } from './CampPhotosViewer'
import { pharmaCampsService } from '@/features/camps/camps.service'

vi.mock('@/features/camps/camps.service', () => ({
  pharmaCampsService: { getCampFiles: vi.fn() },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderViewer(campId = 'camp-1') {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <CampPhotosViewer campId={campId} />
    </QueryClientProvider>,
  )
}

type Relation = 'setup' | 'check-in-selfie' | 'closure'

function mockFilesByRelation(byRelation: Partial<Record<Relation, { id: string; url: string }[]>>) {
  vi.mocked(pharmaCampsService.getCampFiles).mockImplementation(async ({ relation }) => {
    const items = byRelation[relation as Relation] ?? []
    return { success: true, message: '', data: { items, count: items.length } }
  })
}

describe('CampPhotosViewer — read-only (MR portal)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows "No photos uploaded yet" when every relation is empty', async () => {
    mockFilesByRelation({})
    renderViewer()

    expect(await screen.findByText(/no photos uploaded yet/i)).toBeInTheDocument()
  })

  it('renders only the relations that actually have photos, labelled by relation', async () => {
    mockFilesByRelation({
      setup: [{ id: 'f1', url: 'https://s3.example.com/f1.jpg' }],
      closure: [{ id: 'f2', url: 'https://s3.example.com/f2.jpg' }],
    })
    renderViewer()

    expect(await screen.findByText('Setup')).toBeInTheDocument()
    expect(screen.getByText('Closure')).toBeInTheDocument()
    expect(screen.queryByText('Check-in selfie')).not.toBeInTheDocument()
  })

  it('never renders an upload/capture control — this view has no write path', async () => {
    mockFilesByRelation({ setup: [{ id: 'f1', url: 'https://s3.example.com/f1.jpg' }] })
    renderViewer()

    await screen.findByText('Setup')
    expect(screen.queryByRole('button', { name: /capture|add photo|upload/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove|discard|delete/i })).not.toBeInTheDocument()
  })

  it('clicking a thumbnail opens it large in a modal', async () => {
    mockFilesByRelation({ setup: [{ id: 'f1', url: 'https://s3.example.com/f1.jpg' }] })
    const user = userEvent.setup()
    renderViewer()

    const thumb = await screen.findByRole('img', { name: /setup photo/i })

    await user.click(thumb.closest('button')!)

    const enlarged = await screen.findAllByRole('img')
    expect(enlarged.some((img) => img.className.includes('object-contain'))).toBe(true)
  })

  it('shows an inline error with retry for a relation whose fetch failed, without hiding the others', async () => {
    vi.mocked(pharmaCampsService.getCampFiles).mockImplementation(async ({ relation }) => {
      if (relation === 'setup') throw new Error('network error')
      return { success: true, message: '', data: { items: [{ id: 'f2', url: 'https://s3.example.com/f2.jpg' }], count: 1 } }
    })
    renderViewer()

    expect(await screen.findByText(/couldn't load setup photos/i)).toBeInTheDocument()
    expect(screen.getByText('Closure')).toBeInTheDocument()
  })
})
