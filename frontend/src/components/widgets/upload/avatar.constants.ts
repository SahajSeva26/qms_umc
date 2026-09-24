// Mirrors tenant.constants.ts's logo validation (same PNG/JPEG/WEBP, 5MB limits) for a profile
// picture. No features/me/ folder exists yet, so this lives alongside the shared upload widget.
export const ACCEPTED_AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const MAX_AVATAR_FILE_SIZE_BYTES = 5 * 1024 * 1024

export function validateAvatarFile(file: File): string | null {
  if (!ACCEPTED_AVATAR_MIME_TYPES.includes(file.type)) {
    return 'Please choose a PNG, JPEG, or WEBP image.'
  }
  if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
    return 'Image must be 5MB or smaller.'
  }
  return null
}
