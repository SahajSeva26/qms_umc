export const ACCEPTED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const MAX_LOGO_FILE_SIZE_BYTES = 5 * 1024 * 1024

export function validateLogoFile(file: File): string | null {
  if (!ACCEPTED_LOGO_MIME_TYPES.includes(file.type)) {
    return 'Please choose a PNG, JPEG, or WEBP image.'
  }
  if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
    return 'Image must be 5MB or smaller.'
  }
  return null
}
