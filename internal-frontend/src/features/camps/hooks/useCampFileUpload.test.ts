import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCampFileUpload } from './useCampFileUpload'
import { campsRealService } from '@/features/camps/campsReal.service'
import { uploadFileToS3 } from '@/lib/file/file.upload'

vi.mock('@/features/camps/campsReal.service', () => ({
  campsRealService: { createCampFiles: vi.fn(), activateCampFiles: vi.fn() },
}))
vi.mock('@/lib/file/file.upload', () => ({ uploadFileToS3: vi.fn() }))

function pickedFile(name = 'photo.jpg') {
  return new File(['x'], name, { type: 'image/jpeg' })
}

function soleTile(tiles: Record<string, unknown>) {
  const entries = Object.entries(tiles)
  expect(entries).toHaveLength(1)
  return entries[0]
}

describe('useCampFileUpload — create -> S3 PUT -> activate', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('walks a successful upload through creating -> uploading -> activating, then drops the tile and fires onSuccess', async () => {
    vi.mocked(campsRealService.createCampFiles).mockResolvedValue({
      success: true, message: '', data: [{ id: 'file-1', uploadUrl: 'https://s3/upload-url' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValue(undefined)
    vi.mocked(campsRealService.activateCampFiles).mockResolvedValue({ success: true, message: '', data: [] } as never)
    const onSuccess = vi.fn()

    const { result } = renderHook(() => useCampFileUpload('camp-1', 'setup', { onSuccess }))

    act(() => result.current.uploadFiles([pickedFile()]))

    await waitFor(() => expect(Object.keys(result.current.tiles)).toHaveLength(0))

    expect(campsRealService.createCampFiles).toHaveBeenCalledWith({
      relation: 'setup', entityId: 'camp-1', files: [{ fileName: 'photo.jpg', fileSize: 1, fileType: 'image/jpeg' }],
    })
    expect(uploadFileToS3).toHaveBeenCalledWith('https://s3/upload-url', expect.any(File))
    expect(campsRealService.activateCampFiles).toHaveBeenCalledWith({ entityId: 'camp-1', fileIds: ['file-1'] })
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('assigns a fresh key per pick — selecting the exact same file twice never collides onto one tile', () => {
    vi.mocked(campsRealService.createCampFiles).mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useCampFileUpload('camp-1', 'setup'))

    const file = pickedFile()
    act(() => {
      result.current.uploadFiles([file])
      result.current.uploadFiles([file])
    })

    expect(Object.keys(result.current.tiles)).toHaveLength(2)
  })

  it('lands on create-failed when the create call rejects, and retryTile() re-runs create', async () => {
    vi.mocked(campsRealService.createCampFiles)
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ success: true, message: '', data: [{ id: 'file-1', uploadUrl: 'https://s3/u' }] } as never)
    vi.mocked(uploadFileToS3).mockResolvedValue(undefined)
    vi.mocked(campsRealService.activateCampFiles).mockResolvedValue({ success: true, message: '', data: [] } as never)

    const { result } = renderHook(() => useCampFileUpload('camp-1', 'setup'))
    act(() => result.current.uploadFiles([pickedFile()]))

    await waitFor(() => {
      const [, tile] = soleTile(result.current.tiles)
      expect((tile as { step: string }).step).toBe('create-failed')
    })

    const [key] = soleTile(result.current.tiles)
    await act(async () => { await result.current.retryTile(key) })

    await waitFor(() => expect(Object.keys(result.current.tiles)).toHaveLength(0))
    expect(campsRealService.createCampFiles).toHaveBeenCalledTimes(2)
  })

  it('lands on upload-failed when the S3 PUT rejects, and retryTile() re-PUTs the same draft (no re-create)', async () => {
    vi.mocked(campsRealService.createCampFiles).mockResolvedValue({
      success: true, message: '', data: [{ id: 'file-1', uploadUrl: 'https://s3/u' }],
    } as never)
    vi.mocked(uploadFileToS3).mockRejectedValueOnce(new Error('upload failed')).mockResolvedValueOnce(undefined)
    vi.mocked(campsRealService.activateCampFiles).mockResolvedValue({ success: true, message: '', data: [] } as never)

    const { result } = renderHook(() => useCampFileUpload('camp-1', 'setup'))
    act(() => result.current.uploadFiles([pickedFile()]))

    await waitFor(() => {
      const [, tile] = soleTile(result.current.tiles)
      expect((tile as { step: string }).step).toBe('upload-failed')
    })

    const [key] = soleTile(result.current.tiles)
    await act(async () => { await result.current.retryTile(key) })

    await waitFor(() => expect(Object.keys(result.current.tiles)).toHaveLength(0))
    expect(campsRealService.createCampFiles).toHaveBeenCalledTimes(1)
    expect(uploadFileToS3).toHaveBeenCalledTimes(2)
  })

  it('lands on activate-failed when activation rejects, and retryTile() re-activates without re-uploading', async () => {
    vi.mocked(campsRealService.createCampFiles).mockResolvedValue({
      success: true, message: '', data: [{ id: 'file-1', uploadUrl: 'https://s3/u' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValue(undefined)
    vi.mocked(campsRealService.activateCampFiles)
      .mockRejectedValueOnce(new Error('activate failed'))
      .mockResolvedValueOnce({ success: true, message: '', data: [] } as never)

    const { result } = renderHook(() => useCampFileUpload('camp-1', 'setup'))
    act(() => result.current.uploadFiles([pickedFile()]))

    await waitFor(() => {
      const [, tile] = soleTile(result.current.tiles)
      expect((tile as { step: string }).step).toBe('activate-failed')
    })

    const [key] = soleTile(result.current.tiles)
    await act(async () => { await result.current.retryTile(key) })

    await waitFor(() => expect(Object.keys(result.current.tiles)).toHaveLength(0))
    expect(uploadFileToS3).toHaveBeenCalledTimes(1)
    expect(campsRealService.activateCampFiles).toHaveBeenCalledTimes(2)
  })

  it('keeps the tile (as refreshing) after activation succeeds but before onSuccess resolves — never opens a gap where the cap looks free', async () => {
    vi.mocked(campsRealService.createCampFiles).mockResolvedValue({
      success: true, message: '', data: [{ id: 'file-1', uploadUrl: 'https://s3/u' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValue(undefined)
    vi.mocked(campsRealService.activateCampFiles).mockResolvedValue({ success: true, message: '', data: [] } as never)
    let resolveOnSuccess!: () => void
    const onSuccess = vi.fn(() => new Promise<void>((resolve) => { resolveOnSuccess = resolve }))

    const { result } = renderHook(() => useCampFileUpload('camp-1', 'setup', { onSuccess }))
    act(() => result.current.uploadFiles([pickedFile()]))

    await waitFor(() => {
      const [, tile] = soleTile(result.current.tiles)
      expect((tile as { step: string }).step).toBe('refreshing')
    })
    // Activation is already confirmed, but the tile — and therefore the cap accounting that
    // counts it — is still present until the refresh itself resolves.
    expect(Object.keys(result.current.tiles)).toHaveLength(1)

    await act(async () => { resolveOnSuccess() })
    await waitFor(() => expect(Object.keys(result.current.tiles)).toHaveLength(0))
  })

  it('lands on refresh-failed (not a silent drop) when onSuccess rejects after a successful activation, and retryTile() re-runs only the refresh', async () => {
    vi.mocked(campsRealService.createCampFiles).mockResolvedValue({
      success: true, message: '', data: [{ id: 'file-1', uploadUrl: 'https://s3/u' }],
    } as never)
    vi.mocked(uploadFileToS3).mockResolvedValue(undefined)
    vi.mocked(campsRealService.activateCampFiles).mockResolvedValue({ success: true, message: '', data: [] } as never)
    const onSuccess = vi.fn()
      .mockRejectedValueOnce(new Error('refetch failed'))
      .mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useCampFileUpload('camp-1', 'setup', { onSuccess }))
    act(() => result.current.uploadFiles([pickedFile()]))

    await waitFor(() => {
      const [, tile] = soleTile(result.current.tiles)
      expect((tile as { step: string }).step).toBe('refresh-failed')
    })

    const [key] = soleTile(result.current.tiles)
    await act(async () => { await result.current.retryTile(key) })

    await waitFor(() => expect(Object.keys(result.current.tiles)).toHaveLength(0))
    // Only the refresh was retried — no re-upload, no re-activation of an already-active file.
    expect(campsRealService.activateCampFiles).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledTimes(2)
  })

  it('dismissTile() removes a failed tile without retrying', async () => {
    vi.mocked(campsRealService.createCampFiles).mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useCampFileUpload('camp-1', 'setup'))
    act(() => result.current.uploadFiles([pickedFile()]))

    await waitFor(() => expect(Object.keys(result.current.tiles)).toHaveLength(1))
    const [key] = soleTile(result.current.tiles)

    act(() => result.current.dismissTile(key))
    expect(Object.keys(result.current.tiles)).toHaveLength(0)
  })
})
