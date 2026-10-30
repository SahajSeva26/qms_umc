// Shared, generic file-attachment service — talks to the backend's /files
// module (metadata + lifecycle only; the actual bytes go straight to S3 via
// file.upload.ts's uploadFileToS3, never through this axios instance).
import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  BulkActivateFilesPayload,
  ChangeFileStatusPayload,
  CreateFilePayload,
  FileEntity,
  SearchFileQuery,
  UpdateFilePayload,
} from '@/types/file.types'

const createFiles = async (payload: CreateFilePayload) => {
  const res = await api.post<ApiResponse<FileEntity[]>>('/files', payload)
  return res.data
}

const linkFileToEntity = async (id: string, payload: UpdateFilePayload) => {
  const res = await api.put<ApiResponse<FileEntity>>(`/files/${id}`, payload)
  return res.data
}

const changeFileStatus = async (id: string, payload: ChangeFileStatusPayload) => {
  const res = await api.patch<ApiResponse<FileEntity>>(`/files/${id}/status`, payload)
  return res.data
}

const bulkActivateFiles = async (payload: BulkActivateFilesPayload) => {
  const res = await api.post<ApiResponse<FileEntity[]>>('/files/activate', payload)
  return res.data
}

const getFile = async (id: string) => {
  const res = await api.get<ApiResponse<FileEntity>>(`/files/${id}`)
  return res.data
}

const searchFiles = async (query: SearchFileQuery) => {
  const res = await api.get<PaginatedResponse<FileEntity>>('/files', { params: query })
  return res.data
}

export const fileService = {
  createFiles,
  linkFileToEntity,
  changeFileStatus,
  bulkActivateFiles,
  getFile,
  searchFiles,
}
