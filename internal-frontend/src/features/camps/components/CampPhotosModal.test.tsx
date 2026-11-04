import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useCampFiles } from '@/features/camps/hooks/useCampFiles'
import { useCampFileUpload } from '@/features/camps/hooks/useCampFileUpload'
import { useDiscardCampFile } from '@/features/camps/hooks/useDiscardCampFile'
import CampPhotosModal from './CampPhotosModal'

vi.mock('@/features/camps/hooks/useCampFiles')
vi.mock('@/features/camps/hooks/useCampFileUpload')
vi.mock('@/features/camps/hooks/useDiscardCampFile')

const RELATIONS = [
  { relation: 'setup' as const, label: 'Setup', cap: 5 },
  { relation: 'check-in-selfie' as const, label: 'Check-in selfie', cap: 1 },
  { relation: 'closure' as const, label: 'Closure', cap: 3 },
]

function fileFixture(id: string, url = `https://s3.example.com/${id}.jpg`) {
  return { id, url } as unknown as ReturnType<typeof useCampFiles>['files'][number]
}

function mockFiles(files: ReturnType<typeof fileFixture>[] = [], overrides: Partial<ReturnType<typeof useCampFiles>> = {}) {
  vi.mocked(useCampFiles).mockReturnValue({
    files, isLoading: false, isFetching: false, isError: false, refetch: vi.fn(), ...overrides,
  } as unknown as ReturnType<typeof useCampFiles>)
}

function mockUpload(overrides: Partial<ReturnType<typeof useCampFileUpload>> = {}) {
  vi.mocked(useCampFileUpload).mockReturnValue({
    tiles: {}, uploadFiles: vi.fn(), retryTile: vi.fn(), dismissTile: vi.fn(), ...overrides,
  } as unknown as ReturnType<typeof useCampFileUpload>)
}

function mockDiscard(overrides: Partial<ReturnType<typeof useDiscardCampFile>> = {}) {
  vi.mocked(useDiscardCampFile).mockReturnValue({
    mutate: vi.fn(), isPending: false, variables: undefined, ...overrides,
  } as unknown as ReturnType<typeof useDiscardCampFile>)
}

describe('CampPhotosModal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockFiles()
    mockUpload()
    mockDiscard()
  })

  function largePreviewImg() {
    return screen.getByRole('img', { name: /setup photo/i })
  }

  it('renders the first file large by default and lists its thumbnails', () => {
    mockFiles([fileFixture('f1'), fileFixture('f2'), fileFixture('f3')])
    render(<CampPhotosModal open campId="camp-1" relations={RELATIONS} canUploadFor={() => true} onClose={vi.fn()} />)

    expect(largePreviewImg()).toHaveAttribute('src', 'https://s3.example.com/f1.jpg')
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1)
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(2)
  })

  it('caps the thumbnail strip at 5 even when more files exist', () => {
    mockFiles([
      fileFixture('f1'), fileFixture('f2'), fileFixture('f3'),
      fileFixture('f4'), fileFixture('f5'), fileFixture('f6'),
    ])
    render(
      <CampPhotosModal
        open
        campId="camp-1"
        relations={[{ relation: 'setup', label: 'Setup', cap: 6 }]}
        canUploadFor={() => true}
        onClose={vi.fn()}
      />,
    )

    const thumbs = [...screen.getAllByRole('button', { pressed: true }), ...screen.getAllByRole('button', { pressed: false })]
    expect(thumbs).toHaveLength(5)
  })

  it('clicking a thumbnail swaps the large preview to that file', async () => {
    mockFiles([fileFixture('f1'), fileFixture('f2')])
    const user = userEvent.setup()
    render(<CampPhotosModal open campId="camp-1" relations={RELATIONS} canUploadFor={() => true} onClose={vi.fn()} />)

    const thumbs = screen.getAllByRole('button', { pressed: false })
    await user.click(thumbs[0])

    expect(largePreviewImg()).toHaveAttribute('src', 'https://s3.example.com/f2.jpg')
  })

  it('shows a "Capture photo" empty state with no photos, not a tiny black tile', () => {
    mockFiles([])
    render(<CampPhotosModal open campId="camp-1" relations={RELATIONS} canUploadFor={() => true} onClose={vi.fn()} />)

    expect(screen.getByText(/capture photo/i)).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('hides the capture affordance once the relation cap is reached', () => {
    mockFiles([fileFixture('f1')])
    render(
      <CampPhotosModal
        open
        campId="camp-1"
        relations={[{ relation: 'check-in-selfie', label: 'Check-in selfie', cap: 1 }]}
        canUploadFor={() => true}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByText(/add another/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /capture photo/i })).not.toBeInTheDocument()
  })

  it('counts in-flight uploads toward the cap, blocking further capture before activation', () => {
    mockFiles([fileFixture('f1'), fileFixture('f2'), fileFixture('f3'), fileFixture('f4')])
    mockUpload({ tiles: { pending1: { step: 'uploading', fileId: 'draft-1', uploadUrl: 'u' } } })
    render(
      <CampPhotosModal
        open
        campId="camp-1"
        relations={[{ relation: 'setup', label: 'Setup', cap: 5 }]}
        canUploadFor={() => true}
        onClose={vi.fn()}
      />,
    )

    // 4 real + 1 pending = 5 = cap — no capture control should remain.
    expect(screen.queryByText(/add another/i)).not.toBeInTheDocument()
  })

  it('removing a photo asks for confirmation and calls discard only when confirmed', async () => {
    const discardMutate = vi.fn()
    mockFiles([fileFixture('f1')])
    mockDiscard({ mutate: discardMutate })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<CampPhotosModal open campId="camp-1" relations={RELATIONS} canUploadFor={() => true} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /remove photo/i }))
    expect(confirmSpy).toHaveBeenCalled()
    expect(discardMutate).not.toHaveBeenCalled()

    confirmSpy.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: /remove photo/i }))
    expect(discardMutate).toHaveBeenCalledWith('f1', expect.anything())

    confirmSpy.mockRestore()
  })

  it('shows an inline error with retry when a delete fails, not a silent revert', async () => {
    const discardMutate = vi.fn()
    mockFiles([fileFixture('f1')])
    mockDiscard({ mutate: discardMutate, isError: true, variables: 'f1' })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<CampPhotosModal open campId="camp-1" relations={RELATIONS} canUploadFor={() => true} onClose={vi.fn()} />)

    expect(screen.getByText(/couldn't remove this photo/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(discardMutate).toHaveBeenCalledWith('f1')

    vi.restoreAllMocks()
  })

  it('exposes the capture action again once the only photo is removed', () => {
    mockFiles([])
    render(<CampPhotosModal open campId="camp-1" relations={RELATIONS} canUploadFor={() => true} onClose={vi.fn()} />)

    expect(screen.getByText(/capture photo/i)).toBeInTheDocument()
  })

  it('hides the remove/upload affordances entirely when the caller cannot upload', () => {
    mockFiles([fileFixture('f1')])
    render(<CampPhotosModal open campId="camp-1" relations={RELATIONS} canUploadFor={() => 'Not allowed'} onClose={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /remove photo/i })).not.toBeInTheDocument()
  })

  it('shows the human-readable reason in the empty state when upload is unavailable, not a generic message', () => {
    mockFiles([])
    render(<CampPhotosModal open campId="camp-1" relations={RELATIONS} canUploadFor={() => 'Setup photos can only be added while this camp is live.'} onClose={vi.fn()} />)

    expect(screen.getByText('Setup photos can only be added while this camp is live.')).toBeInTheDocument()
    expect(screen.queryByText(/no photo captured yet/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /capture photo/i })).not.toBeInTheDocument()
  })

  it('shows a failed in-flight tile with retry/dismiss controls', async () => {
    const retryTile = vi.fn()
    const dismissTile = vi.fn()
    mockFiles([])
    mockUpload({
      tiles: { k1: { step: 'upload-failed', fileId: 'draft-1', uploadUrl: 'u', error: new Error('boom') } },
      retryTile,
      dismissTile,
    })
    const user = userEvent.setup()
    render(<CampPhotosModal open campId="camp-1" relations={RELATIONS} canUploadFor={() => true} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(retryTile).toHaveBeenCalledWith('k1')

    await user.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(dismissTile).toHaveBeenCalledWith('k1')
  })


  it('switching relation tabs loads that relation\'s files independently', async () => {
    mockFiles([fileFixture('setup-1')])
    const user = userEvent.setup()
    render(<CampPhotosModal open campId="camp-1" relations={RELATIONS} canUploadFor={() => true} onClose={vi.fn()} />)

    expect(vi.mocked(useCampFiles)).toHaveBeenCalledWith('camp-1', 'setup')

    await user.click(screen.getByRole('button', { name: /^closure$/i }))
    expect(vi.mocked(useCampFiles)).toHaveBeenCalledWith('camp-1', 'closure')
  })
})
