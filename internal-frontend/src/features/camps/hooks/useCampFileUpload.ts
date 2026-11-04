import { useEffect, useRef, useState } from 'react'
import { campsRealService } from '@/features/camps/campsReal.service'
import { uploadFileToS3 } from '@/lib/file/file.upload'
import type { CampFileRelation } from '@/types/campReal.types'

// One tile's lifecycle: create -> S3 PUT -> activate -> refresh. The tile is dropped only once the
// real files list has refreshed — never right after activation, which would open a gap.
export type CampFileTileState =
  | { step: 'creating' }
  | { step: 'create-failed'; error: unknown }
  | { step: 'uploading'; fileId: string; uploadUrl: string }
  | { step: 'upload-failed'; fileId: string; uploadUrl: string; error: unknown }
  | { step: 'activating'; fileId: string }
  | { step: 'activate-failed'; fileId: string; error: unknown }
  | { step: 'refreshing'; fileId: string }
  // The upload is confirmed saved server-side — only the local list refresh failed. Retrying
  // re-runs the refresh only, never re-activates an already-active file.
  | { step: 'refresh-failed'; fileId: string; error: unknown }

export interface UseCampFileUploadOptions {
  // Must return the refetch's own promise/result so activation can await it and react to failure.
  onSuccess?: () => Promise<unknown>
}

// Keyed by a fresh id per pick (not file id) — the real id doesn't exist until create() returns.
export function useCampFileUpload(campId: string, relation: CampFileRelation, options?: UseCampFileUploadOptions) {
  const [tiles, setTiles] = useState<Record<string, CampFileTileState>>({})
  const filesRef = useRef<Record<string, File>>({})
  const onSuccessRef = useRef(options?.onSuccess)
  useEffect(() => {
    onSuccessRef.current = options?.onSuccess
  })

  const setTile = (key: string, state: CampFileTileState) => {
    setTiles((prev) => ({ ...prev, [key]: state }))
  }

  const removeTile = (key: string) => {
    setTiles((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    delete filesRef.current[key]
  }

  const doCreate = async (key: string, file: File) => {
    setTile(key, { step: 'creating' })
    let created: { id: string; uploadUrl?: string }
    try {
      const res = await campsRealService.createCampFiles({
        relation,
        entityId: campId,
        files: [{ fileName: file.name, fileSize: file.size, fileType: file.type }],
      })
      const first = res.data?.[0]
      if (!first || !first.uploadUrl) throw new Error('File created but no uploadUrl was returned')
      created = first
    } catch (err) {
      setTile(key, { step: 'create-failed', error: err })
      return
    }
    await doUpload(key, created.id, created.uploadUrl as string, file)
  }

  const doUpload = async (key: string, fileId: string, uploadUrl: string, file: File) => {
    setTile(key, { step: 'uploading', fileId, uploadUrl })
    try {
      await uploadFileToS3(uploadUrl, file)
    } catch (err) {
      setTile(key, { step: 'upload-failed', fileId, uploadUrl, error: err })
      return
    }
    await doActivate(key, fileId)
  }

  const doActivate = async (key: string, fileId: string) => {
    setTile(key, { step: 'activating', fileId })
    try {
      await campsRealService.activateCampFiles({ entityId: campId, fileIds: [fileId] })
    } catch (err) {
      setTile(key, { step: 'activate-failed', fileId, error: err })
      return
    }
    await doRefresh(key, fileId)
  }

  // Activation is already confirmed saved — a refresh failure keeps the tile (as refresh-failed)
  // rather than silently dropping it and leaving the save invisible to the user.
  const doRefresh = async (key: string, fileId: string) => {
    setTile(key, { step: 'refreshing', fileId })
    try {
      await onSuccessRef.current?.()
      removeTile(key)
    } catch (err) {
      setTile(key, { step: 'refresh-failed', fileId, error: err })
    }
  }

  // A fresh id per pick, not derived from file name/size/lastModified — picking the exact same
  // file twice while the first is still in flight must never collide onto one tile.
  const uploadFiles = (files: File[]): void => {
    for (const file of files) {
      const key = crypto.randomUUID()
      filesRef.current[key] = file
      void doCreate(key, file)
    }
  }

  const retryTile = async (key: string) => {
    const state = tiles[key]
    if (!state) return
    // refresh-failed needs no File — the upload is already saved server-side, only the local
    // list refresh is retried. Every other step still needs the original picked File.
    if (state.step === 'refresh-failed') {
      await doRefresh(key, state.fileId)
      return
    }
    const file = filesRef.current[key]
    if (!file) return
    switch (state.step) {
      case 'create-failed':
        await doCreate(key, file)
        return
      case 'upload-failed':
        await doUpload(key, state.fileId, state.uploadUrl, file)
        return
      case 'activate-failed':
        await doActivate(key, state.fileId)
        return
      default:
        return
    }
  }

  return { tiles, uploadFiles, retryTile, dismissTile: removeTile }
}
