// Matches backend/src/modules/file exactly — the shared, generic file-attachment contract that
// feature code (e.g. tenant logo upload) composes on top of, never forks its own copy of.

export type FileStatus = 'draft' | 'active' | 'inactive' | 'discarded'

// Typed to the full backend ENTITY_TYPE enum for forward-compat, but only 'user'/'tenant' have a
// real ENTITY_RELATION group today — every other value is zod-valid but rejected downstream.
export type FileEntityType = 'user' | 'tenant' | 'lead' | 'project' | 'camp' | 'invoice' | 'screening' | 'test'

// Only 'profile_picture' (user) and 'logo' (tenant) exist today, both cap 1.
export type FileEntityRelation = 'profile_picture' | 'logo'

export interface FileEntityRef {
  id?: string
  type: FileEntityType
  relation: FileEntityRelation
}

// provider/path/identifier are raw storage coordinates, only included for a file:manage actor.
export interface FileContent {
  originalName: string
  displayName: string
  mimeType: string
  extension: string
  size: number
  provider?: string
  path?: string
  identifier?: string
}

export interface FileEntity {
  id: string
  // populated { name, code } when the backend hydrates it, else the raw id string
  tenant: string
  entity: FileEntityRef
  type: 'document' | 'image'
  status: FileStatus
  // populated { name, code } when hydrated, else the raw id string
  owner: string
  content: FileContent | null
  // short-lived presigned GET url — only reliably present from GET /files/:id
  url?: string | null
  // short-lived presigned PUT url — present on create only
  uploadUrl?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateFilePayload {
  tenant: string
  entityType: FileEntityType
  entityRelation: FileEntityRelation
  entityId?: string
  tags?: string[]
  files: { fileName: string; fileSize: number; fileType: string }[]
}

export interface UpdateFilePayload {
  displayName?: string
  tags?: string[]
  entityId?: string
}

export interface ChangeFileStatusPayload {
  status: FileStatus
}

export interface BulkActivateFilesPayload {
  fileIds: string[]
}

export interface SearchFileQuery {
  tenant?: string
  entityId?: string
  entityType?: FileEntityType
  relation?: FileEntityRelation
  type?: string
  status?: FileStatus
  owner?: string
  tag?: string
  page?: string
  limit?: string
}
