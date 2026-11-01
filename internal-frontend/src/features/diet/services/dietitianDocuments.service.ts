// Document persistence for the Diet feature — today the cancelled-cheque /
// bank-details image attached to a dietitian bank account.
//
// WHY THIS EXISTS
// Three components each built their own `FileReader.readAsDataURL` helper and
// put the resulting base64 straight onto the bank account, which is then
// persisted whole into localStorage. That leaked the storage mechanism into
// the UI layer and, more importantly, was not survivable: an ordinary phone
// photo is 2-4 MB, base64 inflates it by ~33%, and the entire localStorage
// origin quota is ~5 MB. One cheque upload could exhaust it — and because
// dietStorage.persist() used to swallow the QuotaExceededError, the user saw a
// "Bank details saved" toast while the write silently did nothing, taking
// every OTHER dietitian's details in the same key down with it.
//
// WHAT CHANGED (deliberately NOT "delete base64")
//   1. Persistence lives behind this module. Components hand over a File and
//      receive an opaque reference string; they never see FileReader, base64
//      or localStorage.
//   2. Images are re-encoded to a bounded JPEG before storage, so a real cheque
//      photo lands at ~100-250 KB instead of 4 MB. The feature is unchanged —
//      the reference is still renderable in an <img>/<a href> exactly as before.
//   3. Anything that still cannot fit is rejected with a message the user can
//      act on, instead of being silently dropped.
//
// API MIGRATION: no upload endpoint exists yet, and none is invented here.
// When one lands, storeChequeImage() becomes "request a presigned URL → PUT
// the file → return the object URL". The return type is already a URL string,
// every consumer already treats it as opaque, and the bank-completeness rule
// (`!!chequeUrl`) keeps working unchanged.

/** Largest source file accepted at all — beyond this, ask for a smaller scan. */
const MAX_SOURCE_BYTES = 12 * 1024 * 1024

/** Longest edge kept when re-encoding an image. A cheque stays fully legible. */
const MAX_EDGE_PX = 1600

const JPEG_QUALITY = 0.72

/**
 * Ceiling on the stored reference itself. Sized so several dietitians' cheques
 * coexist inside the ~5 MB origin quota. Only reachable by non-image uploads
 * (a PDF cannot be downscaled) or by an image that failed to re-encode.
 */
const MAX_STORED_BYTES = 700 * 1024

export class DocumentTooLargeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DocumentTooLargeError'
  }
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read the selected file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Re-encodes an image to a bounded JPEG. Returns null when the browser cannot
 * decode it (unsupported format, corrupt file) so the caller can fall back to
 * storing the original under the size cap rather than failing outright.
 *
 * The object URL is always revoked — an un-revoked one pins the whole original
 * file in memory for the lifetime of the document.
 */
async function downscaleImage(file: File): Promise<string | null> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => resolve(null)
      el.src = objectUrl
    })
    if (!img || !img.naturalWidth || !img.naturalHeight) return null

    const scale = Math.min(1, MAX_EDGE_PX / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))

    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    // Cheques are photographed on white paper; flatten any alpha to white so a
    // transparent PNG does not become a black rectangle in JPEG.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    return dataUrl.startsWith('data:image/jpeg') ? dataUrl : null
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/**
 * Persists a cancelled-cheque / bank-details document and returns the
 * reference to store on the bank account.
 *
 * @throws {DocumentTooLargeError} when the document cannot be stored at a
 *   size the current (local) backing store can hold. Callers must surface it —
 *   this is the case that used to fail silently.
 */
export async function storeChequeImage(file: File): Promise<string> {
  if (!file.size) throw new DocumentTooLargeError('That file is empty — choose another.')
  if (file.size > MAX_SOURCE_BYTES) {
    throw new DocumentTooLargeError(`That file is ${formatMb(file.size)} — please upload one under ${formatMb(MAX_SOURCE_BYTES)}.`)
  }

  if (file.type.startsWith('image/')) {
    const compressed = await downscaleImage(file)
    if (compressed && compressed.length <= MAX_STORED_BYTES) return compressed
  }

  const raw = await readAsDataUrl(file)
  if (raw.length > MAX_STORED_BYTES) {
    throw new DocumentTooLargeError(
      `That document is too large to attach (${formatMb(raw.length)} after encoding). Please upload an image, or a PDF under ${formatMb(MAX_STORED_BYTES)}.`,
    )
  }
  return raw
}

function formatMb(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}
